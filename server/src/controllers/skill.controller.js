import { Skill } from '../models/Skill.js';
import { Profile } from '../models/Profile.js';
import { Activity } from '../models/Activity.js';

export const getSkills = async (req, res, next) => {
  try {
    const skills = await Skill.find({ user: req.user._id }).sort({ category: 1, name: 1 });
    res.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    next(error);
  }
};

// Normalization helper for accurate matching
export const normalizeSkillToken = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/\.js\b/g, '')
    .replace(/[\/\-_]/g, ' ')
    .replace(/\s+/g, ' ');
};

// Check if a user's skill matches a target requirement without naive substring collision
export const isSkillMatch = (userSkill, requiredSkill) => {
  const normUser = normalizeSkillToken(userSkill);
  const normReq = normalizeSkillToken(requiredSkill);

  if (!normUser || !normReq) return false;
  if (normUser === normReq) return true;

  // Multi-word permutation match (e.g. "CSS/Tailwind" vs "Tailwind CSS")
  const sortedUser = normUser.split(' ').filter(Boolean).sort().join(' ');
  const sortedReq = normReq.split(' ').filter(Boolean).sort().join(' ');
  if (sortedUser === sortedReq) return true;

  const aliases = {
    'react': ['reactjs', 'react'],
    'node': ['nodejs', 'node', 'express'],
    'js': ['javascript'],
    'javascript': ['js'],
    'ts': ['typescript'],
    'typescript': ['ts'],
    'py': ['python'],
    'python': ['py'],
    'css tailwind': ['tailwind', 'tailwindcss', 'css'],
    'tailwind': ['css tailwind', 'tailwindcss'],
    'rest apis': ['rest api', 'restful api', 'api design'],
    'rest api': ['rest apis', 'restful api', 'api design'],
    'sql': ['postgresql', 'mysql', 'sqlite', 'sql'],
    'postgres': ['postgresql', 'sql'],
    'mongodb': ['mongo', 'nosql'],
    'ai ml': ['machine learning', 'artificial intelligence', 'deep learning'],
    'machine learning': ['ml', 'ai ml'],
    'deep learning': ['dl', 'neural networks'],
    'system design': ['distributed systems', 'system architecture'],
  };

  if (aliases[normReq] && aliases[normReq].includes(normUser)) return true;
  if (aliases[normUser] && aliases[normUser].includes(normReq)) return true;

  return false;
};

export const addSkill = async (req, res, next) => {
  try {
    const { name, category, proficiency } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Skill name is required' });
    }

    const trimmedName = name.trim();

    // Case-insensitive duplicate check for current user
    const existing = await Skill.findOne({
      user: req.user._id,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Skill "${trimmedName}" is already in your skills inventory`,
      });
    }

    const skill = await Skill.create({
      user: req.user._id,
      name: trimmedName,
      category: category || 'Programming',
      proficiency: proficiency || 'Intermediate',
    });

    await Activity.create({
      user: req.user._id,
      activityType: 'SKILL_ADDED',
      title: `Added Skill: ${trimmedName}`,
      description: `Proficiency set to ${proficiency || 'Intermediate'} under ${category || 'Programming'}.`,
    });

    res.status(201).json({
      success: true,
      data: skill,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSkill = async (req, res, next) => {
  try {
    const { name, category, proficiency } = req.body;
    let skill = await Skill.findOne({ _id: req.params.id, user: req.user._id });

    if (!skill) {
      return res.status(404).json({ success: false, message: 'Skill not found' });
    }

    if (name) {
      const trimmedName = name.trim();
      const existing = await Skill.findOne({
        _id: { $ne: req.params.id },
        user: req.user._id,
        name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Another skill with name "${trimmedName}" already exists in your inventory`,
        });
      }
      skill.name = trimmedName;
    }
    if (category) skill.category = category;
    if (proficiency) skill.proficiency = proficiency;

    await skill.save();

    res.json({
      success: true,
      data: skill,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSkill = async (req, res, next) => {
  try {
    const skill = await Skill.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!skill) {
      return res.status(404).json({ success: false, message: 'Skill not found' });
    }
    res.json({
      success: true,
      message: 'Skill removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getSkillGapAnalysis = async (req, res, next) => {
  try {
    const targetRole = req.query.role || 'AI Engineer';
    const userSkills = await Skill.find({ user: req.user._id });

    const roleRequirementMap = {
      'AI Engineer': ['Python', 'PyTorch', 'Machine Learning', 'Deep Learning', 'Docker', 'System Design', 'SQL', 'REST APIs'],
      'ML Engineer': ['Python', 'Scikit-Learn', 'TensorFlow', 'MLOps', 'Feature Engineering', 'Docker', 'SQL'],
      'Full Stack Developer': ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'REST APIs', 'TypeScript', 'Docker', 'CSS/Tailwind'],
      'Data Scientist': ['Python', 'SQL', 'Pandas', 'NumPy', 'Statistics', 'Data Visualization', 'Machine Learning'],
      'Backend Developer': ['Node.js', 'Express', 'SQL', 'MongoDB', 'Redis', 'Docker', 'System Design', 'REST APIs'],
      'Frontend Developer': ['JavaScript', 'React', 'HTML', 'CSS/Tailwind', 'TypeScript', 'State Management', 'Web Performance'],
      'Software Engineer': ['Data Structures', 'Algorithms', 'JavaScript', 'Python', 'SQL', 'System Design', 'Git']
    };

    const required = roleRequirementMap[targetRole] || roleRequirementMap['Software Engineer'];

    const currentMatched = [];
    const missingHighPriority = [];

    required.forEach(reqSkill => {
      const isMatched = userSkills.some(s => isSkillMatch(s.name, reqSkill));
      if (isMatched) {
        currentMatched.push(reqSkill);
      } else {
        missingHighPriority.push(reqSkill);
      }
    });

    const gapPercentage = Math.round((currentMatched.length / required.length) * 100);

    res.json({
      success: true,
      data: {
        targetRole,
        readinessScore: gapPercentage,
        requiredSkills: required,
        currentSkills: currentMatched,
        missingSkills: missingHighPriority,
      },
    });
  } catch (error) {
    next(error);
  }
};
