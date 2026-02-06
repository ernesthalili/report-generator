import React from 'react';
import { useNavigate } from 'react-router-dom';
import useReportForm from '../hooks/useReportForm';
import {
  StaticFieldsSection,
  TargetsSection,
  CredentialsSection,
  TestersSection,
  VulnerabilitiesSection
} from '../components/ReportFormSections';
import './ReportForm.css';

export default function CreateReport() {
  const navigate = useNavigate();
  // Generate a unique temp ID for this new report
  const [tempReportId] = React.useState(`temp-${Date.now()}`);

  const {
    formData, loading, error,
    handleChange,
    addTarget, removeTarget, handleTargetChange,
    addCredential, removeCredential, handleCredentialChange,
    addTester, removeTester, handleTesterChange,
    addVulnerability, removeVulnerability, duplicateVulnerability, handleVulnChange,
    addVulnArrayItem, removeVulnArrayItem,
    handleEndpointChange, handleAttackChange,
    handleImageUpload, removeAttack,
    saveAsTemplate, loadTemplate,
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

        <CredentialsSection
          formData={formData}
          addCredential={addCredential} removeCredential={removeCredential} handleCredentialChange={handleCredentialChange}
        />

        <TestersSection
          formData={formData}
          addTester={addTester} removeTester={removeTester} handleTesterChange={handleTesterChange}
        />

        <VulnerabilitiesSection
          formData={formData}
          addVulnerability={addVulnerability} 
          removeVulnerability={removeVulnerability}
          duplicateVulnerability={duplicateVulnerability}
          handleVulnChange={handleVulnChange}
          addVulnArrayItem={addVulnArrayItem} 
          removeVulnArrayItem={removeVulnArrayItem}
          handleEndpointChange={handleEndpointChange} 
          handleAttackChange={handleAttackChange}
          handleImageUpload={handleImageUpload} 
          removeAttack={removeAttack}
          reportId={tempReportId}
          handleSaveAsTemplate={saveAsTemplate}
          handleLoadTemplate={loadTemplate}
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