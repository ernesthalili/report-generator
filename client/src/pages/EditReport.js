import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
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

// ============================================================================
// AI ENHANCEMENT - UTILITY FUNCTIONS (Client-side masking)
// ============================================================================

const PATTERNS = {
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b|\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  url: /\b(?:https?|ftp):\/\/[^\s<>"{}|\\^`\[\]]+\b/g,
  creditCard: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
  phone: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  apiKey: /\b(?:api[_-]?key|token|bearer|auth[_-]?token)[:\s=]+['\"]?([A-Za-z0-9_\-\.]+)['\"]?\b/gi,
  awsAccessKey: /\b(AKIA[0-9A-Z]{16})\b/g,
  awsSecretKey: /\b([A-Za-z0-9/+=]{40})\b/g,
  privateKey: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g,
  password: /\b(?:password|pwd|pass)[:\s=]+['\"]?([^\s'"<>]+)['\"]?\b/gi,
  jwt: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
};

function unmaskText(maskedText, maskMap) {
  if (!maskedText || !maskMap) return maskedText;
  
  let unmaskedText = maskedText;
  
  Object.entries(maskMap).forEach(([token, original]) => {
    unmaskedText = unmaskedText.replace(new RegExp(token, 'g'), original);
  });
  
  return unmaskedText;
}

export default function EditReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fetching, setFetching] = useState(true);
  const [fetchErr, setFetchErr] = useState('');

  // AI Enhancement state for executive summary
  const [enhancingExecSummary, setEnhancingExecSummary] = useState(false);
  const [execSummaryError, setExecSummaryError] = useState(null);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultData, setResultData] = useState(null);

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
    seedForm, update
  } = useReportForm();

  // Fetch existing report once on mount
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await update(id);
    if (ok) navigate('/dashboard');
  };

  const handleSavePrompt = (prompt) => {
    if (!savedPrompts.includes(prompt)) {
      setSavedPrompts(prev => [...prev, prompt]);
    }
  };

  const handleEnhanceExecutiveSummary = async (action, editedMaskedText, customPrompt, maskMap) => {
    setEnhancingExecSummary(true);
    setExecSummaryError(null);

    try {
      const token = localStorage.getItem('token');
      
      const requestBody = {
        text: editedMaskedText,
        action: action
      };

      if (action === 'custom' && customPrompt) {
        requestBody.customPrompt = customPrompt;
      }

      const response = await axios.post(
        '/api/ai/enhance-text',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        const unmaskedResult = unmaskText(response.data.enhanced, maskMap);
        
        setResultData({
          originalText: formData.executive_summary,
          aiResult: unmaskedResult
        });
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      setExecSummaryError(
        error.response?.data?.message || 
        'Failed to enhance text. Please try again.'
      );
      
      setTimeout(() => setExecSummaryError(null), 5000);
    } finally {
      setEnhancingExecSummary(false);
    }
  };

  const handleApplyExecSummaryResult = (editedResult) => {
    handleChange({ target: { name: 'executive_summary', value: editedResult } });
    setShowResultModal(false);
    setResultData(null);
  };

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
      {execSummaryError && <div className="alert alert-error">{execSummaryError}</div>}

      <form onSubmit={handleSubmit} className="report-form">
        <StaticFieldsSection 
          formData={formData} 
          handleChange={handleChange}
          handleTemplateChange={handleTemplateChange}
          onEnhanceExecutiveSummary={handleEnhanceExecutiveSummary}
          isEnhancingExecutiveSummary={enhancingExecSummary}
          savedPrompts={savedPrompts}
          onSavePrompt={handleSavePrompt}
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
          reportId={id}
          handleSaveAsTemplate={saveAsTemplate}
          handleLoadTemplate={loadTemplate}
          moveVulnerability={moveVulnerability}
        />

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* AI Result Modal */}
      {showResultModal && resultData && (
        <AIResultModal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          onApply={handleApplyExecSummaryResult}
          originalText={resultData.originalText}
          aiResult={resultData.aiResult}
        />
      )}
    </div>
  );
}

// AI Result Modal Component
function AIResultModal({ isOpen, onClose, onApply, originalText, aiResult }) {
  const [editedResult, setEditedResult] = React.useState(aiResult);

  React.useEffect(() => {
    if (aiResult) {
      setEditedResult(aiResult);
    }
  }, [aiResult]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(editedResult);
  };

  return ReactDOM.createPortal(
    <div className="template-manager-overlay" onClick={onClose}>
      <div className="ai-enhancement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-manager-header">
          <h2>✨ AI Enhancement Result</h2>
          <button onClick={onClose} className="btn btn-sm btn-secondary">✕ Close</button>
        </div>
        
        <div className="ai-modal-content-wrapper">
          <div className="ai-modal-field">
            <label className="ai-modal-field-label">Original:</label>
            <div className="ai-modal-readonly-text">
              {originalText}
            </div>
          </div>

          <div className="ai-modal-field">
            <label className="ai-modal-field-label">Enhanced (editable):</label>
            <textarea
              className="ai-modal-textarea"
              value={editedResult}
              onChange={(e) => setEditedResult(e.target.value)}
              rows="12"
              placeholder="AI enhanced text..."
            />
          </div>

          <div className="ai-modal-info-box">
            💡 You can edit the enhanced text before applying it
          </div>
        </div>

        <div className="ai-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Discard
          </button>
          <button className="btn btn-primary" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}