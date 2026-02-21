import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Copyright from '../components/Copyright';
import './Auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch {
      setMessage('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>Report Generator</h1>
          <h2>Forgot Password</h2>
        </div>

        {message ? (
          <>
            <div className="alert alert-success">{message}</div>
            <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
              <p><Link to="/login">Back to login</Link></p>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: '#aaa', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="auth-footer">
              <p><Link to="/login">Back to login</Link></p>
            </div>
          </>
        )}

        <Copyright />
      </div>
    </div>
  );
}

export default ForgotPassword;
