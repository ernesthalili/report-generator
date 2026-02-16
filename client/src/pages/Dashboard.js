import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import TemplateManager from '../components/TemplateManager';
import Copyright from '../components/Copyright';
import './Dashboard.css';

function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  
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
      
      // Extract filename from Content-Disposition header
      let filename = `${projectName.replace(/[^a-z0-9]/gi, '_')}_report.docx`; // fallback
      const contentDisposition = res.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/);
        if (filenameMatch && filenameMatch[3]) {
          filename = decodeURIComponent(filenameMatch[3]);
        } else if (filenameMatch && filenameMatch[2]) {
          filename = decodeURIComponent(filenameMatch[2]);
        }
      }
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate document');
      console.error(err);
    }
  };

  const toggleExpand = (reportId) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  // Calculate severity counts for a report
  const getSeverityCounts = (vulnerabilities) => {
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    if (vulnerabilities && vulnerabilities.length > 0) {
      vulnerabilities.forEach(vuln => {
        const severity = vuln.severity?.toLowerCase() || '';
        if (severity.includes('critical') || severity.includes('critica')) {
          counts.critical++;
        } else if (severity.includes('high') || severity.includes('alta') || severity.includes('alto')) {
          counts.high++;
        } else if (severity.includes('medium') || severity.includes('media') || severity.includes('medio')) {
          counts.medium++;
        } else if (severity.includes('low') || severity.includes('bassa') || severity.includes('basso')) {
          counts.low++;
        }
      });
    }

    return counts;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Report Generator</h1>
          <div className="header-actions">
            <span className="user-info">👤 {user?.username}</span>
            <button onClick={logout} className="btn btn-secondary">Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="content-header">
          <h2>My Reports</h2>
          <div className="header-buttons">
            <button 
              onClick={() => setShowTemplateManager(true)} 
              className="btn btn-secondary"
              style={{ marginRight: '10px' }}
            >
              📋 Vulnerability Templates
            </button>
            <button 
              onClick={() => navigate('/templates')} 
              className="btn btn-secondary"
              style={{ marginRight: '10px' }}
            >
              📄 Report Templates
            </button>
            <button 
              onClick={() => navigate('/reports/create')} 
              className="btn btn-primary"
            >
              + Create New Report
            </button>
          </div>
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
            {reports.map((report) => {
              const severityCounts = getSeverityCounts(report.vulnerabilities);
              const isExpanded = expandedReport === report._id;
              const totalVulns = report.vulnerabilities?.length || 0;

              return (
                <div key={report._id} className="report-card">
                  <div className="card-main">
                    <div className="card-header">
                      <h3>{report.projectName}</h3>
                      <div className="card-meta">
                        <span className="card-client">
                          {report.client_name || 'No client specified'}
                        </span>
                        <span className="card-date">
                          Updated: {formatDate(report.updatedAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="card-body">
                      {/* Testing Period */}
                      <div className="card-info-group">
                        <span className="info-label">Testing Period:</span>
                        <span className="info-value-text">
                          {formatDate(report.testing_start_date)} - {formatDate(report.testing_end_date)}
                        </span>
                      </div>

                      {/* Severity Distribution Bar */}
                      <div className="severity-distribution">
                        <div className="severity-bar-container">
                          {severityCounts.critical > 0 && (
                            <div 
                              className="severity-bar severity-bar-critical" 
                              style={{ width: `${(severityCounts.critical / totalVulns) * 100}%` }}
                              title={`Critical: ${severityCounts.critical}`}
                            >
                              <span className="severity-count">{severityCounts.critical}</span>
                            </div>
                          )}
                          {severityCounts.high > 0 && (
                            <div 
                              className="severity-bar severity-bar-high" 
                              style={{ width: `${(severityCounts.high / totalVulns) * 100}%` }}
                              title={`High: ${severityCounts.high}`}
                            >
                              <span className="severity-count">{severityCounts.high}</span>
                            </div>
                          )}
                          {severityCounts.medium > 0 && (
                            <div 
                              className="severity-bar severity-bar-medium" 
                              style={{ width: `${(severityCounts.medium / totalVulns) * 100}%` }}
                              title={`Medium: ${severityCounts.medium}`}
                            >
                              <span className="severity-count">{severityCounts.medium}</span>
                            </div>
                          )}
                          {severityCounts.low > 0 && (
                            <div 
                              className="severity-bar severity-bar-low" 
                              style={{ width: `${(severityCounts.low / totalVulns) * 100}%` }}
                              title={`Low: ${severityCounts.low}`}
                            >
                              <span className="severity-count">{severityCounts.low}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Severity Labels */}
                        <div className="severity-labels">
                          {severityCounts.critical > 0 && (
                            <span className="severity-label label-critical">Critical: {severityCounts.critical}</span>
                          )}
                          {severityCounts.high > 0 && (
                            <span className="severity-label label-high">High: {severityCounts.high}</span>
                          )}
                          {severityCounts.medium > 0 && (
                            <span className="severity-label label-medium">Medium: {severityCounts.medium}</span>
                          )}
                          {severityCounts.low > 0 && (
                            <span className="severity-label label-low">Low: {severityCounts.low}</span>
                          )}
                        </div>
                      </div>

                      {/* Expand/Collapse Button */}
                      <button 
                        className="expand-btn"
                        onClick={() => toggleExpand(report._id)}
                      >
                        {isExpanded ? '▲ Hide Details' : `▼ View ${totalVulns} Vulnerabilities`}
                      </button>
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

                  {/* Expandable Vulnerability List */}
                  {isExpanded && (
                    <div className="card-expanded">
                      <div className="vulnerabilities-list">
                        <h4>Vulnerabilities</h4>
                        {report.vulnerabilities && report.vulnerabilities.length > 0 ? (
                          <div className="vuln-items">
                            {report.vulnerabilities.map((vuln, idx) => (
                              <div key={idx} className="vuln-item">
                                <span className={`vuln-severity severity-${vuln.severity?.toLowerCase() || 'unknown'}`}>
                                  {vuln.severity || 'N/A'}
                                </span>
                                <span className="vuln-name">{vuln.name || 'Unnamed Vulnerability'}</span>
                                {vuln.cvss_score && (
                                  <span className="vuln-cvss">CVSS: {vuln.cvss_score}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="no-vulns">No vulnerabilities added yet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Copyright Footer */}
        <Copyright />
      </div>

      {showTemplateManager && (
        <TemplateManager onClose={() => setShowTemplateManager(false)} />
      )}
    </div>
  );
}

export default Dashboard;