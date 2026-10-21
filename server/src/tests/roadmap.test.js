import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { updateItemStatus } from '../controllers/roadmap.controller.js';
import { Roadmap } from '../models/Roadmap.js';
import { Activity } from '../models/Activity.js';

describe('Roadmap Milestone Status & Validation Tests', () => {
  test('rejects update when status is invalid or omitted with 400', async () => {
    let statusCode = null;
    let jsonResult = null;

    const req = {
      user: { _id: '507f1f77bcf86cd799439011' },
      body: { phaseIndex: 0, itemIndex: 0, status: 'NotValidStatus' },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      },
    };

    await updateItemStatus(req, res, () => {});
    assert.equal(statusCode, 400);
    assert.equal(jsonResult.success, false);
    assert.match(jsonResult.message, /Invalid status/i);
  });

  test('rejects update when phaseIndex or itemIndex is out of range with 400', async () => {
    const origFindOne = Roadmap.findOne;

    Roadmap.findOne = async () => ({
      phases: [
        {
          items: [{ title: 'Item 1', status: 'Not Started' }],
        },
      ],
    });

    let statusCode = null;
    let jsonResult = null;

    const req = {
      user: { _id: '507f1f77bcf86cd799439011' },
      body: { phaseIndex: 5, itemIndex: 0, status: 'In Progress' },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      },
    };

    try {
      await updateItemStatus(req, res, () => {});
      assert.equal(statusCode, 400);
      assert.equal(jsonResult.success, false);
      assert.match(jsonResult.message, /Invalid phaseIndex or itemIndex/i);
    } finally {
      Roadmap.findOne = origFindOne;
    }
  });

  test('updates item status, recalculates phase/roadmap progress, and creates activity on completion', async () => {
    const origFindOne = Roadmap.findOne;
    const origActivityCreate = Activity.create;

    let saved = false;
    let activityCreated = false;

    const mockRoadmap = {
      targetRole: 'AI Engineer',
      phases: [
        {
          phaseNumber: 1,
          status: 'Not Started',
          items: [
            { title: 'Learn PyTorch', status: 'In Progress' },
            { title: 'Learn Transformers', status: 'Completed' },
          ],
        },
      ],
      completedMilestones: 1,
      totalMilestones: 2,
      save: async () => { saved = true; },
    };

    Roadmap.findOne = async () => mockRoadmap;
    Activity.create = async (act) => {
      activityCreated = true;
      assert.equal(act.activityType, 'ROADMAP_UPDATED');
      assert.match(act.title, /Milestone Completed: Learn PyTorch/);
    };

    let jsonResult = null;
    const req = {
      user: { _id: '507f1f77bcf86cd799439011' },
      body: { phaseIndex: 0, itemIndex: 0, status: 'Completed' },
    };
    const res = {
      json(data) {
        jsonResult = data;
        return this;
      },
    };

    try {
      await updateItemStatus(req, res, () => {});

      assert.equal(saved, true);
      assert.equal(activityCreated, true);
      assert.equal(mockRoadmap.completedMilestones, 2);
      assert.equal(mockRoadmap.totalMilestones, 2);
      assert.equal(mockRoadmap.phases[0].status, 'Completed');
      assert.equal(jsonResult.success, true);
    } finally {
      Roadmap.findOne = origFindOne;
      Activity.create = origActivityCreate;
    }
  });
});
