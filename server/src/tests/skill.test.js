import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isSkillMatch, normalizeSkillToken } from '../controllers/skill.controller.js';

describe('Skill Gap Analysis & Token Matching Tests', () => {
  test('normalizeSkillToken cleans extensions, symbols, and excess spaces', () => {
    assert.equal(normalizeSkillToken('React.js'), 'react');
    assert.equal(normalizeSkillToken(' Node.js '), 'node');
    assert.equal(normalizeSkillToken('CSS/Tailwind'), 'css tailwind');
    assert.equal(normalizeSkillToken('REST-APIs'), 'rest apis');
  });

  test('isSkillMatch correctly matches exact and case-insensitive skills', () => {
    assert.equal(isSkillMatch('Python', 'Python'), true);
    assert.equal(isSkillMatch('python', 'Python'), true);
    assert.equal(isSkillMatch('Docker', 'docker'), true);
    assert.equal(isSkillMatch('MongoDB', 'mongodb'), true);
  });

  test('isSkillMatch matches recognized tech aliases', () => {
    assert.equal(isSkillMatch('React.js', 'React'), true);
    assert.equal(isSkillMatch('React', 'React.js'), true);
    assert.equal(isSkillMatch('Node.js', 'Node.js'), true);
    assert.equal(isSkillMatch('Tailwind CSS', 'CSS/Tailwind'), true);
    assert.equal(isSkillMatch('REST APIs', 'REST API'), true);
    assert.equal(isSkillMatch('PostgreSQL', 'SQL'), true);
  });

  test('isSkillMatch PREVENTS false-positive substring collisions', () => {
    // Single character or short tokens must NEVER falsely match superset names
    assert.equal(isSkillMatch('C', 'Docker'), false);
    assert.equal(isSkillMatch('c', 'Docker'), false);
    assert.equal(isSkillMatch('R', 'Docker'), false);
    assert.equal(isSkillMatch('Go', 'Algorithms'), false);
    assert.equal(isSkillMatch('Java', 'JavaScript'), false);
    assert.equal(isSkillMatch('Script', 'JavaScript'), false);
    assert.equal(isSkillMatch('Design', 'System Design'), false);
  });
});
