import React from 'react';
import { useNavigate } from 'react-router-dom';
import useReportForm from '../hooks/useReportForm';
import {
  StaticFieldsSection,
  TargetsSection,
  UserAccountsSection,
  VulnerabilitiesSection
} from '../components/ReportFormSections';
import './ReportForm.css';

export default function CreateReport() {
  const navigate = useNavigate();

  const {
    formData, loading, error,
    handleChange,
    addTarget, removeTarget, handleTargetChange,
    addUserAccount, removeUserAccount, handleUserAccountChange,
    addVulnerability, removeVulnerability, handleVulnChange,
    addVulnArrayItem, removeVulnArrayItem, handleVulnArrayChange,
    handleMethodologyChange, handleImageUpload, removeImage,
    create
  } = useReportForm();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await create();
    if (ok) navigate('/dashboard');
  };

  return (
    <div className="report-form-container">
      <div className="form-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-back">← Back to Dashboard</button>
        <h1>Create New Report</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="report-form">
        <StaticFieldsSection formData={formData} handleChange={handleChange} />

        <TargetsSection
          formData={formData}
          addTarget={addTarget} removeTarget={removeTarget} handleTargetChange={handleTargetChange}
        />

        <UserAccountsSection
          formData={formData}
          addUserAccount={addUserAccount} removeUserAccount={removeUserAccount} handleUserAccountChange={handleUserAccountChange}
        />

        <VulnerabilitiesSection
          formData={formData}
          addVulnerability={addVulnerability} removeVulnerability={removeVulnerability} handleVulnChange={handleVulnChange}
          addVulnArrayItem={addVulnArrayItem} removeVulnArrayItem={removeVulnArrayItem} handleVulnArrayChange={handleVulnArrayChange}
          handleMethodologyChange={handleMethodologyChange} handleImageUpload={handleImageUpload} removeImage={removeImage}
        />

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create Report'}
          </button>
        </div>
      </form>
    </div>
  );
}