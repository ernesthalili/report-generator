import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Copyright from '../components/Copyright';
import './Auth.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      if (result.needsVerification) {
        setNeedsVerification(true);
      }
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>Report Generator</h1>
          <h2>Login</h2>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
            {needsVerification && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                <Link to="/resend-verification" style={{ color: '#ff8888' }}>
                  Resend verification email →
                </Link>
              </div>
            )}
          </div>
        )}

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

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <div style={{ textAlign: 'right', marginTop: '0.4rem' }}>
              <Link
                to="/forgot-password"
                style={{ fontSize: '0.85rem', color: '#00FFFF', textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Register here</Link></p>
        </div>

        <Copyright />
      </div>
    </div>
  );
}

export default Login;
