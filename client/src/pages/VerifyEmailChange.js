import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Copyright from '../components/Copyright';
import './Auth.css';

function VerifyEmailChange() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const { logout } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No token found in the link.');
      return;
    }

    axios.get(`/api/auth/verify-email-change?token=${token}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message);
        logout(); // Force re-login since email changed
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'The link may have expired or already been used.');
      });
  }, [searchParams, logout]);

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>Report Generator</h1>
          <h2>Email Change</h2>
        </div>

        {status === 'loading' && (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem 0' }}>
            Confirming your new email...
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="alert alert-success">{message}</div>
            <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
              <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Log in with new email
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <div className="alert alert-error">{message}</div>
        )}

        <Copyright />
      </div>
    </div>
  );
}

export default VerifyEmailChange;
