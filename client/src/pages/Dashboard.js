import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await axios.get('/api/reports');
      setReports(res.data.data);
    } catch (err) {
      setError('Failed to load reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await axios.delete(`/api/reports/${id}`);
      setReports(reports.filter(r => r._id !== id));
    } catch (err) {
      alert('Failed to delete report');
      console.error(err);
    }
  };

  const handleGenerateDoc = async (id, projectName) => {
    try {
      const res = await axios.post(`/api/reports/${id}/generate`, {}, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${projectName.replace(/[^a-z0-9]/gi, '_')}_report.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate document');
      console.error(err);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>⚡ PenTest Reporter</h1>
          <div className="header-actions">
            <span className="user-info">👤 {user?.username}</span>
            <button onClick={logout} className="btn btn-secondary">Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="content-header">
          <h2>My Reports</h2>
          <button 
            onClick={() => navigate('/reports/create')} 
            className="btn btn-primary"
          >
            + Create New Report
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <p>No reports yet. Create your first one!</p>
            <button 
              onClick={() => navigate('/reports/create')} 
              className="btn btn-primary"
            >
              Create Report
            </button>
          </div>
        ) : (
          <div className="reports-grid">
            {reports.map((report) => (
              <div key={report._id} className="report-card">
                <div className="card-header">
                  <h3>{report.projectName}</h3>
                  <span className="card-date">
                    {new Date(report.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="card-body">
                  <div className="card-info">
                    <span className="info-label">Vulnerabilities:</span>
                    <span className="info-value">{report.vulnerabilities?.length || 0}</span>
                  </div>
                  <div className="card-info">
                    <span className="info-label">Targets:</span>
                    <span className="info-value">{report.targets?.length || 0}</span>
                  </div>
                </div>

                <div className="card-actions">
                  <button 
                    onClick={() => navigate(`/reports/edit/${report._id}`)}
                    className="btn btn-sm btn-secondary"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleGenerateDoc(report._id, report.projectName)}
                    className="btn btn-sm btn-primary"
                  >
                    📥 Download DOCX
                  </button>
                  <button 
                    onClick={() => handleDelete(report._id)}
                    className="btn btn-sm btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
