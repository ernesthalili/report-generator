import React, { useState } from 'react';
import ReactDOM from 'react-dom';
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

function maskSensitiveDataClient(text) {
  if (!text || typeof text !== 'string') {
    return { maskedText: text, detectedTypes: [], maskMap: {} };
  }

  let maskedText = text;
  const detectedTypes = new Set();
  const maskMap = {};
  let tokenCounter = 0;

  Object.entries(PATTERNS).forEach(([type, pattern]) => {
    const matches = maskedText.match(pattern);
    
    if (matches && matches.length > 0) {
      detectedTypes.add(type);
      
      matches.forEach((match) => {
        const token = `${type.toUpperCase()}_${tokenCounter}`;
        tokenCounter++;
        maskMap[token] = match;
        const escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        maskedText = maskedText.replace(new RegExp(escapedMatch, 'g'), token);
      });
    }
  });

  return {
    maskedText,
    detectedTypes: Array.from(detectedTypes),
    maskMap
  };
}

function unmaskText(maskedText, maskMap) {
  if (!maskedText || !maskMap) return maskedText;
  
  let unmaskedText = maskedText;
  
  Object.entries(maskMap).forEach(([token, original]) => {
    unmaskedText = unmaskedText.replace(new RegExp(token, 'g'), original);
  });
  
  return unmaskedText;
}

export default function CreateReport() {
  const navigate = useNavigate();
  const [reportId] = React.useState(generateUUID());
  const [folderInitialized, setFolderInitialized] = React.useState(false);
  const [initError, setInitError] = React.useState('');

  // AI Enhancement state for executive summary
  const [enhancingExecSummary, setEnhancingExecSummary] = useState(false);
  const [execSummaryError, setExecSummaryError] = useState(null);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [selectedModel, setSelectedModel] = useState('fast'); // 'fast' | 'powerful' — shared across all AI buttons
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
    addCweReference, removeCweReference, handleCweChange,
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

  const handleSavePrompt = (prompt) => {
    if (!savedPrompts.includes(prompt)) {
      setSavedPrompts(prev => [...prev, prompt]);
    }
  };

  const handleDeletePrompt = (idx) => {
    setSavedPrompts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEnhanceExecutiveSummary = async (action, editedMaskedText, customPrompt, maskMap, model = 'fast') => {
    setEnhancingExecSummary(true);
    setExecSummaryError(null);

    try {
      const token = localStorage.getItem('token');
      
      const requestBody = {
        text: editedMaskedText,
        action: action,
        model: model
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
          aiResult: unmaskedResult,
          modelUsed: response.data.model_used || model
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
          onDeletePrompt={handleDeletePrompt}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
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
          addCweReference={addCweReference}
          removeCweReference={removeCweReference}
          handleCweChange={handleCweChange}
          handleEndpointChange={handleEndpointChange} 
          handleAttackChange={handleAttackChange}
          handleImageUpload={handleImageUpload} 
          removeAttack={removeAttack}
          reportId={reportId}
          handleSaveAsTemplate={saveAsTemplate}
          handleLoadTemplate={loadTemplate}
          moveVulnerability={moveVulnerability}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading || !folderInitialized}>
            {loading ? 'Creating…' : 'Create Report'}
          </button>
        </div>
      </form>

      {/* AI Result Modal - Import from ReportFormSections or define inline */}
      {showResultModal && resultData && (
        <AIResultModal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          onApply={handleApplyExecSummaryResult}
          originalText={resultData.originalText}
          aiResult={resultData.aiResult}
          modelUsed={resultData.modelUsed}
        />
      )}
    </div>
  );
}

// AI Result Modal Component - matches TemplateManager style
function AIResultModal({ isOpen, onClose, onApply, originalText, aiResult, modelUsed }) {
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
          <div className="ai-result-header-left">
            <h2>✨ AI Enhancement Result</h2>
            {modelUsed && (
              <span className={`ai-model-badge ${modelUsed === 'fast' ? 'ai-model-badge--fast' : 'ai-model-badge--powerful'}`}>
                {modelUsed === 'fast' ? '⚡ Fast (8B)' : '🧠 Powerful (70B)'}
              </span>
            )}
          </div>
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
