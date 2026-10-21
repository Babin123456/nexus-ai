import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { updatePassword } from '../controllers/auth.controller.js';
import { User } from '../models/User.js';

describe('Password Update & Complexity Enforcement Tests', () => {
  const createMockRes = () => {
    let statusCode = 200;
    let jsonResult = null;
    return {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      },
      getStatus: () => statusCode,
      getJson: () => jsonResult,
    };
  };

  test('rejects request when currentPassword or newPassword is missing with 400', async () => {
    const res1 = createMockRes();
    await updatePassword({ user: { _id: '1' }, body: { currentPassword: 'Old' } }, res1, () => {});
    assert.equal(res1.getStatus(), 400);
    assert.match(res1.getJson().message, /provide both current and new password/i);

    const res2 = createMockRes();
    await updatePassword({ user: { _id: '1' }, body: { newPassword: 'NewPassword123' } }, res2, () => {});
    assert.equal(res2.getStatus(), 400);
    assert.match(res2.getJson().message, /provide both current and new password/i);
  });

  test('enforces minimum length of 8 characters with 400', async () => {
    const res = createMockRes();
    const req = {
      user: { _id: '1' },
      body: { currentPassword: 'OldPassword123!', newPassword: 'Short1!' },
    };

    await updatePassword(req, res, () => {});
    assert.equal(res.getStatus(), 400);
    assert.match(res.getJson().message, /at least 8 characters long/i);
  });

  test('enforces letter and number complexity requirements with 400', async () => {
    const res = createMockRes();
    const req = {
      user: { _id: '1' },
      body: { currentPassword: 'OldPassword123!', newPassword: 'allletterspassword' },
    };

    await updatePassword(req, res, () => {});
    assert.equal(res.getStatus(), 400);
    assert.match(res.getJson().message, /at least one letter and one number/i);
  });

  test('rejects if new password is identical to current password with 400', async () => {
    const origFindById = User.findById;
    User.findById = () => ({
      select: async () => ({
        _id: '1',
        password: '$2a$10$hashed',
        matchPassword: async (pwd) => pwd === 'SamePassword123!',
      }),
    });

    const res = createMockRes();
    const req = {
      user: { _id: '1' },
      body: { currentPassword: 'SamePassword123!', newPassword: 'SamePassword123!' },
    };

    try {
      await updatePassword(req, res, () => {});
      assert.equal(res.getStatus(), 400);
      assert.match(res.getJson().message, /cannot be the same/i);
    } finally {
      User.findById = origFindById;
    }
  });

  test('rejects incorrect current password with 401', async () => {
    const origFindById = User.findById;
    User.findById = () => ({
      select: async () => ({
        _id: '1',
        password: '$2a$10$hashed',
        matchPassword: async () => false,
      }),
    });

    const res = createMockRes();
    const req = {
      user: { _id: '1' },
      body: { currentPassword: 'WrongPassword123!', newPassword: 'ValidNewPassword123!' },
    };

    try {
      await updatePassword(req, res, () => {});
      assert.equal(res.getStatus(), 401);
      assert.match(res.getJson().message, /Current password is incorrect/i);
    } finally {
      User.findById = origFindById;
    }
  });

  test('successfully updates password and invokes save when inputs are valid', async () => {
    let saved = false;
    let updatedPasswordValue = null;

    const mockUser = {
      _id: '1',
      password: '$2a$10$oldhashed',
      matchPassword: async (pwd) => pwd === 'CorrectCurrent123!',
      save: async function () {
        saved = true;
        updatedPasswordValue = this.password;
      },
    };

    const origFindById = User.findById;
    User.findById = () => ({
      select: async () => mockUser,
    });

    const res = createMockRes();
    const req = {
      user: { _id: '1' },
      body: { currentPassword: 'CorrectCurrent123!', newPassword: 'BrandNewSecure123!' },
    };

    try {
      await updatePassword(req, res, () => {});
      assert.equal(saved, true);
      assert.equal(updatedPasswordValue, 'BrandNewSecure123!');
      assert.equal(res.getJson().success, true);
      assert.match(res.getJson().message, /successfully updated/i);
    } finally {
      User.findById = origFindById;
    }
  });
});
