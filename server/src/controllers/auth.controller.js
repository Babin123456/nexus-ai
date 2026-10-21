import jwt from 'jsonwebtoken';
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

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'nexus_ai_super_secret_jwt_key_2026', {
    expiresIn: '30d',
  });
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email address' });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    // Automatically initialize user profile
    await Profile.create({
      user: user._id,
      headline: 'Tech Professional',
      profileCompleteness: 25,
      readinessScore: 60,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const profile = await Profile.findOne({ user: req.user._id });

    res.json({
      success: true,
      data: {
        user,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const { confirmPassword } = req.body;
    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation is required to delete account',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(confirmPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password confirmation. Account deletion aborted.',
      });
    }

    const userId = user._id;

    // Cascading purge of all user entities across MongoDB collections
    await Promise.all([
      Profile.deleteMany({ user: userId }),
      Skill.deleteMany({ user: userId }),
      Project.deleteMany({ user: userId }),
      Resume.deleteMany({ user: userId }),
      CareerGoal.deleteMany({ user: userId }),
      Roadmap.deleteMany({ user: userId }),
      Activity.deleteMany({ user: userId }),
      JobAnalysis.deleteMany({ user: userId }),
      Conversation.deleteMany({ user: userId }),
      User.deleteOne({ _id: userId }),
    ]);

    res.json({
      success: true,
      message: 'User account and all associated profile, project, and intelligence data permanently deleted',
    });
  } catch (error) {
    next(error);
  }
};
