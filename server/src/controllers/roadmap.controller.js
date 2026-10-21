import { Roadmap } from '../models/Roadmap.js';
import { Activity } from '../models/Activity.js';
import { buildUserAIContext } from '../services/ai/context.service.js';
import { generateAIResponse, fallbackRoadmap } from '../services/ai/ai.service.js';
import { getRoadmapGenerationPrompt } from '../services/ai/prompt.service.js';

export const getRoadmap = async (req, res, next) => {
  try {
    let roadmap = await Roadmap.findOne({ user: req.user._id });
    if (!roadmap) {
      // Auto generate default roadmap
      const defaultData = fallbackRoadmap('Full Stack Developer');
      roadmap = await Roadmap.create({
        user: req.user._id,
        targetRole: defaultData.targetRole,
        totalMilestones: defaultData.totalMilestones,
        completedMilestones: 0,
        phases: defaultData.phases,
      });
    }
    res.json({
      success: true,
      data: roadmap,
    });
  } catch (error) {
    next(error);
  }
};

export const generateRoadmap = async (req, res, next) => {
  try {
    const { targetRole, weeklyHours } = req.body;
    const userContext = await buildUserAIContext(req.user._id);

    const selectedRole = targetRole || (userContext.profile.targetRoles && userContext.profile.targetRoles[0]) || 'AI Engineer';
    const prompt = getRoadmapGenerationPrompt(userContext, selectedRole, weeklyHours || 10);

    const aiResult = await generateAIResponse(
      prompt,
      () => fallbackRoadmap(selectedRole)
    );

    // Calculate total milestone count
    let totalItems = 0;
    if (aiResult.phases && Array.isArray(aiResult.phases)) {
      aiResult.phases.forEach(p => {
        if (p.items) totalItems += p.items.length;
      });
    }

    const roadmap = await Roadmap.findOneAndUpdate(
      { user: req.user._id },
      {
        targetRole: selectedRole,
        totalMilestones: totalItems || 12,
        completedMilestones: 0,
        phases: aiResult.phases || [],
      },
      { upsert: true, new: true }
    );

    await Activity.create({
      user: req.user._id,
      activityType: 'ROADMAP_UPDATED',
      title: `Generated Learning Roadmap for ${selectedRole}`,
      description: `Created a customized 4-phase milestone path.`,
    });

    res.json({
      success: true,
      data: roadmap,
    });
  } catch (error) {
    next(error);
  }
};

export const updateItemStatus = async (req, res, next) => {
  try {
    const { phaseIndex, itemIndex, status } = req.body;

    const allowedStatuses = ['Not Started', 'In Progress', 'Completed'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status: "${status}". Allowed values: ${allowedStatuses.join(', ')}`,
      });
    }

    const roadmap = await Roadmap.findOne({ user: req.user._id });
    if (!roadmap) {
      return res.status(404).json({ success: false, message: 'Roadmap not found' });
    }

    const pIdx = Number(phaseIndex);
    const iIdx = Number(itemIndex);

    if (
      isNaN(pIdx) ||
      isNaN(iIdx) ||
      pIdx < 0 ||
      iIdx < 0 ||
      !roadmap.phases ||
      pIdx >= roadmap.phases.length ||
      !roadmap.phases[pIdx].items ||
      iIdx >= roadmap.phases[pIdx].items.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phaseIndex or itemIndex: milestone item does not exist in roadmap',
      });
    }

    const targetItem = roadmap.phases[pIdx].items[iIdx];
    const oldStatus = targetItem.status;
    targetItem.status = status;

    // Recalculate completed milestones count
    let completed = 0;
    let total = 0;
    roadmap.phases.forEach((phase) => {
      let phaseCompletedCount = 0;
      phase.items.forEach((item) => {
        total++;
        if (item.status === 'Completed') {
          completed++;
          phaseCompletedCount++;
        }
      });
      // Update phase status if all items completed
      if (phase.items.length > 0 && phaseCompletedCount === phase.items.length) {
        phase.status = 'Completed';
      } else if (phaseCompletedCount > 0) {
        phase.status = 'In Progress';
      } else {
        phase.status = 'Not Started';
      }
    });

    roadmap.completedMilestones = completed;
    roadmap.totalMilestones = total;

    await roadmap.save();

    // Log activity on new milestone completion
    if (status === 'Completed' && oldStatus !== 'Completed') {
      await Activity.create({
        user: req.user._id,
        activityType: 'ROADMAP_UPDATED',
        title: `Milestone Completed: ${targetItem.title}`,
        description: `Progress updated on ${roadmap.targetRole} roadmap (${completed}/${total} milestones reached).`,
      });
    }

    res.json({
      success: true,
      data: roadmap,
    });
  } catch (error) {
    next(error);
  }
};
