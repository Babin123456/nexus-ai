import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  BrainCircuit,
  FileText,
  Target,
  Bot,
  CheckCircle2,
  ChevronRight,
  BarChart2,
  ShieldCheck,
  Zap,
  MapPin
} from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="space-y-24 py-12 md:py-20 px-6 max-w-7xl mx-auto">
      {/* HERO SECTION */}
      <section className="text-center space-y-8 max-w-4xl mx-auto pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nexus-500/10 border border-nexus-500/20 text-xs font-semibold text-nexus-300">
          <Sparkles className="w-3.5 h-3.5 text-nexus-400" />
          <span>Next-Generation Career Intelligence Engine</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Your Career. <br />
          <span className="bg-gradient-to-r from-blue-300 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Connected by Intelligence.
          </span>
        </h1>

        <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Nexus AI analyzes your skills, experience, projects, and goals against real-time industry demands to engineer your personalized career roadmap.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-nexus-600 hover:bg-nexus-500 text-white font-semibold text-sm rounded-xl transition-all shadow-xl shadow-nexus-600/25 active:scale-95"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#capabilities"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm rounded-xl transition-all"
          >
            <span>Explore Nexus Capabilities</span>
          </a>
        </div>

        {/* Hero Visual Banner Mockup */}
        <div className="relative mt-12 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-4 md:p-8 backdrop-blur-md shadow-2xl overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-nexus-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Career Readiness</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">+14% Growth</span>
              </div>
              <p className="text-3xl font-extrabold text-white">84 / 100</p>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-nexus-500 h-2 rounded-full w-[84%]" />
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Resume ATS Score</span>
                <span className="text-xs font-bold text-nexus-400 bg-nexus-500/10 px-2 py-0.5 rounded">Scanned</span>
              </div>
              <p className="text-3xl font-extrabold text-white">86 / 100</p>
              <p className="text-xs text-slate-400">High ATS Match for AI & Full Stack Roles</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">AI Job Match</span>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Live</span>
              </div>
              <p className="text-3xl font-extrabold text-white">82% Match</p>
              <p className="text-xs text-slate-400">Missing Docker & Microservices</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW NEXUS WORKS */}
      <section id="how-it-works" className="space-y-12 text-center">
        <div className="space-y-3">
          <h2 className="text-2xl md:text-4xl font-bold text-white">How Nexus AI Works</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            A seamless four-tier intelligence workflow designed to accelerate your developer trajectory.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {[
            { step: '01', title: 'User Data Intake', desc: 'Sync your education, skills, projects, and target role preferences.' },
            { step: '02', title: 'Contextual AI Audit', desc: 'Our engine parses your profile & resume against live ATS metrics.' },
            { step: '03', title: 'Skill Gap Matrix', desc: 'Isolate exact missing requirements for top tech roles.' },
            { step: '04', title: 'Actionable Roadmap', desc: 'Follow personalized milestone phases to reach career readiness.' }
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3 relative">
              <span className="text-3xl font-black text-nexus-500/30">{item.step}</span>
              <h3 className="text-base font-bold text-slate-100">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CORE CAPABILITIES */}
      <section id="capabilities" className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-4xl font-bold text-white">Core Capabilities</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Everything you need to analyze, optimize, and present your developer portfolio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-4 hover:border-nexus-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-nexus-600/20 text-nexus-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Resume Intelligence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload your PDF resume to extract key skills, receive visual 0-100 ATS compatibility scores, and discover missing keywords.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-4 hover:border-nexus-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Skill Gap Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compare your current skill inventory directly against industry target roles like AI Engineer, Full Stack, and Data Scientist.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-4 hover:border-nexus-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Context-Aware AI Assistant</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Chat with a personal AI career mentor that understands your live profile, projects, and learning history.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gradient-to-r from-nexus-900/40 via-slate-900 to-indigo-950/40 border border-nexus-500/30 rounded-3xl p-10 md:p-14 text-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white">
          Ready to Build Your Career Intelligence?
        </h2>
        <p className="text-sm text-slate-300 max-w-lg mx-auto">
          Join thousands of developers utilizing Nexus AI to master high-value skills and land target software roles.
        </p>
        <div>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-nexus-600 hover:bg-nexus-500 text-white font-semibold text-sm rounded-xl transition-all shadow-xl shadow-nexus-600/25 active:scale-95"
          >
            <span>Create Your Nexus Profile</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
