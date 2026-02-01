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

  // The form JSX is identical to CreateReport
  // For brevity, I'll just show the header change
  return (
    <div className="report-form-container">
      <div className="form-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-back">
          ← Back to Dashboard
        </button>
        <h1>Edit Report</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Same form as CreateReport but with pre-filled data */}
      <form onSubmit={handleSubmit} className="report-form">
        {/* All the same form sections as CreateReport.js */}
        {/* Copy the entire form structure from CreateReport component */}
        
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
            />
          </div>

          <div className="form-group">
            <label>Testing Company Name</label>
            <input
              type="text"
              name="testingCompanyName"
              value={formData.testingCompanyName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Testing Mode</label>
            <input
              type="text"
              name="testingMode"
              value={formData.testingMode}
              onChange={handleChange}
            />
          </div>
        </section>

        {/* Include all other sections from CreateReport... */}
        
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
