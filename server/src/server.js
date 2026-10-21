import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/error.middleware.js';
import { securityHeaders } from './middleware/security.middleware.js';
import { authRateLimiter, aiRateLimiter } from './middleware/rateLimit.middleware.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import skillRoutes from './routes/skill.routes.js';
import projectRoutes from './routes/project.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import careerRoutes from './routes/career.routes.js';
import jobRoutes from './routes/job.routes.js';
import roadmapRoutes from './routes/roadmap.routes.js';
import chatRoutes from './routes/chat.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers
app.use(securityHeaders);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static upload serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database Connection
connectDB();

// Tiered Rate Limiting on High-Cost & Sensitive Routes
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/chat/message', aiRateLimiter);
app.use('/api/jobs/match', aiRateLimiter);
app.use('/api/resume/upload', aiRateLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Nexus AI API Engine',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Nexus AI Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
