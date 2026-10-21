import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, LogOut, Trash2, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { PageHeader } from '../components/Topbar';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

export const SettingsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [customKey, setCustomKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  // Password update state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Account deletion state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('nexus_custom_ai_key', customKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 3000);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await API.put('/auth/password', { currentPassword, newPassword });
      if (res.data?.success) {
        setPasswordSuccess(res.data.message || 'Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(''), 4000);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('Please enter your password to authorize deletion');
      return;
    }

    try {
      setDeleteLoading(true);
      await API.delete('/auth/account', { data: { password: deletePassword } });
      logout();
      navigate('/register');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account. Please verify your password.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings & Preferences"
        subtitle="Manage account preferences, security credentials, and AI provider keys"
      />

      {/* ACCOUNT DETAILS CARD */}
      <Card className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Shield className="w-4 h-4 text-nexus-400" />
          <span>Account Overview</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Name" value={user?.name || ''} readOnly />
          <Input label="Email" value={user?.email || ''} readOnly />
        </div>
      </Card>

      {/* PASSWORD & SECURITY CARD */}
      <Card className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Lock className="w-4 h-4 text-nexus-400" />
          <span>Password & Security</span>
        </h3>

        {passwordError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-medium">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={passwordLoading} icon={Lock}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* AI API KEY PREFERENCE */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-nexus-400" />
            <span>Custom AI Provider Configuration</span>
          </h3>
          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
            Google Gemini Ready
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Nexus AI uses server-side environment variables (`GEMINI_API_KEY`) by default. Optionally enter a custom Google Gemini API Key below for client-side override.
        </p>

        <form onSubmit={handleSaveApiKey} className="space-y-4">
          <Input
            label="Gemini API Key (Optional)"
            type="password"
            placeholder="AIzaSy..."
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
          />
          <div className="flex items-center justify-between">
            {keySaved && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Key Saved to Browser Session
              </span>
            )}
            <div className="ml-auto">
              <Button type="submit" variant="secondary">
                Save Key Override
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* DANGER ZONE & LOGOUT */}
      <Card className="border-rose-500/20 bg-rose-500/5 space-y-4">
        <h3 className="text-base font-bold text-rose-300 flex items-center gap-2 border-b border-rose-500/20 pb-3">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Account Actions & Danger Zone</span>
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Sign Out of Session</h4>
            <p className="text-xs text-slate-400">Logout from current device session</p>
          </div>
          <Button variant="secondary" onClick={handleLogout} icon={LogOut}>
            Sign Out
          </Button>
        </div>

        <div className="pt-4 border-t border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-rose-300">Delete Account & Data</h4>
            <p className="text-xs text-slate-400">Permanently erase profile, resume analyses, and milestone history</p>
          </div>
          <Button
            variant="danger"
            onClick={() => {
              setDeletePassword('');
              setDeleteError('');
              setIsDeleteModalOpen(true);
            }}
            icon={Trash2}
          >
            Delete Account
          </Button>
        </div>
      </Card>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Account Deletion">
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Are you sure you want to permanently delete your Nexus AI account? All your personal profile data, resume evaluations, skill assessments, roadmaps, and project records will be permanently erased. This action cannot be reversed.
          </p>

          {deleteError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-medium">
              {deleteError}
            </div>
          )}

          <div className="pt-2">
            <Input
              label="Authorize Deletion With Password"
              type="password"
              placeholder="Enter your current password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={deleteLoading}
              icon={Trash2}
            >
              Confirm Permanent Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
