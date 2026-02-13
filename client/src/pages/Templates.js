import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Templates.css';

function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateFile, setTemplateFile] = useState(null);
  
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/templates');
      setTemplates(res.data.data);
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.docx')) {
        setUploadError('Only .docx files are allowed');
        e.target.value = '';
        return;
      }
      setTemplateFile(file);
      setUploadError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!templateName.trim()) {
      setUploadError('Template name is required');
      return;
    }
    
    if (!templateFile) {
      setUploadError('Please select a .docx file');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('template', templateFile);
      formData.append('name', templateName.trim());

      await axios.post('/api/templates/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadSuccess('Template uploaded successfully!');
      setTemplateName('');
      setTemplateFile(null);
      document.getElementById('templateFile').value = '';
      
      // Reload templates list
      await loadTemplates();
      
      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(''), 3000);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to upload template');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, templateName) => {
    if (!window.confirm(`Are you sure you want to delete "${templateName}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/templates/${id}`);
      setTemplates(templates.filter(t => t._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete template');
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="templates-page">
      <header className="templates-header">
        <div className="header-content">
          <h1>📋 Template Manager</h1>
          <div className="header-actions">
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              ← Back to Dashboard
            </button>
            <button onClick={logout} className="btn btn-secondary">Logout</button>
          </div>
        </div>
      </header>

      <div className="templates-content">
        {/* Upload Section */}
        <div className="upload-section card">
          <h2>Upload New Template</h2>
          <form onSubmit={handleUpload} className="upload-form">
            <div className="form-group">
              <label htmlFor="templateName">Template Name *</label>
              <input
                type="text"
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., My Custom WAPT Template"
                disabled={uploading}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="templateFile">Template File (.docx) *</label>
              <input
                type="file"
                id="templateFile"
                accept=".docx"
                onChange={handleFileSelect}
                disabled={uploading}
                required
              />
              <small className="help-text">
                Only .docx files are supported. Maximum file size: 10MB
              </small>
            </div>

            {uploadError && (
              <div className="alert alert-error">{uploadError}</div>
            )}
            
            {uploadSuccess && (
              <div className="alert alert-success">{uploadSuccess}</div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : '📤 Upload Template'}
            </button>
          </form>
        </div>

        {/* Templates List Section */}
        <div className="templates-list-section">
          <h2>Available Templates</h2>
          
          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="loading">Loading templates...</div>
          ) : (
            <>
              {/* Default Template */}
              <div className="template-card default-template">
                <div className="template-icon">📄</div>
                <div className="template-info">
                  <h3>WAPT Default Template</h3>
                  <p className="template-meta">
                    <span className="badge badge-default">Default</span>
                    <span>System Template</span>
                  </p>
                  <p className="template-description">
                    The standard Web Application Penetration Testing report template
                  </p>
                </div>
                <div className="template-actions">
                  <span className="template-status">Always Available</span>
                </div>
              </div>

              {/* Custom Templates */}
              {templates.length === 0 ? (
                <div className="no-templates">
                  <p>No custom templates uploaded yet.</p>
                  <p>Upload your first template above to get started!</p>
                </div>
              ) : (
                templates.map(template => (
                  <div key={template._id} className="template-card">
                    <div className="template-icon">📋</div>
                    <div className="template-info">
                      <h3>{template.name}</h3>
                      <p className="template-meta">
                        {template.isOwner && (
                          <span className="badge badge-owner">Your Template</span>
                        )}
                        <span>Uploaded by: {template.uploadedBy?.username || 'Unknown'}</span>
                        <span>Date: {formatDate(template.uploadedAt)}</span>
                      </p>
                      <p className="template-filename">{template.filename}</p>
                    </div>
                    <div className="template-actions">
                      {template.isOwner ? (
                        <button
                          onClick={() => handleDelete(template._id, template.name)}
                          className="btn btn-danger btn-sm"
                        >
                          🗑️ Delete
                        </button>
                      ) : (
                        <span className="template-status">Shared by others</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Info Section */}
        <div className="info-section card">
          <h3>ℹ️ About Templates</h3>
          <ul>
            <li>Templates are shared across all users in the system</li>
            <li>Only the uploader can delete their own templates</li>
            <li>When creating a report, you can select which template to use</li>
            <li>The default WAPT template is always available</li>
            <li>Templates must be in .docx format with properly formatted tags</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Templates;
