import React, { useState, useEffect } from 'react';
import { Target, Sparkles, CheckCircle2, AlertTriangle, HelpCircle, History, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/Topbar';
import { Card, Badge } from '../components/Card';
import { Textarea, Input } from '../components/Input';
import { Button } from '../components/Button';
import API from '../services/api';

export const JobMatchPage = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await API.get('/jobs/history');
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch job match history:', err.message);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!jobDescriptionText.trim()) {
      setError('Please paste a job description text to analyze.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await API.post('/jobs/match', {
        jobTitle,
        jobDescriptionText,
      });

      if (res.data.success) {
        setMatchResult(res.data.data);
        fetchHistory();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Job match analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistoryItem = (item) => {
    setMatchResult(item);
    setJobTitle(item.jobTitle || '');
    setJobDescriptionText(item.jobDescriptionText || '');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteHistoryItem = async (id, e) => {
    e.stopPropagation();
    try {
      await API.delete(`/jobs/${id}`);
      setHistory((prev) => prev.filter((item) => item._id !== id));
      if (matchResult && matchResult._id === id) {
        setMatchResult(null);
      }
    } catch (err) {
      console.error('Failed to delete job match history item:', err.message);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Job Matcher"
        subtitle="Paste any target job description to compute instant match percentage, skill gaps, and preparation steps"
      />

      {/* INPUT FORM CARD */}
      <Card className="space-y-4">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <Input
            label="Job Position Title (Optional)"
            placeholder="e.g. AI Systems Engineer / Full Stack Developer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />

          <Textarea
            label="Paste Job Description Requirements"
            placeholder="Paste the full job posting requirements, responsibilities, and technical stack specifications..."
            rows={6}
            value={jobDescriptionText}
            onChange={(e) => setJobDescriptionText(e.target.value)}
            required
          />

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={loading} icon={Sparkles}>
              Calculate AI Job Match
            </Button>
          </div>
        </form>
      </Card>

      {/* MATCH RESULT BREAKDOWN */}
      {matchResult && (
        <div className="space-y-6 animate-fade-in">
          {/* OVERVIEW SCORE GAUGE */}
          <Card className="bg-gradient-to-r from-nexus-900/40 via-slate-900 to-slate-900 border-nexus-500/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-nexus-400">Position Analysis</span>
              <h3 className="text-xl font-bold text-white">{matchResult.jobTitle}</h3>
              <p className="text-xs text-slate-400">{matchResult.companyName || 'Target Organization'}</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/80 px-6 py-4 rounded-2xl border border-slate-800 shrink-0">
              <div className="text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase block">Match Score</span>
                <span className="text-3xl font-black text-white">{matchResult.matchScore}%</span>
              </div>
              <div className="w-16 h-16 rounded-full bg-nexus-600/20 border-2 border-nexus-500 flex items-center justify-center text-nexus-400">
                <Target className="w-8 h-8" />
              </div>
            </div>
          </Card>

          {/* MATCHING VS MISSING BREAKDOWN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Strong Matches</span>
              </h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {matchResult.matchingSkills && matchResult.matchingSkills.length > 0 ? (
                  matchResult.matchingSkills.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-300">
                      {s}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">None identified</p>
                )}
              </div>
            </Card>

            <Card className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <HelpCircle className="w-4 h-4" />
                <span>Partial Matches</span>
              </h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {matchResult.partialMatches && matchResult.partialMatches.length > 0 ? (
                  matchResult.partialMatches.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-300">
                      ~ {s}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">None identified</p>
                )}
              </div>
            </Card>

            <Card className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Missing Requirements</span>
              </h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {matchResult.missingSkills && matchResult.missingSkills.length > 0 ? (
                  matchResult.missingSkills.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-300">
                      + {s}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No critical missing skills!</p>
                )}
              </div>
            </Card>
          </div>

          {/* TAILORED PREPARATION STEPS */}
          <Card className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-nexus-400" />
              <span>AI Tailored Preparation Strategy</span>
            </h4>
            <ul className="space-y-2">
              {matchResult.recommendations?.map((rec, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-nexus-400 font-bold mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* SAVED JOB MATCH ANALYSES HISTORY */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-nexus-400" />
            <span>Previous Job Match Analyses</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {history.length} saved
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No previous job match analyses found. Paste a job description above to calculate compatibility.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((item) => (
              <div
                key={item._id}
                onClick={() => handleSelectHistoryItem(item)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  matchResult?._id === item._id
                    ? 'bg-nexus-500/10 border-nexus-500/50 shadow-lg shadow-nexus-500/10'
                    : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate" title={item.jobTitle}>
                      {item.jobTitle}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {item.companyName || 'Target Organization'}
                    </p>
                  </div>
                  <Badge variant={item.matchScore >= 80 ? 'emerald' : item.matchScore >= 60 ? 'amber' : 'rose'}>
                    {item.matchScore}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                  <span className="text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteHistoryItem(item._id, e)}
                      className="p-1 hover:text-rose-400 text-slate-400 rounded transition-colors"
                      title="Delete saved match"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
