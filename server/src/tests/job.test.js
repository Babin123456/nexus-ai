import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteJobMatch, getJobMatchHistory } from '../controllers/job.controller.js';
import { JobAnalysis } from '../models/JobAnalysis.js';

test('deleteJobMatch returns 404 if record does not belong to user or does not exist', async () => {
  const originalFindOneAndDelete = JobAnalysis.findOneAndDelete;
  JobAnalysis.findOneAndDelete = async () => null;

  try {
    const req = {
      user: { _id: 'user_123' },
      params: { id: 'job_456' }
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      }
    };
    const next = () => {};

    await deleteJobMatch(req, res, next);

    assert.equal(statusCode, 404);
    assert.equal(responseBody.success, false);
    assert.match(responseBody.message, /not found/i);
  } finally {
    JobAnalysis.findOneAndDelete = originalFindOneAndDelete;
  }
});

test('deleteJobMatch deletes analysis when owned by user and returns success message', async () => {
  const originalFindOneAndDelete = JobAnalysis.findOneAndDelete;
  let queryPassed = null;
  JobAnalysis.findOneAndDelete = async (query) => {
    queryPassed = query;
    return { _id: 'job_456', user: 'user_123', jobTitle: 'Fullstack Engineer' };
  };

  try {
    const req = {
      user: { _id: 'user_123' },
      params: { id: 'job_456' }
    };
    let responseBody = null;
    const res = {
      json(body) {
        responseBody = body;
        return this;
      }
    };
    const next = () => {};

    await deleteJobMatch(req, res, next);

    assert.deepEqual(queryPassed, { _id: 'job_456', user: 'user_123' });
    assert.equal(responseBody.success, true);
    assert.match(responseBody.message, /removed successfully/i);
  } finally {
    JobAnalysis.findOneAndDelete = originalFindOneAndDelete;
  }
});

test('getJobMatchHistory returns user history sorted by creation date descending', async () => {
  const originalFind = JobAnalysis.find;
  let findQuery = null;
  let sortQuery = null;
  JobAnalysis.find = (query) => {
    findQuery = query;
    return {
      sort(sortOptions) {
        sortQuery = sortOptions;
        return [{ _id: '1', jobTitle: 'Dev' }];
      }
    };
  };

  try {
    const req = { user: { _id: 'user_123' } };
    let responseBody = null;
    const res = {
      json(body) {
        responseBody = body;
        return this;
      }
    };
    const next = () => {};

    await getJobMatchHistory(req, res, next);

    assert.deepEqual(findQuery, { user: 'user_123' });
    assert.deepEqual(sortQuery, { createdAt: -1 });
    assert.equal(responseBody.success, true);
    assert.equal(responseBody.data.length, 1);
  } finally {
    JobAnalysis.find = originalFind;
  }
});
