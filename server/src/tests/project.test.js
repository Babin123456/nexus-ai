import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isValidHttpUrl, normalizeTechArray, createProject, updateProject } from '../controllers/project.controller.js';
import { Project } from '../models/Project.js';
import { Activity } from '../models/Activity.js';

describe('Project Validation & Mass Assignment Protection Tests', () => {
  test('isValidHttpUrl validates safe protocols and disallows unsafe schemes', () => {
    assert.equal(isValidHttpUrl('https://github.com/test/repo'), true);
    assert.equal(isValidHttpUrl('http://localhost:3000'), true);
    assert.equal(isValidHttpUrl(''), true); // optional
    assert.equal(isValidHttpUrl('javascript:alert(1)'), false);
    assert.equal(isValidHttpUrl('data:text/html,<script>alert(1)</script>'), false);
    assert.equal(isValidHttpUrl('not a url'), false);
  });

  test('normalizeTechArray converts comma-separated strings or arrays into clean tokens', () => {
    assert.deepEqual(normalizeTechArray('React, Node.js, Express'), ['React', 'Node.js', 'Express']);
    assert.deepEqual(normalizeTechArray([' Python ', 'PyTorch ']), ['Python', 'PyTorch']);
    assert.deepEqual(normalizeTechArray(''), []);
    assert.deepEqual(normalizeTechArray(null), []);
  });

  test('createProject rejects unsafe URLs and invalid status with 400', async () => {
    let statusCode = null;
    let jsonResult = null;

    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonResult = data; return this; },
    };

    // Test unsafe URL rejection
    const reqUnsafeUrl = {
      body: {
        title: 'Project X',
        githubUrl: 'javascript:alert(1)',
      },
      user: { _id: '507f1f77bcf86cd799439011' },
    };

    await createProject(reqUnsafeUrl, res, () => {});
    assert.equal(statusCode, 400);
    assert.match(jsonResult.message, /Invalid GitHub URL format/i);

    // Test invalid status rejection
    const reqInvalidStatus = {
      body: {
        title: 'Project Y',
        status: 'Finished', // invalid enum
      },
      user: { _id: '507f1f77bcf86cd799439011' },
    };

    await createProject(reqInvalidStatus, res, () => {});
    assert.equal(statusCode, 400);
    assert.match(jsonResult.message, /Invalid status/i);
  });

  test('updateProject enforces field whitelisting and blocks mass-assignment of user and aiFeedback', async () => {
    const origFindOneAndUpdate = Project.findOneAndUpdate;

    let capturedUpdateQuery = null;
    Project.findOneAndUpdate = async (filter, update) => {
      capturedUpdateQuery = update;
      return { _id: filter._id, ...update.$set };
    };

    const req = {
      params: { id: '507f1f77bcf86cd799439012' },
      user: { _id: '507f1f77bcf86cd799439011' },
      body: {
        title: 'Updated Title',
        technologies: 'Node.js, Redis, Docker',
        // Attacker attempts mass assignment
        user: '607f1f77bcf86cd799439999',
        aiFeedback: { qualityRating: 100, resumeImpact: 'Hacked' },
        admin: true,
      },
    };

    let jsonResult = null;
    const res = {
      json(data) { jsonResult = data; return this; },
    };

    try {
      await updateProject(req, res, () => {});

      assert.equal(jsonResult.success, true);
      assert.equal(capturedUpdateQuery.$set.title, 'Updated Title');
      assert.deepEqual(capturedUpdateQuery.$set.technologies, ['Node.js', 'Redis', 'Docker']);

      // CRITICAL: user, aiFeedback, and admin must NEVER be in $set
      assert.equal(capturedUpdateQuery.$set.user, undefined);
      assert.equal(capturedUpdateQuery.$set.aiFeedback, undefined);
      assert.equal(capturedUpdateQuery.$set.admin, undefined);
    } finally {
      Project.findOneAndUpdate = origFindOneAndUpdate;
    }
  });
});
