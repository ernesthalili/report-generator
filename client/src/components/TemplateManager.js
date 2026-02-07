import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CVSSCalculator from './CVSSCalculator';
import './TemplateManager.css';

const TemplateManager = ({ onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    severity: '',
    priority: '',
    cvss_score: '',
    cvss_vector: '',
    description: '',
    impact: '',
    remediation: '',
    owasp_category: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/vulnerability-templates');
      setTemplates(res.data.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name || '',
      severity: template.severity || '',
      priority: template.priority || '',
      cvss_score: template.cvss_score || '',
      cvss_vector: template.cvss_vector || '',
      description: template.description || '',
      impact: template.impact || '',
      remediation: template.remediation || '',
      owasp_category: template.owasp_category || ''
    });
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCVSSUpdate = ({ score, severity, vector }) => {
    setFormData(prev => ({
      ...prev,
      cvss_score: score,
      severity: severity,
      cvss_vector: vector
    }));
  };

  const handleSaveTemplate = async () => {
    try {
      if (!formData.name.trim()) {
        alert('Template name is required');
        return;
      }

      if (selectedTemplate) {
        // Update existing template
        await axios.put(`/api/vulnerability-templates/${selectedTemplate._id}`, formData);
        alert('Template updated successfully');
      } else {
        // Create new template
        await axios.post('/api/vulnerability-templates', formData);
        alert('Template created successfully');
      }

      await loadTemplates();
      setSelectedTemplate(null);
      setIsEditing(false);
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save template');
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await axios.delete(`/api/vulnerability-templates/${templateId}`);
      alert('Template deleted successfully');
      await loadTemplates();
      if (selectedTemplate?._id === templateId) {
        setSelectedTemplate(null);
        resetForm();
      }
    } catch (err) {
      alert('Failed to delete template');
      console.error(err);
    }
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setIsEditing(true);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      severity: '',
      priority: '',
      cvss_score: '',
      cvss_vector: '',
      description: '',
      impact: '',
      remediation: '',
      owasp_category: ''
    });
  };

  return (
    <div className="template-manager-overlay">
      <div className="template-manager">
        <div className="template-manager-header">
          <h2>Vulnerability Templates</h2>
          <button onClick={onClose} className="btn btn-sm btn-secondary">✕ Close</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="template-manager-content">
          {/* Templates List */}
          <div className="templates-sidebar">
            <div className="sidebar-header">
              <h3>Saved Templates</h3>
              <button onClick={handleNewTemplate} className="btn btn-sm btn-primary">
                + New Template
              </button>
            </div>

            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="empty-state">
                <p>No templates yet. Create your first one!</p>
              </div>
            ) : (
              <div className="templates-list">
                {templates.map(template => (
                  <div
                    key={template._id}
                    className={`template-item ${selectedTemplate?._id === template._id ? 'active' : ''}`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="template-item-header">
                      <span className="template-name">{template.name}</span>
                      <span className={`template-severity severity-${template.severity.toLowerCase()}`}>
                        {template.severity}
                      </span>
                    </div>
                    <div className="template-item-footer">
                      <small>{new Date(template.updatedAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Editor */}
          <div className="template-editor">
            {selectedTemplate || isEditing ? (
              <>
                <div className="editor-header">
                  <h3>{selectedTemplate ? (isEditing ? 'Edit Template' : 'Template Details') : 'New Template'}</h3>
                  <div className="editor-actions">
                    {selectedTemplate && !isEditing && (
                      <>
                        <button 
                          onClick={() => setIsEditing(true)} 
                          className="btn btn-sm btn-secondary"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(selectedTemplate._id)} 
                          className="btn btn-sm btn-danger"
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                    {isEditing && (
                      <>
                        <button onClick={handleSaveTemplate} className="btn btn-sm btn-primary">
                          💾 Save
                        </button>
                        <button 
                          onClick={() => {
                            setIsEditing(false);
                            if (selectedTemplate) {
                              handleSelectTemplate(selectedTemplate);
                            } else {
                              setSelectedTemplate(null);
                              resetForm();
                            }
                          }} 
                          className="btn btn-sm btn-secondary"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="editor-form">
                  <div className="form-group">
                    <label>Template Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., SQL Injection Template"
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  {/* CVSS Calculator */}
                  {isEditing && (
                    <CVSSCalculator
                      initialVector={formData.cvss_vector}
                      initialScore={formData.cvss_score}
                      onScoreUpdate={handleCVSSUpdate}
                    />
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Severity</label>
                      <input
                        type="text"
                        name="severity"
                        value={formData.severity}
                        onChange={handleInputChange}
                        placeholder="Critica, Alta, Media, Bassa"
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="form-group">
                      <label>Priority</label>
                      <input
                        type="text"
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        placeholder="e.g., P1"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>CVSS Score</label>
                      <input
                        type="text"
                        name="cvss_score"
                        value={formData.cvss_score}
                        onChange={handleInputChange}
                        placeholder="e.g., 9.8"
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="form-group">
                      <label>CVSS Vector</label>
                      <input
                        type="text"
                        name="cvss_vector"
                        value={formData.cvss_vector}
                        onChange={handleInputChange}
                        placeholder="CVSS:3.1/AV:N/AC:L/..."
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>OWASP Top 10 Category</label>
                    <select
                      name="owasp_category"
                      value={formData.owasp_category}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    >
                      <option value="">Select OWASP category</option>
                      <option value="A01 - Broken Access Control">A01 - Broken Access Control</option>
                      <option value="A02 - Cryptographic Failures">A02 - Cryptographic Failures</option>
                      <option value="A03 - Injection">A03 - Injection</option>
                      <option value="A04 - Insecure Design">A04 - Insecure Design</option>
                      <option value="A05 - Security Misconfiguration">A05 - Security Misconfiguration</option>
                      <option value="A06 - Vulnerable and Outdated Components">A06 - Vulnerable and Outdated Components</option>
                      <option value="A07 - Identification and Authentication Failures">A07 - Identification and Authentication Failures</option>
                      <option value="A08 - Software and Data Integrity Failures">A08 - Software and Data Integrity Failures</option>
                      <option value="A09 - Security Logging and Monitoring Failures">A09 - Security Logging and Monitoring Failures</option>
                      <option value="A10 - Server-Side Request Forgery">A10 - Server-Side Request Forgery</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Detailed description of the vulnerability..."
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label>Impact</label>
                    <textarea
                      name="impact"
                      value={formData.impact}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="What could happen if exploited..."
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label>Remediation</label>
                    <textarea
                      name="remediation"
                      value={formData.remediation}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="How to fix this vulnerability..."
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>Select a template to view or edit, or create a new one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;