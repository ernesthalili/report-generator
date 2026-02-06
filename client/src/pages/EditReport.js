import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export default function EditReport() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [fetching, setFetching] = useState(true);   // initial load state
  const [fetchErr,  setFetchErr] = useState('');

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
    seedForm, update
  } = useReportForm();

  // ---------------------------------------------------------------------------
  // Fetch existing report once on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`/api/reports/${id}`);
        seedForm(res.data.data);
      } catch (err) {
        setFetchErr('Failed to load report');
        console.error(err);
      } finally {
        setFetching(false);
      }
    })();
  }, [id, seedForm]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await update(id);
    if (ok) navigate('/dashboard');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (fetching) {
    return (
      <div className="report-form-container">
        <div className="loading-spinner">Loading report…</div>
      </div>
    );
  }

  return (
    <div className="report-form-container">
      <div className="form-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-back">← Back to Dashboard</button>
        <h1>Edit Report</h1>
      </div>

      {(fetchErr || error) && <div className="alert alert-error">{fetchErr || error}</div>}

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
          reportId={id}
          handleSaveAsTemplate={saveAsTemplate}
          handleLoadTemplate={loadTemplate}
        />

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}