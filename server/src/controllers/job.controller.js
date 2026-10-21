import { JobAnalysis } from '../models/JobAnalysis.js';
import { Activity } from '../models/Activity.js';
import { buildUserAIContext } from '../services/ai/context.service.js';
import { generateAIResponse, fallbackJobMatch } from '../services/ai/ai.service.js';
import { getJobMatchPrompt } from '../services/ai/prompt.service.js';

export const matchJobDescription = async (req, res, next) => {
  try {
    const { jobDescriptionText, jobTitle } = req.body;
    if (!jobDescriptionText) {
      return res.status(400).json({ success: false, message: 'Please paste a valid job description text' });
    }

    const userContext = await buildUserAIContext(req.user._id);
    const prompt = getJobMatchPrompt(userContext, jobDescriptionText);

    const aiResult = await generateAIResponse(
      prompt,
      () => fallbackJobMatch(userContext, jobDescriptionText)
    );

    const jobAnalysis = await JobAnalysis.create({
      user: req.user._id,
      jobTitle: jobTitle || aiResult.jobTitle || 'Target Role Position',
      companyName: aiResult.companyName || 'Target Organization',
      jobDescriptionText: jobDescriptionText.substring(0, 3000),
      matchScore: aiResult.matchScore || 82,
      matchingSkills: aiResult.matchingSkills || [],
      partialMatches: aiResult.partialMatches || [],
      missingSkills: aiResult.missingSkills || [],
      experienceGaps: aiResult.experienceGaps || [],
      recommendations: aiResult.recommendations || [],
    });

    await Activity.create({
      user: req.user._id,
      activityType: 'JOB_MATCHED',
      title: `Job Match Analysis: ${jobAnalysis.jobTitle}`,
      description: `Calculated match score of ${jobAnalysis.matchScore}% against your live Nexus profile.`,
    });

    res.status(201).json({
      success: true,
      data: jobAnalysis,
    });
  } catch (error) {
    next(error);
  }
};

export const getJobMatchHistory = async (req, res, next) => {
  try {
    const history = await JobAnalysis.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJobMatch = async (req, res, next) => {
  try {
    const jobAnalysis = await JobAnalysis.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!jobAnalysis) {
      return res.status(404).json({ success: false, message: 'Job analysis record not found' });
    }
    res.json({
      success: true,
      message: 'Job analysis record removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

