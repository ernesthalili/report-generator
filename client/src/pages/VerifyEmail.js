import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Copyright from '../components/Copyright';
import './Auth.css';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    axios.get(`/api/auth/verify-email?token=${token}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      });
  }, [searchParams]);

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>Report Generator</h1>
          <h2>Email Verification</h2>
        </div>

        {status === 'loading' && (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem 0' }}>
            Verifying your email...
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="alert alert-success">{message}</div>
            <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
              <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Go to Login
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="alert alert-error">{message}</div>
            <p style={{ color: '#aaa', fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem' }}>
              Need a new link?{' '}
              <Link to="/resend-verification" style={{ color: '#00FFFF' }}>
                Resend verification email
              </Link>
            </p>
          </>
        )}

        <Copyright />
      </div>
    </div>
  );
}

export default VerifyEmail;
