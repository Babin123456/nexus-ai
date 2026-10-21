import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['Programming', 'Frontend', 'Backend', 'Database', 'AI/ML', 'Data', 'Tools', 'Soft Skills'],
    default: 'Programming',
  },
  proficiency: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Intermediate',
  },
}, {
  timestamps: true,
});

skillSchema.index({ user: 1, name: 1 }, { unique: true });

export const Skill = mongoose.model('Skill', skillSchema);
