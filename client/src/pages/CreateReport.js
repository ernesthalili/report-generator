import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useReportForm from '../hooks/useReportForm';
import {
  StaticFieldsSection,
  TargetsSection,
  CredentialsSection,
  TestersSection,
  VulnerabilitiesSection
} from '../components/ReportFormSections';
import './ReportForm.css';

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function CreateReport() {
  const navigate = useNavigate();
  // Generate a unique UUID for this new report immediately
  const [reportId] = React.useState(generateUUID());
  const [folderInitialized, setFolderInitialized] = React.useState(false);
  const [initError, setInitError] = React.useState('');

  const {
    formData, loading, error,
    handleChange,
    handleTemplateChange,
    addTarget, removeTarget, handleTargetChange,
    addCredential, removeCredential, handleCredentialChange,
    addTester, removeTester, handleTesterChange,
    addVulnerability, removeVulnerability, duplicateVulnerability, handleVulnChange,
    addVulnArrayItem, removeVulnArrayItem,
    handleEndpointChange, handleAttackChange,
    handleImageUpload, removeAttack,
    saveAsTemplate, loadTemplate,
    moveVulnerability,
    create
  } = useReportForm();

  // Initialize folder structure when component mounts
  React.useEffect(() => {
    const initializeReportFolder = async () => {
      try {
        await axios.post('/api/reports/initialize-folder', { reportId });
        setFolderInitialized(true);
        console.log(`Report folder initialized: report-${reportId}`);
      } catch (err) {
        console.error('Failed to initialize report folder:', err);
        setInitError('Failed to initialize report folder. Please try again.');
      }
    };
    
    initializeReportFolder();
  }, [reportId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!folderInitialized) {
      setInitError('Report folder not initialized. Please refresh and try again.');
      return;
    }
    
    const ok = await create(reportId);
    if (ok) navigate('/dashboard');
  };

  return (
    <div className="report-form-container">
      <div className="form-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-back">← Back to Dashboard</button>
        <h1>Create New Report</h1>
        {!folderInitialized && !initError && (
          <div className="alert alert-info">Initializing report folder...</div>
        )}
      </div>

      {initError && <div className="alert alert-error">{initError}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="report-form">
        <StaticFieldsSection 
          formData={formData} 
          handleChange={handleChange}
          handleTemplateChange={handleTemplateChange}
        />

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
          reportId={reportId}
          handleSaveAsTemplate={saveAsTemplate}
          handleLoadTemplate={loadTemplate}
          moveVulnerability={moveVulnerability}
        />

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading || !folderInitialized}>
            {loading ? 'Creating…' : 'Create Report'}
          </button>
        </div>
      </form>
    </div>
  );
}
