import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { uploadAndAnalyzeResume, getResumeHistory, deleteResume } from '../controllers/resume.controller.js';
import { Resume } from '../models/Resume.js';

describe('Resume Lifecycle & Resource Cleanup Tests', () => {
  test('guarantees temporary file deletion on disk even if processing throws error', async () => {
    const dummyUploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dummyUploadDir)) fs.mkdirSync(dummyUploadDir, { recursive: true });

    const dummyFilePath = path.join(dummyUploadDir, `test-temp-${Date.now()}.txt`);
    fs.writeFileSync(dummyFilePath, 'Some sample resume text');
    assert.equal(fs.existsSync(dummyFilePath), true);

    const req = {
      file: {
        path: dummyFilePath,
        mimetype: 'text/plain',
        originalname: 'test_resume.txt',
      },
      user: { _id: '507f1f77bcf86cd799439011' },
    };

    let nextCalled = false;
    const res = {
      status(code) { return this; },
      json(data) { return this; },
    };

    // Force error during processing to test finally block cleanup
    const origCreate = Resume.create;
    Resume.create = async () => { throw new Error('Database connection simulation error'); };

    try {
      await uploadAndAnalyzeResume(req, res, (err) => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true);
      // Verify temp file was unlinked in finally block despite error
      assert.equal(fs.existsSync(dummyFilePath), false);
    } finally {
      Resume.create = origCreate;
      if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
    }
  });

  test('rejects document with empty text content with 400 Bad Request', async () => {
    const dummyUploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dummyUploadDir)) fs.mkdirSync(dummyUploadDir, { recursive: true });

    const dummyFilePath = path.join(dummyUploadDir, `test-empty-${Date.now()}.txt`);
    fs.writeFileSync(dummyFilePath, '   \n\t  '); // empty whitespace

    const req = {
      file: {
        path: dummyFilePath,
        mimetype: 'text/plain',
        originalname: 'empty_scan.txt',
      },
      user: { _id: '507f1f77bcf86cd799439011' },
    };

    let statusCode = null;
    let responseData = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    try {
      await uploadAndAnalyzeResume(req, res, () => {});
      assert.equal(statusCode, 400);
      assert.equal(responseData.success, false);
      assert.match(responseData.message, /Could not extract text from document/i);
      // Temp file cleaned up
      assert.equal(fs.existsSync(dummyFilePath), false);
    } finally {
      if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
    }
  });

  test('getResumeHistory queries and returns resumes for authenticated user', async () => {
    const origFind = Resume.find;
    const mockResumes = [
      { _id: '1', originalFilename: 'resume1.pdf', score: 85 },
      { _id: '2', originalFilename: 'resume2.pdf', score: 90 },
    ];

    Resume.find = (query) => ({
      select: () => ({
        sort: async () => mockResumes,
      }),
    });

    let jsonResult = null;
    const req = { user: { _id: '507f1f77bcf86cd799439011' } };
    const res = {
      json(data) {
        jsonResult = data;
        return this;
      },
    };

    try {
      await getResumeHistory(req, res, () => {});
      assert.equal(jsonResult.success, true);
      assert.equal(jsonResult.data.length, 2);
    } finally {
      Resume.find = origFind;
    }
  });

  test('deleteResume removes resume or returns 404 when not found', async () => {
    const origDelete = Resume.findOneAndDelete;
    Resume.findOneAndDelete = async (q) => {
      if (q._id === 'nonexistent') return null;
      return { _id: q._id };
    };

    const reqNotFound = { params: { id: 'nonexistent' }, user: { _id: '507f1f77bcf86cd799439011' } };
    let statusNotFound = null;
    const resNotFound = {
      status(code) { statusNotFound = code; return this; },
      json(data) { return this; },
    };

    try {
      await deleteResume(reqNotFound, resNotFound, () => {});
      assert.equal(statusNotFound, 404);
    } finally {
      Resume.findOneAndDelete = origDelete;
    }
  });
});
