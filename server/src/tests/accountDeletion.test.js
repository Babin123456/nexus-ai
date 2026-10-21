import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { deleteAccount } from '../controllers/auth.controller.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { Skill } from '../models/Skill.js';
import { Project } from '../models/Project.js';
import { Resume } from '../models/Resume.js';
import { CareerGoal } from '../models/CareerGoal.js';
import { Roadmap } from '../models/Roadmap.js';
import { Activity } from '../models/Activity.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import { Conversation } from '../models/Conversation.js';

describe('Account Deletion & Cascading Cleanup Unit Tests', () => {
  test('rejects request if confirmPassword is missing with 400', async () => {
    let responseStatus = null;
    let responseJson = null;

    const req = {
      user: { _id: '507f1f77bcf86cd799439011' },
      body: {},
    };
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    };

    await deleteAccount(req, res, () => {});

    assert.equal(responseStatus, 400);
    assert.equal(responseJson.success, false);
    assert.match(responseJson.message, /Password confirmation is required/i);
  });

  test('rejects request if password confirmation is incorrect with 401', async () => {
    let responseStatus = null;
    let responseJson = null;

    const originalFindById = User.findById;
    User.findById = () => ({
      select: async () => ({
        _id: '507f1f77bcf86cd799439011',
        password: '$2a$10$dummyhashedpassword',
        matchPassword: async () => false,
      }),
    });

    const req = {
      user: { _id: '507f1f77bcf86cd799439011' },
      body: { confirmPassword: 'WrongPassword123' },
    };
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    };

    try {
      await deleteAccount(req, res, () => {});
      assert.equal(responseStatus, 401);
      assert.equal(responseJson.success, false);
      assert.match(responseJson.message, /Invalid password confirmation/i);
    } finally {
      User.findById = originalFindById;
    }
  });

  test('successfully triggers cascading delete on all dependent models when password matches', async () => {
    let responseStatus = null;
    let responseJson = null;

    const deletedCollections = [];

    // Mock models
    const origUserFindById = User.findById;
    const origUserDeleteOne = User.deleteOne;
    const origProfileDelete = Profile.deleteMany;
    const origSkillDelete = Skill.deleteMany;
    const origProjectDelete = Project.deleteMany;
    const origResumeDelete = Resume.deleteMany;
    const origCareerDelete = CareerGoal.deleteMany;
    const origRoadmapDelete = Roadmap.deleteMany;
    const origActivityDelete = Activity.deleteMany;
    const origJobDelete = JobAnalysis.deleteMany;
    const origChatDelete = Conversation.deleteMany;

    User.findById = () => ({
      select: async () => ({
        _id: '507f1f77bcf86cd799439011',
        matchPassword: async (pwd) => pwd === 'CorrectPassword123!',
      }),
    });

    User.deleteOne = async (q) => { deletedCollections.push('User'); return { deletedCount: 1 }; };
    Profile.deleteMany = async (q) => { deletedCollections.push('Profile'); return { deletedCount: 1 }; };
    Skill.deleteMany = async (q) => { deletedCollections.push('Skill'); return { deletedCount: 1 }; };
    Project.deleteMany = async (q) => { deletedCollections.push('Project'); return { deletedCount: 1 }; };
    Resume.deleteMany = async (q) => { deletedCollections.push('Resume'); return { deletedCount: 1 }; };
    CareerGoal.deleteMany = async (q) => { deletedCollections.push('CareerGoal'); return { deletedCount: 1 }; };
    Roadmap.deleteMany = async (q) => { deletedCollections.push('Roadmap'); return { deletedCount: 1 }; };
    Activity.deleteMany = async (q) => { deletedCollections.push('Activity'); return { deletedCount: 1 }; };
    JobAnalysis.deleteMany = async (q) => { deletedCollections.push('JobAnalysis'); return { deletedCount: 1 }; };
    Conversation.deleteMany = async (q) => { deletedCollections.push('Conversation'); return { deletedCount: 1 }; };

    const req = {
      user: { _id: '507f1f77bcf86cd799439011' },
      body: { confirmPassword: 'CorrectPassword123!' },
    };
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    };

    try {
      await deleteAccount(req, res, () => {});

      assert.equal(responseJson.success, true);
      assert.match(responseJson.message, /permanently deleted/i);

      // Verify all 10 collections were purged
      assert.ok(deletedCollections.includes('User'));
      assert.ok(deletedCollections.includes('Profile'));
      assert.ok(deletedCollections.includes('Skill'));
      assert.ok(deletedCollections.includes('Project'));
      assert.ok(deletedCollections.includes('Resume'));
      assert.ok(deletedCollections.includes('CareerGoal'));
      assert.ok(deletedCollections.includes('Roadmap'));
      assert.ok(deletedCollections.includes('Activity'));
      assert.ok(deletedCollections.includes('JobAnalysis'));
      assert.ok(deletedCollections.includes('Conversation'));
    } finally {
      User.findById = origUserFindById;
      User.deleteOne = origUserDeleteOne;
      Profile.deleteMany = origProfileDelete;
      Skill.deleteMany = origSkillDelete;
      Project.deleteMany = origProjectDelete;
      Resume.deleteMany = origResumeDelete;
      CareerGoal.deleteMany = origCareerDelete;
      Roadmap.deleteMany = origRoadmapDelete;
      Activity.deleteMany = origActivityDelete;
      JobAnalysis.deleteMany = origJobDelete;
      Conversation.deleteMany = origChatDelete;
    }
  });
});
