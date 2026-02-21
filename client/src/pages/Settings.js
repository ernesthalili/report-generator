import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Copyright from '../components/Copyright';
import './Settings.css';

function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Change Password ──────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // ── Change Email ─────────────────────────────────────────────────────────────
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }

    setPwLoading(true);
    try {
      const res = await axios.put('/api/auth/settings/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      });
      setPwSuccess(res.data.message);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to update password');
    }
    setPwLoading(false);
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    setEmailLoading(true);

    try {
      const res = await axios.put('/api/auth/settings/email', {
        newEmail: emailForm.newEmail,
        password: emailForm.password
      });
      setEmailSuccess(res.data.message);
      setEmailForm({ newEmail: '', password: '' });
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Failed to request email change');
    }
    setEmailLoading(false);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
        <h1>Account Settings</h1>
        <p className="settings-subtitle">Logged in as <span>{user?.username}</span> · {user?.email}</p>
      </div>

      <div className="settings-grid">

        {/* ── Change Password Card ─────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">🔑</div>
            <div>
              <h2>Change Password</h2>
              <p>Update your current password</p>
            </div>
          </div>

          {pwError && <div className="alert alert-error">{pwError}</div>}
          {pwSuccess && <div className="alert alert-success">{pwSuccess}</div>}

          <form onSubmit={handlePasswordChange} className="settings-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                required
                placeholder="••••••••"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                required
                minLength="6"
                placeholder="••••••••"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                required
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn-settings-primary" disabled={pwLoading}>
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* ── Change Email Card ────────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">✉️</div>
            <div>
              <h2>Change Email</h2>
              <p>A verification link will be sent to the new address</p>
            </div>
          </div>

          {emailError && <div className="alert alert-error">{emailError}</div>}
          {emailSuccess && <div className="alert alert-success">{emailSuccess}</div>}

          <form onSubmit={handleEmailChange} className="settings-form">
            <div className="form-group">
              <label>New Email Address</label>
              <input
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                required
                placeholder="new@email.com"
              />
            </div>
            <div className="form-group">
              <label>Confirm with your Password</label>
              <input
                type="password"
                value={emailForm.password}
                onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                required
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn-settings-primary" disabled={emailLoading}>
              {emailLoading ? 'Sending...' : 'Request Email Change'}
            </button>
          </form>
        </div>

      </div>

      <Copyright />
    </div>
  );
}

export default Settings;
