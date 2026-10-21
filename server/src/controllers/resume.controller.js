import fs from 'fs';
import pdfParse from 'pdf-parse';
import { Resume } from '../models/Resume.js';
import { Activity } from '../models/Activity.js';
import { Profile } from '../models/Profile.js';
import { generateAIResponse, fallbackResumeAnalysis } from '../services/ai/ai.service.js';
import { getResumeAnalysisPrompt } from '../services/ai/prompt.service.js';

export const uploadAndAnalyzeResume = async (req, res, next) => {
  const tempFilePath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF or text resume file' });
    }

    let extractedText = '';

    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(tempFilePath);
      const parsed = await pdfParse(dataBuffer);
      extractedText = parsed.text || '';
    } else {
      extractedText = fs.readFileSync(tempFilePath, 'utf8') || '';
    }

    if (!extractedText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from document. Please ensure your PDF has selectable text and is not an image-only scan.',
      });
    }

    const profile = await Profile.findOne({ user: req.user._id });
    const targetRole = (profile && profile.targetRoles && profile.targetRoles[0]) || 'Software Engineer';

    const prompt = getResumeAnalysisPrompt(extractedText, targetRole);

    const aiAnalysis = await generateAIResponse(
      prompt,
      () => fallbackResumeAnalysis(extractedText, targetRole)
    );

    const resumeDoc = await Resume.create({
      user: req.user._id,
      originalFilename: req.file.originalname,
      extractedText: extractedText.substring(0, 5000),
      score: aiAnalysis.score || 76,
      atsCompatibility: aiAnalysis.atsCompatibility || 'Moderate',
      detectedSkills: aiAnalysis.detectedSkills || [],
      missingKeywords: aiAnalysis.missingKeywords || [],
      strengths: aiAnalysis.strengths || [],
      weaknesses: aiAnalysis.weaknesses || [],
      recommendations: aiAnalysis.recommendations || [],
      roleCompatibility: {
        role: targetRole,
        matchPercentage: aiAnalysis.roleMatchPercentage || 80,
      },
    });

    await Activity.create({
      user: req.user._id,
      activityType: 'RESUME_ANALYZED',
      title: 'Resume Analyzed by Nexus AI',
      description: `Resume score: ${resumeDoc.score}/100 with ${resumeDoc.atsCompatibility} ATS rating.`,
    });

    res.status(201).json({
      success: true,
      data: resumeDoc,
    });
  } catch (error) {
    next(error);
  } finally {
    // Guaranteed local temp file cleanup
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.warn('Could not delete upload temp file:', e.message);
      }
    }
  }
};

export const getLatestResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: resume,
    });
  } catch (error) {
    next(error);
  }
};

export const getResumeHistory = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ user: req.user._id })
      .select('originalFilename score atsCompatibility roleCompatibility createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: resumes,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume analysis not found' });
    }

    res.json({
      success: true,
      message: 'Resume analysis deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

