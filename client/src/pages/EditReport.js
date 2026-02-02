import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './ReportForm.css';

function EditReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    projectName: '',
    testingCompanyName: '',
    testingMode: '',
    targets: [{ name: '', url: '', severity: '' }],
    userAccounts: [{ username: '', description: '' }],
    vulnerabilities: [{
      name: '',
      severity: 'Medium',
      priority: '',
      cvssScore: '',
      cvssVector: '',
      description: '',
      description1: '',
      description2: '',
      impact: '',
      remediation: '',
      targets: [''],
      parameters: [''],
      methodologies: ['']
    }]
  });

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      const res = await axios.get(`/api/reports/${id}`);
      const report = res.data.data;
      
      // Ensure arrays have at least one item
      setFormData({
        ...report,
        targets: report.targets.length > 0 ? report.targets : [{ name: '', url: '', severity: '' }],
        userAccounts: report.userAccounts.length > 0 ? report.userAccounts : [{ username: '', description: '' }],
        vulnerabilities: report.vulnerabilities.length > 0 ? report.vulnerabilities.map(v => ({
          ...v,
          targets: v.targets.length > 0 ? v.targets : [''],
          parameters: v.parameters.length > 0 ? v.parameters : [''],
          methodologies: v.methodologies.length > 0 ? v.methodologies : ['']
        })) : [{
          name: '',
          severity: 'Medium',
          priority: '',
          cvssScore: '',
          cvssVector: '',
          description: '',
          description1: '',
          description2: '',
          impact: '',
          remediation: '',
          targets: [''],
          parameters: [''],
          methodologies: ['']
        }]
      });
    } catch (err) {
      setError('Failed to load report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // All the same handler functions as CreateReport
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const addTarget = () => {
    setFormData({
      ...formData,
      targets: [...formData.targets, { name: '', url: '', severity: '' }]
    });
  };

  const removeTarget = (index) => {
    const newTargets = formData.targets.filter((_, i) => i !== index);
    setFormData({ ...formData, targets: newTargets });
  };

  const handleTargetChange = (index, field, value) => {
    const newTargets = [...formData.targets];
    newTargets[index][field] = value;
    setFormData({ ...formData, targets: newTargets });
  };

  const addUserAccount = () => {
    setFormData({
      ...formData,
      userAccounts: [...formData.userAccounts, { username: '', description: '' }]
    });
  };

  const removeUserAccount = (index) => {
    const newAccounts = formData.userAccounts.filter((_, i) => i !== index);
    setFormData({ ...formData, userAccounts: newAccounts });
  };

  const handleUserAccountChange = (index, field, value) => {
    const newAccounts = [...formData.userAccounts];
    newAccounts[index][field] = value;
    setFormData({ ...formData, userAccounts: newAccounts });
  };

  const addVulnerability = () => {
    setFormData({
      ...formData,
      vulnerabilities: [...formData.vulnerabilities, {
        name: '',
        severity: 'Medium',
        priority: '',
        cvssScore: '',
        cvssVector: '',
        description: '',
        description1: '',
        description2: '',
        impact: '',
        remediation: '',
        targets: [''],
        parameters: [''],
        methodologies: ['']
      }]
    });
  };

  const removeVulnerability = (index) => {
    const newVulns = formData.vulnerabilities.filter((_, i) => i !== index);
    setFormData({ ...formData, vulnerabilities: newVulns });
  };

  const handleVulnChange = (index, field, value) => {
    const newVulns = [...formData.vulnerabilities];
    newVulns[index][field] = value;
    setFormData({ ...formData, vulnerabilities: newVulns });
  };

  const addVulnArrayItem = (vulnIndex, field) => {
    const newVulns = [...formData.vulnerabilities];
    newVulns[vulnIndex][field].push('');
    setFormData({ ...formData, vulnerabilities: newVulns });
  };

  const removeVulnArrayItem = (vulnIndex, field, itemIndex) => {
    const newVulns = [...formData.vulnerabilities];
    newVulns[vulnIndex][field] = newVulns[vulnIndex][field].filter((_, i) => i !== itemIndex);
    setFormData({ ...formData, vulnerabilities: newVulns });
  };

  const handleVulnArrayChange = (vulnIndex, field, itemIndex, value) => {
    const newVulns = [...formData.vulnerabilities];
    newVulns[vulnIndex][field][itemIndex] = value;
    setFormData({ ...formData, vulnerabilities: newVulns });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await axios.put(`/api/reports/${id}`, formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update report');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="report-form-container">
        <div className="loading-spinner">Loading report...</div>
      </div>
    );
  }

  return (
    <div className="report-form-container">
      <div className="form-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-back">
          ← Back to Dashboard
        </button>
        <h1>Edit Report</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="report-form">
        {/* Project Info */}
        <section className="form-section">
          <h2>Project Information</h2>
          
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
              required
              placeholder="e.g., ABC Corp Web Application Assessment"
            />
          </div>

          <div className="form-group">
            <label>Testing Company Name</label>
            <input
              type="text"
              name="testingCompanyName"
              value={formData.testingCompanyName}
              onChange={handleChange}
              placeholder="Your company name"
            />
          </div>

          <div className="form-group">
            <label>Testing Mode</label>
            <input
              type="text"
              name="testingMode"
              value={formData.testingMode}
              onChange={handleChange}
              placeholder="e.g., Black Box, White Box, Grey Box"
            />
          </div>
        </section>

        {/* Targets */}
        <section className="form-section">
          <div className="section-header">
            <h2>Targets</h2>
            <button type="button" onClick={addTarget} className="btn btn-sm btn-secondary">
              + Add Target
            </button>
          </div>

          {formData.targets.map((target, index) => (
            <div key={index} className="form-group-array">
              <div className="array-header">
                <h4>Target {index + 1}</h4>
                {formData.targets.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeTarget(index)}
                    className="btn btn-sm btn-danger"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Target Name</label>
                  <input
                    type="text"
                    value={target.name}
                    onChange={(e) => handleTargetChange(index, 'name', e.target.value)}
                    placeholder="e.g., Main Web Application"
                  />
                </div>

                <div className="form-group">
                  <label>Target URL</label>
                  <input
                    type="text"
                    value={target.url}
                    onChange={(e) => handleTargetChange(index, 'url', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Severity</label>
                  <select
                    value={target.severity}
                    onChange={(e) => handleTargetChange(index, 'severity', e.target.value)}
                  >
                    <option value="">Select severity</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Informational">Informational</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* User Accounts */}
        <section className="form-section">
          <div className="section-header">
            <h2>Test User Accounts</h2>
            <button type="button" onClick={addUserAccount} className="btn btn-sm btn-secondary">
              + Add User Account
            </button>
          </div>

          {formData.userAccounts.map((account, index) => (
            <div key={index} className="form-group-array">
              <div className="array-header">
                <h4>User Account {index + 1}</h4>
                {formData.userAccounts.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeUserAccount(index)}
                    className="btn btn-sm btn-danger"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={account.username}
                    onChange={(e) => handleUserAccountChange(index, 'username', e.target.value)}
                    placeholder="testuser@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={account.description}
                    onChange={(e) => handleUserAccountChange(index, 'description', e.target.value)}
                    placeholder="e.g., Admin user, Regular user"
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Vulnerabilities */}
        <section className="form-section">
          <div className="section-header">
            <h2>Vulnerabilities</h2>
            <button type="button" onClick={addVulnerability} className="btn btn-sm btn-secondary">
              + Add Vulnerability
            </button>
          </div>

          {formData.vulnerabilities.map((vuln, vulnIndex) => (
            <div key={vulnIndex} className="vulnerability-section">
              <div className="array-header">
                <h3>Vulnerability {vulnIndex + 1}</h3>
                {formData.vulnerabilities.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeVulnerability(vulnIndex)}
                    className="btn btn-sm btn-danger"
                  >
                    Remove Vulnerability
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>Vulnerability Name *</label>
                <input
                  type="text"
                  value={vuln.name}
                  onChange={(e) => handleVulnChange(vulnIndex, 'name', e.target.value)}
                  required
                  placeholder="e.g., SQL Injection in Login Form"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Severity</label>
                  <select
                    value={vuln.severity}
                    onChange={(e) => handleVulnChange(vulnIndex, 'severity', e.target.value)}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Informational">Informational</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <input
                    type="text"
                    value={vuln.priority}
                    onChange={(e) => handleVulnChange(vulnIndex, 'priority', e.target.value)}
                    placeholder="e.g., P1, High, Critical"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>CVSS Score</label>
                  <input
                    type="text"
                    value={vuln.cvssScore}
                    onChange={(e) => handleVulnChange(vulnIndex, 'cvssScore', e.target.value)}
                    placeholder="e.g., 9.8"
                  />
                </div>

                <div className="form-group">
                  <label>CVSS Vector</label>
                  <input
                    type="text"
                    value={vuln.cvssVector}
                    onChange={(e) => handleVulnChange(vulnIndex, 'cvssVector', e.target.value)}
                    placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={vuln.description}
                  onChange={(e) => handleVulnChange(vulnIndex, 'description', e.target.value)}
                  rows="4"
                  placeholder="Detailed description of the vulnerability..."
                />
              </div>

              <div className="form-group">
                <label>Description 1 (Additional Details)</label>
                <textarea
                  value={vuln.description1}
                  onChange={(e) => handleVulnChange(vulnIndex, 'description1', e.target.value)}
                  rows="3"
                  placeholder="Additional context or technical details..."
                />
              </div>

              <div className="form-group">
                <label>Description 2 (Further Details)</label>
                <textarea
                  value={vuln.description2}
                  onChange={(e) => handleVulnChange(vulnIndex, 'description2', e.target.value)}
                  rows="3"
                  placeholder="More details if needed..."
                />
              </div>

              <div className="form-group">
                <label>Impact</label>
                <textarea
                  value={vuln.impact}
                  onChange={(e) => handleVulnChange(vulnIndex, 'impact', e.target.value)}
                  rows="3"
                  placeholder="What could happen if this vulnerability is exploited..."
                />
              </div>

              <div className="form-group">
                <label>Remediation</label>
                <textarea
                  value={vuln.remediation}
                  onChange={(e) => handleVulnChange(vulnIndex, 'remediation', e.target.value)}
                  rows="4"
                  placeholder="How to fix this vulnerability..."
                />
              </div>

              {/* Affected Targets */}
              <div className="form-group-list">
                <div className="list-header">
                  <label>Affected Targets</label>
                  <button 
                    type="button" 
                    onClick={() => addVulnArrayItem(vulnIndex, 'targets')}
                    className="btn btn-sm btn-secondary"
                  >
                    + Add Target
                  </button>
                </div>
                {vuln.targets.map((target, targetIndex) => (
                  <div key={targetIndex} className="list-item">
                    <input
                      type="text"
                      value={target}
                      onChange={(e) => handleVulnArrayChange(vulnIndex, 'targets', targetIndex, e.target.value)}
                      placeholder="Target URL or endpoint"
                    />
                    {vuln.targets.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeVulnArrayItem(vulnIndex, 'targets', targetIndex)}
                        className="btn btn-sm btn-danger"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Parameters */}
              <div className="form-group-list">
                <div className="list-header">
                  <label>Vulnerable Parameters</label>
                  <button 
                    type="button" 
                    onClick={() => addVulnArrayItem(vulnIndex, 'parameters')}
                    className="btn btn-sm btn-secondary"
                  >
                    + Add Parameter
                  </button>
                </div>
                {vuln.parameters.map((param, paramIndex) => (
                  <div key={paramIndex} className="list-item">
                    <input
                      type="text"
                      value={param}
                      onChange={(e) => handleVulnArrayChange(vulnIndex, 'parameters', paramIndex, e.target.value)}
                      placeholder="Parameter name"
                    />
                    {vuln.parameters.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeVulnArrayItem(vulnIndex, 'parameters', paramIndex)}
                        className="btn btn-sm btn-danger"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Methodologies */}
              <div className="form-group-list">
                <div className="list-header">
                  <label>Testing Methodologies</label>
                  <button 
                    type="button" 
                    onClick={() => addVulnArrayItem(vulnIndex, 'methodologies')}
                    className="btn btn-sm btn-secondary"
                  >
                    + Add Methodology
                  </button>
                </div>
                {vuln.methodologies.map((method, methodIndex) => (
                  <div key={methodIndex} className="list-item">
                    <input
                      type="text"
                      value={method}
                      onChange={(e) => handleVulnArrayChange(vulnIndex, 'methodologies', methodIndex, e.target.value)}
                      placeholder="Testing method used"
                    />
                    {vuln.methodologies.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeVulnArrayItem(vulnIndex, 'methodologies', methodIndex)}
                        className="btn btn-sm btn-danger"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => navigate('/dashboard')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditReport;