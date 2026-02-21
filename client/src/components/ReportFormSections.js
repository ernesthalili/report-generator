import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import CVSSCalculator from './CVSSCalculator';
import TemplateSelector from './TemplateSelector';
import axios from 'axios';
import { cweIdToRef, fetchCweTitle } from '../hooks/useReportForm';
import './AIEnhancement.css';

// ============================================================================
// AI ENHANCEMENT - UTILITY FUNCTIONS (Client-side masking)
// ============================================================================

/**
 * Client-side masking patterns (must match backend)
 */
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

/**
 * Client-side mask function for preview
 */
function maskSensitiveDataClient(text) {
  if (!text || typeof text !== 'string') {
    return { maskedText: text, detectedTypes: [], maskMap: {} };
  }

  let maskedText = text;
  const detectedTypes = new Set();
  const maskMap = {}; // token -> original value
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

/**
 * Client-side unmask function to restore original values
 */
function unmaskText(maskedText, maskMap) {
  if (!maskedText || !maskMap) return maskedText;
  
  let unmaskedText = maskedText;
  
  // Replace each token with its original value
  Object.entries(maskMap).forEach(([token, original]) => {
    unmaskedText = unmaskedText.replace(new RegExp(token, 'g'), original);
  });
  
  return unmaskedText;
}

// ============================================================================
// AI RESULT MODAL - Show and edit AI output before applying
// ============================================================================

/**
 * Modal showing AI result with side-by-side comparison
 */
/**
 * AI Result Modal - matches TemplateManager style
 */
function AIResultModal({ isOpen, onClose, onApply, originalText, aiResult, modelUsed }) {
  const [editedResult, setEditedResult] = useState(aiResult);

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

// ============================================================================
// AI ENHANCEMENT PREVIEW MODAL
// ============================================================================

/**
 * Modal showing masked text preview before sending to AI
 */
/**
 * AI Preview Modal - matches TemplateManager style
 */
function AIPreviewModal({ isOpen, onClose, onConfirm, originalText, maskedText, detectedTypes, action, customPrompt }) {
  const [editedMaskedText, setEditedMaskedText] = useState(maskedText);
  const [editedCustomPrompt, setEditedCustomPrompt] = useState(customPrompt || '');

  React.useEffect(() => {
    setEditedMaskedText(maskedText);
  }, [maskedText]);

  React.useEffect(() => {
    setEditedCustomPrompt(customPrompt || '');
  }, [customPrompt]);

  if (!isOpen) return null;

  const actionLabels = {
    grammar: 'Fix Grammar',
    professional: 'Make Professional',
    technical: 'Add Technical Details',
    custom: 'Custom Prompt'
  };

  const handleConfirm = () => {
    onConfirm(editedMaskedText, action === 'custom' ? editedCustomPrompt : customPrompt);
  };

  return ReactDOM.createPortal(
    <div className="template-manager-overlay" onClick={onClose}>
      <div className="ai-enhancement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-manager-header">
          <h2>🔒 Confirm AI Enhancement</h2>
          <button onClick={onClose} className="btn btn-sm btn-secondary">✕ Close</button>
        </div>
        
        <div className="ai-modal-content-wrapper">
          <div className="ai-modal-field">
            <label className="ai-modal-field-label">Action:</label>
            <div className="ai-modal-field-value">{actionLabels[action] || action}</div>
          </div>

          {action === 'custom' && (
            <div className="ai-modal-field">
              <label className="ai-modal-field-label">Custom Instruction: <span className="ai-modal-editable-hint">(editable)</span></label>
              <textarea
                className="ai-modal-textarea ai-modal-textarea--compact"
                value={editedCustomPrompt}
                onChange={(e) => setEditedCustomPrompt(e.target.value)}
                rows="3"
                placeholder="Enter your custom instruction..."
              />
            </div>
          )}

          <div className="ai-modal-field">
            <label className="ai-modal-field-label">Original text:</label>
            <div className="ai-modal-readonly-text">
              {originalText}
            </div>
          </div>

          <div className="ai-modal-field">
            <label className="ai-modal-field-label">Text to send to AI (editable):</label>
            <textarea
              className="ai-modal-textarea"
              value={editedMaskedText}
              onChange={(e) => setEditedMaskedText(e.target.value)}
              rows="10"
              placeholder="Enter text to enhance..."
            />
          </div>

          {detectedTypes && detectedTypes.length > 0 && (
            <div className="ai-modal-info-box">
              ℹ️ Sensitive data detected and masked: {detectedTypes.length} type(s)
            </div>
          )}
        </div>

        <div className="ai-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleConfirm}
            disabled={!editedMaskedText.trim()}
          >
            Send to AI
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// AI ENHANCEMENT BUTTON WITH DROPDOWN
// ============================================================================

/**
 * Button with dropdown menu for AI enhancement actions
 */
function AIEnhanceButton({ text, onEnhance, disabled, savedPrompts, onSavePrompt, onDeletePrompt, selectedModel, onModelChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showSavedPrompts, setShowSavedPrompts] = useState(false);

  const handleActionSelect = (action, customPromptText = '') => {
    setIsOpen(false);
    setShowCustomInput(false);
    
    // Generate preview with mask map
    const { maskedText, detectedTypes, maskMap } = maskSensitiveDataClient(text);
    
    setPreviewData({
      action,
      originalText: text,
      maskedText,
      detectedTypes,
      customPrompt: customPromptText,
      maskMap // Store for unmasking later
    });
    
    setShowPreview(true);
  };

  const handleCustomSelect = () => {
    setIsOpen(false);
    setShowCustomInput(true);
  };

  const handleCustomSubmit = () => {
    if (customPrompt.trim()) {
      handleActionSelect('custom', customPrompt);
      setCustomPrompt('');
    }
  };

  const handleSavedPromptSelect = (prompt) => {
    setShowSavedPrompts(false);
    handleActionSelect('custom', prompt);
  };

  const handleConfirmEnhance = (editedMaskedText, customPromptText) => {
    setShowPreview(false);
    if (previewData) {
      onEnhance(previewData.action, editedMaskedText, customPromptText, previewData.maskMap, selectedModel);
      
      // Save custom prompt if provided and not already saved
      if (customPromptText && !savedPrompts.includes(customPromptText)) {
        onSavePrompt(customPromptText);
      }
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewData(null);
  };

  const handleCancelCustom = () => {
    setShowCustomInput(false);
    setCustomPrompt('');
  };

  const isDisabled = disabled || !text || text.trim().length === 0;

  return (
    <>
      {/* ── Micro-toolbar ── */}
      <div className={`ai-toolbar${isDisabled ? ' ai-toolbar--disabled' : ''}`}>

        {/* Model toggle: blue=fast, violet=powerful */}
        <div className="ai-toolbar-model">
          <button
            type="button"
            className={`ai-toolbar-model-btn${selectedModel === 'fast' ? ' ai-toolbar-model-btn--active-fast' : ''}`}
            onClick={() => !isDisabled && onModelChange('fast')}
            disabled={isDisabled}
            title="Fast — Llama 3.1 8B"
          >⚡ Fast</button>
          <button
            type="button"
            className={`ai-toolbar-model-btn${selectedModel === 'powerful' ? ' ai-toolbar-model-btn--active-powerful' : ''}`}
            onClick={() => !isDisabled && onModelChange('powerful')}
            disabled={isDisabled}
            title="Powerful — Llama 3.3 70B"
          >🧠 Powerful</button>
        </div>

        {/* Divider */}
        <span className="ai-toolbar-sep" />

        {/* Action buttons */}
        <button type="button" className="ai-toolbar-action" onClick={() => !isDisabled && handleActionSelect('grammar')}    disabled={isDisabled} title="Fix Grammar">✓ Grammar</button>
        <button type="button" className="ai-toolbar-action" onClick={() => !isDisabled && handleActionSelect('professional')} disabled={isDisabled} title="Make Professional">📝 Pro</button>
        <button type="button" className="ai-toolbar-action" onClick={() => !isDisabled && handleActionSelect('technical')}   disabled={isDisabled} title="Add Technical Details">🔧 Technical</button>

        {/* Divider */}
        <span className="ai-toolbar-sep" />

        {/* Custom */}
        <button type="button" className="ai-toolbar-action" onClick={() => !isDisabled && handleCustomSelect()} disabled={isDisabled} title="Custom prompt">✏️ Custom</button>

        {/* Saved prompts */}
        {savedPrompts.length > 0 && (
          <div className="ai-toolbar-saved-wrap">
            <button
              type="button"
              className={`ai-toolbar-action${showSavedPrompts ? ' ai-toolbar-action--active' : ''}`}
              onClick={() => !isDisabled && setShowSavedPrompts(!showSavedPrompts)}
              disabled={isDisabled}
              title={`Saved prompts (${savedPrompts.length})`}
            >💾 {savedPrompts.length}</button>

            {showSavedPrompts && (
              <div className="ai-toolbar-saved-list">
                <div className="ai-toolbar-saved-header">
                  <span>Saved prompts</span>
                  <button type="button" className="ai-toolbar-saved-close" onClick={() => setShowSavedPrompts(false)}>×</button>
                </div>
                {savedPrompts.map((prompt, idx) => (
                  <div key={idx} className="ai-toolbar-saved-row">
                    <button type="button" className="ai-toolbar-saved-item" onClick={() => handleSavedPromptSelect(prompt)} title={prompt}>
                      {prompt.length > 44 ? prompt.substring(0, 44) + '…' : prompt}
                    </button>
                    <button
                      type="button"
                      className="ai-toolbar-saved-delete"
                      onClick={(e) => { e.stopPropagation(); onDeletePrompt(idx); }}
                      title="Delete this prompt"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom prompt panel — between toolbar and field textarea */}
      {showCustomInput && (
        <div className="ai-custom-prompt-input">
          <span className="ai-custom-prompt-label">✏️ Custom instruction</span>
          <textarea
            value={customPrompt}
            onChange={(e) => {
              setCustomPrompt(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
            }}
            placeholder="e.g. 'Make this more concise' or 'Add OWASP references'"
            rows="1"
            autoFocus
          />
          <div className="ai-custom-prompt-actions">
            <button type="button" className="btn btn-sm btn-secondary" onClick={handleCancelCustom}>Cancel</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleCustomSubmit} disabled={!customPrompt.trim()}>Continue</button>
          </div>
        </div>
      )}

      {previewData && (
        <AIPreviewModal
          isOpen={showPreview}
          onClose={handleClosePreview}
          onConfirm={handleConfirmEnhance}
          originalText={previewData.originalText}
          maskedText={previewData.maskedText}
          detectedTypes={previewData.detectedTypes}
          action={previewData.action}
          customPrompt={previewData.customPrompt}
        />
      )}
    </>
  );
}

// ============================================================================
// ATTACKS SECTION WITH AI ENHANCEMENT
// ============================================================================

/**
 * Attacks section - text blocks now have AI enhancement
 */
function AttacksSection({ vulnIndex, vuln, handlers, reportId, selectedModel, onModelChange }) {
  const { addVulnArrayItem, removeAttack, handleAttackChange, handleImageUpload } = handlers;
  const attacks = vuln.attacks || [];
  
  // State for AI enhancement
  const [enhancing, setEnhancing] = useState({}); // attackIdx -> boolean
  const [enhanceError, setEnhanceError] = useState(null);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [currentAttackIndex, setCurrentAttackIndex] = useState(null);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleImageUpload(vulnIndex, e.target.files, reportId);
      e.target.value = '';
    }
  };

  const handleSavePrompt = (prompt) => {
    if (!savedPrompts.includes(prompt)) {
      setSavedPrompts(prev => [...prev, prompt]);
    }
  };

  const handleDeletePrompt = (idx) => {
    setSavedPrompts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEnhanceAttack = async (attackIdx, action, editedMaskedText, customPrompt, maskMap, model = 'fast') => {
    const enhanceKey = `${vulnIndex}-${attackIdx}`;
    setEnhancing(prev => ({ ...prev, [enhanceKey]: true }));
    setEnhanceError(null);
    setCurrentAttackIndex(attackIdx);

    try {
      const token = localStorage.getItem('token');
      
      // Prepare request body based on action type
      const requestBody = {
        text: editedMaskedText,
        action: action,
        model: model
      };

      // Add custom prompt if provided
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
        // Unmask the AI result
        const unmaskedResult = unmaskText(response.data.enhanced, maskMap);
        
        // Show result modal instead of directly applying
        setResultData({
          originalText: attacks[attackIdx].text,
          aiResult: unmaskedResult,
          attackIndex: attackIdx,
          modelUsed: response.data.model_used || model
        });
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      setEnhanceError(
        error.response?.data?.message || 
        'Failed to enhance text. Please try again.'
      );
      
      setTimeout(() => setEnhanceError(null), 5000);
    } finally {
      setEnhancing(prev => ({ ...prev, [enhanceKey]: false }));
    }
  };

  const handleApplyResult = (editedResult) => {
    if (resultData && resultData.attackIndex !== null) {
      handleAttackChange(vulnIndex, resultData.attackIndex, 'text', editedResult);
      setShowResultModal(false);
      setResultData(null);
      setCurrentAttackIndex(null);
    }
  };

  const handleCloseResultModal = () => {
    setShowResultModal(false);
    setResultData(null);
    setCurrentAttackIndex(null);
  };

  return (
    <div className="form-group-list">
      <div className="list-header">
        <label>Attacks / Proof of Concept</label>
        <div>
          <button
            type="button"
            onClick={() => addVulnArrayItem(vulnIndex, 'attacks')}
            className="btn btn-sm btn-secondary"
            style={{ marginRight: '8px' }}
          >
            + Add Text
          </button>
          <label className="btn btn-sm btn-secondary file-upload-btn" style={{ marginBottom: 0 }}>
            📁 Upload Images
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {enhanceError && (
        <div className="ai-error-message">
          ⚠️ {enhanceError}
        </div>
      )}

      {/* AI Result Modal */}
      {resultData && (
        <AIResultModal
          isOpen={showResultModal}
          onClose={handleCloseResultModal}
          onApply={handleApplyResult}
          originalText={resultData.originalText}
          aiResult={resultData.aiResult}
          modelUsed={resultData.modelUsed}
        />
      )}

      {attacks.map((attack, idx) => {
        const enhanceKey = `${vulnIndex}-${idx}`;
        const isEnhancing = enhancing[enhanceKey] || false;

        return (
          <div key={idx} className="list-item attack-item">

            {/* ── TEXT layout: [1/8 type+del] [7/8 textarea + AI button] ── */}
            {(attack.type === 'text' || !attack.type) ? (
              <div className="attack-text-layout">
                <div className="attack-ctrl-col">
                  <select
                    value={attack.type || 'text'}
                    onChange={(e) => handleAttackChange(vulnIndex, idx, 'type', e.target.value)}
                    className="attack-type-select"
                  >
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeAttack(vulnIndex, idx)}
                    className="btn btn-sm btn-danger attack-del-btn"
                  >
                    ×
                  </button>
                </div>
                
                <div className="attack-text-container">
                  <textarea
                    value={attack.text || ''}
                    onChange={(e) => handleAttackChange(vulnIndex, idx, 'text', e.target.value)}
                    placeholder="Describe the attack or payload used..."
                    rows="4"
                    className="attack-text-area"
                    disabled={isEnhancing}
                  />
                  
                  <div className="attack-ai-controls">
                    <AIEnhanceButton
                      text={attack.text}
                      onEnhance={(action, editedText, customPrompt, maskMap, model) => handleEnhanceAttack(idx, action, editedText, customPrompt, maskMap, model)}
                      disabled={isEnhancing}
                      savedPrompts={savedPrompts}
                      onSavePrompt={handleSavePrompt}
                      onDeletePrompt={handleDeletePrompt}
                      selectedModel={selectedModel}
                      onModelChange={onModelChange}
                    />
                    
                    {isEnhancing && (
                      <span className="ai-enhancing-indicator">
                        ✨ Enhancing...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ── IMAGE layout: [1/8 type+del] [4/8 preview] [3/8 caption+path] ── */
              <div className="attack-image-layout">
                <div className="attack-ctrl-col">
                  <select
                    value={attack.type}
                    onChange={(e) => handleAttackChange(vulnIndex, idx, 'type', e.target.value)}
                    className="attack-type-select"
                  >
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeAttack(vulnIndex, idx)}
                    className="btn btn-sm btn-danger attack-del-btn"
                  >
                    ×
                  </button>
                </div>

                <div className="attack-preview-col">
                  {attack.image ? (
                    <img
                      src={attack.image}
                      alt={`Proof ${idx + 1}`}
                      className="attack-image-thumb"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="attack-preview-empty">No image yet</div>
                  )}
                </div>

                <div className="attack-meta-col">
                  <label className="attack-meta-label">Caption</label>
                  <input
                    type="text"
                    value={attack.caption || ''}
                    onChange={(e) => handleAttackChange(vulnIndex, idx, 'caption', e.target.value)}
                    placeholder="Brief description of this proof"
                    className="attack-caption-input"
                  />
                  <label className="attack-meta-label" style={{ marginTop: '8px' }}>Image Path</label>
                  <input
                    type="text"
                    value={attack.image || ''}
                    onChange={(e) => handleAttackChange(vulnIndex, idx, 'image', e.target.value)}
                    placeholder="/uploads/report-xxx/vuln-xxx/file.png"
                    className="attack-path-input"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// ENDPOINTS SECTION (unchanged)
// ============================================================================

/**
 * Endpoints section - ID, HTTP Method, Path, Parameter
 */
function EndpointsSection({ vulnIndex, vuln, handlers }) {
  const { addVulnArrayItem, removeVulnArrayItem, handleEndpointChange } = handlers;
  const endpoints = vuln.endpoints || [];
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  return (
    <div className="form-group-list">
      <div className="list-header">
        <label>Affected Endpoints</label>
        <button
          type="button"
          onClick={() => addVulnArrayItem(vulnIndex, 'endpoints')}
          className="btn btn-sm btn-secondary"
        >
          + Add Endpoint
        </button>
      </div>

      {endpoints.length > 0 && (
        <div className="endpoint-header-row">
          <span className="ep-col-id">ID</span>
          <span className="ep-col-method">HTTP Method</span>
          <span className="ep-col-path">Path</span>
          <span className="ep-col-param">Parameter</span>
          <span className="ep-col-del" />
        </div>
      )}

      {endpoints.map((endpoint, idx) => (
        <div key={idx} className="endpoint-row">
          <input
            type="number"
            value={endpoint.index || idx + 1}
            onChange={(e) => handleEndpointChange(vulnIndex, idx, 'index', parseInt(e.target.value) || 1)}
            placeholder="1"
            className="ep-col-id"
          />
          <select
            value={endpoint.http_method || ''}
            onChange={(e) => handleEndpointChange(vulnIndex, idx, 'http_method', e.target.value)}
            className="ep-col-method"
          >
            <option value="">— Method —</option>
            {httpMethods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="text"
            value={endpoint.path || ''}
            onChange={(e) => handleEndpointChange(vulnIndex, idx, 'path', e.target.value)}
            placeholder="/api/example"
            className="ep-col-path"
          />
          <input
            type="text"
            value={endpoint.parameter || ''}
            onChange={(e) => handleEndpointChange(vulnIndex, idx, 'parameter', e.target.value)}
            placeholder="e.g., username"
            className="ep-col-param"
          />
          <div className="ep-col-del">
            {endpoints.length > 1 && (
              <button
                type="button"
                onClick={() => removeVulnArrayItem(vulnIndex, 'endpoints', idx)}
                className="btn btn-sm btn-danger"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// TOP-LEVEL SECTIONS
// ============================================================================

/** Static: Basic fields */
export function StaticFieldsSection({ 
  formData, 
  handleChange, 
  handleTemplateChange,
  onEnhanceExecutiveSummary,
  isEnhancingExecutiveSummary,
  savedPrompts,
  onSavePrompt,
  onDeletePrompt,
  selectedModel,
  onModelChange
}) {
  return (
    <section className="form-section">
      <h2>Basic Information</h2>

      {/* Template Selection */}
      <TemplateSelector
        selectedTemplateId={formData.template}
        onTemplateChange={handleTemplateChange}
      />

      <div className="form-group">
        <label>Project Name *</label>
        <input type="text" name="projectName" value={formData.projectName} required
          onChange={handleChange} placeholder="e.g., ACME Corp Security Assessment" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Client Name</label>
          <input type="text" name="client_name" value={formData.client_name}
            onChange={handleChange} placeholder="e.g., ACME Corporation" />
        </div>
        <div className="form-group">
          <label>Testing Company Name</label>
          <input type="text" name="testing_company_name" value={formData.testing_company_name}
            onChange={handleChange} placeholder="e.g., SecureTest Inc." />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Testing Mode</label>
          <input type="text" name="testing_mode" value={formData.testing_mode}
            onChange={handleChange} placeholder="e.g., Black Box, White Box, Gray Box" />
        </div>
        <div className="form-group">
          <label>Testing Duration</label>
          <input type="text" name="testing_duration" value={formData.testing_duration}
            onChange={handleChange} placeholder="e.g., 2 weeks" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Testing Start Date</label>
          <input type="date" name="testing_start_date" value={formData.testing_start_date}
            onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Testing End Date</label>
          <input type="date" name="testing_end_date" value={formData.testing_end_date}
            onChange={handleChange} />
        </div>
      </div>

      <div className="form-group">
        <div className="form-group-header-with-ai">
          <label>Executive Summary</label>
          <div className="ai-controls-inline">
            <AIEnhanceButton
              text={formData.executive_summary}
              onEnhance={onEnhanceExecutiveSummary}
              disabled={isEnhancingExecutiveSummary}
              savedPrompts={savedPrompts}
              onSavePrompt={onSavePrompt}
              onDeletePrompt={onDeletePrompt}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
            />
            
            {isEnhancingExecutiveSummary && (
              <span className="ai-enhancing-indicator">
                ✨ Enhancing...
              </span>
            )}
          </div>
        </div>
        <textarea 
          name="executive_summary" 
          value={formData.executive_summary} 
          rows="6"
          onChange={handleChange} 
          placeholder="High-level overview of the assessment results…"
          disabled={isEnhancingExecutiveSummary}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Revisioner Name</label>
          <input type="text" name="revisioner_name" value={formData.revisioner_name}
            onChange={handleChange} placeholder="e.g., John Doe" />
        </div>
        <div className="form-group">
          <label>Revisioner Role</label>
          <input type="text" name="revisioner_role" value={formData.revisioner_role}
            onChange={handleChange} placeholder="e.g., Senior Analyst" />
        </div>
        <div className="form-group">
          <label>Revision Date</label>
          <input type="date" name="revisioner_date" value={formData.revisioner_date}
            onChange={handleChange} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Approver Name</label>
          <input type="text" name="approver_name" value={formData.approver_name}
            onChange={handleChange} placeholder="e.g., Jane Smith" />
        </div>
        <div className="form-group">
          <label>Approval Date</label>
          <input type="date" name="approver_date" value={formData.approver_date}
            onChange={handleChange} />
        </div>
      </div>
    </section>
  );
}

/** Dynamic: Targets list */
export function TargetsSection({ formData, addTarget, removeTarget, handleTargetChange }) {
  return (
    <section className="form-section">
      <div className="section-header">
        <h2>Targets</h2>
        <button type="button" onClick={addTarget} className="btn btn-sm btn-secondary">+ Add Target</button>
      </div>

      {formData.targets.map((target, index) => (
        <div key={index} className="array-item">
          <div className="array-header">
            <h4>Target {index + 1}</h4>
            {formData.targets.length > 1 && (
              <button type="button" onClick={() => removeTarget(index)} className="btn btn-sm btn-danger">Remove</button>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={target.name}
                onChange={(e) => handleTargetChange(index, 'name', e.target.value)}
                placeholder="e.g., Main Web Application" />
            </div>
            <div className="form-group">
              <label>URL</label>
              <input type="text" value={target.url}
                onChange={(e) => handleTargetChange(index, 'url', e.target.value)}
                placeholder="e.g., https://example.com" />
            </div>
            <div className="form-group">
              <label>Severity Level</label>
              <input type="text" value={target.severity}
                onChange={(e) => handleTargetChange(index, 'severity', e.target.value)}
                placeholder="e.g., High" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Dynamic: Credentials list */
export function CredentialsSection({ formData, addCredential, removeCredential, handleCredentialChange }) {
  return (
    <section className="form-section">
      <div className="section-header">
        <h2>Credentials</h2>
        <button type="button" onClick={addCredential} className="btn btn-sm btn-secondary">+ Add Credential</button>
      </div>

      {formData.credentials.map((credential, index) => (
        <div key={index} className="array-item">
          <div className="array-header">
            <h4>Credential {index + 1}</h4>
            {formData.credentials.length > 1 && (
              <button type="button" onClick={() => removeCredential(index)} className="btn btn-sm btn-danger">Remove</button>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={credential.username}
                onChange={(e) => handleCredentialChange(index, 'username', e.target.value)}
                placeholder="e.g., testuser@example.com" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input type="text" value={credential.description}
                onChange={(e) => handleCredentialChange(index, 'description', e.target.value)}
                placeholder="e.g., Admin account for testing" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Dynamic: Testers list */
export function TestersSection({ formData, addTester, removeTester, handleTesterChange }) {
  return (
    <section className="form-section">
      <div className="section-header">
        <h2>Testers</h2>
        <button type="button" onClick={addTester} className="btn btn-sm btn-secondary">+ Add Tester</button>
      </div>

      {formData.testers.map((tester, index) => (
        <div key={index} className="array-item">
          <div className="array-header">
            <h4>Tester {index + 1}</h4>
            {formData.testers.length > 1 && (
              <button type="button" onClick={() => removeTester(index)} className="btn btn-sm btn-danger">Remove</button>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={tester.name}
                onChange={(e) => handleTesterChange(index, 'name', e.target.value)}
                placeholder="e.g., Alice Johnson" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input type="text" value={tester.role}
                onChange={(e) => handleTesterChange(index, 'role', e.target.value)}
                placeholder="e.g., Penetration Tester" />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={tester.date}
                onChange={(e) => handleTesterChange(index, 'date', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Scope */
export function ScopeSection({ formData, handleScopeChange, addScopeItem, removeScopeItem }) {
  return (
    <section className="form-section">
      <h2>Scope</h2>
      
      <div className="form-group-list">
        <div className="list-header">
          <label>In-Scope Items</label>
          <button type="button" onClick={() => addScopeItem('in_scope')} className="btn btn-sm btn-secondary">
            + Add Item
          </button>
        </div>
        
        {(formData.scope?.in_scope || []).map((item, idx) => (
          <div key={idx} className="list-item">
            <input
              type="text"
              value={item}
              onChange={(e) => handleScopeChange('in_scope', idx, e.target.value)}
              placeholder="e.g., https://example.com"
              className="list-input"
            />
            <button type="button" onClick={() => removeScopeItem('in_scope', idx)} className="btn btn-sm btn-danger">
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="form-group-list">
        <div className="list-header">
          <label>Out-of-Scope Items</label>
          <button type="button" onClick={() => addScopeItem('out_of_scope')} className="btn btn-sm btn-secondary">
            + Add Item
          </button>
        </div>
        
        {(formData.scope?.out_of_scope || []).map((item, idx) => (
          <div key={idx} className="list-item">
            <input
              type="text"
              value={item}
              onChange={(e) => handleScopeChange('out_of_scope', idx, e.target.value)}
              placeholder="e.g., Production database"
              className="list-input"
            />
            <button type="button" onClick={() => removeScopeItem('out_of_scope', idx)} className="btn btn-sm btn-danger">
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Methodology */
export function MethodologySection({ formData, handleMethodologyChange, addMethodologyItem, removeMethodologyItem }) {
  return (
    <section className="form-section">
      <h2>Methodology</h2>
      
      <div className="form-group-list">
        <div className="list-header">
          <label>Testing Phases</label>
          <button type="button" onClick={addMethodologyItem} className="btn btn-sm btn-secondary">
            + Add Phase
          </button>
        </div>
        
        {(formData.methodology || []).map((item, idx) => (
          <div key={idx} className="list-item">
            <input
              type="text"
              value={item}
              onChange={(e) => handleMethodologyChange(idx, e.target.value)}
              placeholder="e.g., Reconnaissance & Information Gathering"
              className="list-input"
            />
            <button type="button" onClick={() => removeMethodologyItem(idx)} className="btn btn-sm btn-danger">
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Vulnerabilities - with AI enhancement for description field */
export function VulnerabilitiesSection({
  formData,
  addVulnerability,
  removeVulnerability,
  duplicateVulnerability,
  handleVulnChange,
  addVulnArrayItem,
  removeVulnArrayItem,
  addCweReference,
  removeCweReference,
  handleCweChange,
  handleEndpointChange,
  handleAttackChange,
  handleImageUpload,
  removeAttack,
  reportId,
  handleSaveAsTemplate,
  handleLoadTemplate,
  moveVulnerability,
  selectedModel,
  onModelChange
}) {
  // expandedVulns: only entries explicitly set to true are expanded.
  // Default {} means every vulnerability starts collapsed.
  const [expandedVulns, setExpandedVulns] = useState({});
  
  // AI enhancement state for descriptions, impact, and remediation
  const [enhancingDesc, setEnhancingDesc] = useState({});
  const [enhancingImpact, setEnhancingImpact] = useState({});
  const [enhancingRemediation, setEnhancingRemediation] = useState({});
  const [enhanceError, setEnhanceError] = useState(null);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [currentVulnIndex, setCurrentVulnIndex] = useState(null);
  const [currentFieldType, setCurrentFieldType] = useState(null); // 'description', 'impact', 'remediation'

  const toggleCollapse = (index) => {
    setExpandedVulns(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // CVSS Update handler
  const handleCVSSUpdate = (vulnIndex, { score, severity, vector }) => {
    handleVulnChange(vulnIndex, 'cvss_score', score);
    handleVulnChange(vulnIndex, 'severity', severity);
    handleVulnChange(vulnIndex, 'cvss_vector', vector);
  };

  // Confirmation before removing vulnerability
  const handleRemoveVulnerability = (index) => {
    const vuln = formData.vulnerabilities[index];
    const vulnName = vuln.name || 'this vulnerability';
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${vulnName}"?\n\n` +
      `This will permanently remove:\n` +
      `• The vulnerability data\n` +
      `• All associated images and files\n\n` +
      `This action cannot be undone.`
    );
    
    if (confirmed) {
      removeVulnerability(index);
    }
  };

  const handleSavePrompt = (prompt) => {
    if (!savedPrompts.includes(prompt)) {
      setSavedPrompts(prev => [...prev, prompt]);
    }
  };

  const handleDeletePrompt = (idx) => {
    setSavedPrompts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEnhanceDescription = async (vulnIndex, action, editedMaskedText, customPrompt, maskMap, model = 'fast') => {
    setEnhancingDesc(prev => ({ ...prev, [vulnIndex]: true }));
    setEnhanceError(null);
    setCurrentVulnIndex(vulnIndex);
    setCurrentFieldType('description');

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
        
        const newResultData = {
          originalText: formData.vulnerabilities[vulnIndex].description,
          aiResult: unmaskedResult,
          vulnIndex: vulnIndex,
          fieldType: 'description',
          modelUsed: response.data.model_used || model
        };
        
        setResultData(newResultData);
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      setEnhanceError(
        error.response?.data?.message || 
        'Failed to enhance text. Please try again.'
      );
      
      setTimeout(() => setEnhanceError(null), 5000);
    } finally {
      setEnhancingDesc(prev => ({ ...prev, [vulnIndex]: false }));
    }
  };

  const handleEnhanceImpact = async (vulnIndex, action, editedMaskedText, customPrompt, maskMap, model = 'fast') => {
    setEnhancingImpact(prev => ({ ...prev, [vulnIndex]: true }));
    setEnhanceError(null);
    setCurrentVulnIndex(vulnIndex);
    setCurrentFieldType('impact');

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
          originalText: formData.vulnerabilities[vulnIndex].impact,
          aiResult: unmaskedResult,
          vulnIndex: vulnIndex,
          fieldType: 'impact',
          modelUsed: response.data.model_used || model
        });
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      setEnhanceError(
        error.response?.data?.message || 
        'Failed to enhance text. Please try again.'
      );
      
      setTimeout(() => setEnhanceError(null), 5000);
    } finally {
      setEnhancingImpact(prev => ({ ...prev, [vulnIndex]: false }));
    }
  };

  const handleEnhanceRemediation = async (vulnIndex, action, editedMaskedText, customPrompt, maskMap, model = 'fast') => {
    setEnhancingRemediation(prev => ({ ...prev, [vulnIndex]: true }));
    setEnhanceError(null);
    setCurrentVulnIndex(vulnIndex);
    setCurrentFieldType('remediation');

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
          originalText: formData.vulnerabilities[vulnIndex].remediation,
          aiResult: unmaskedResult,
          vulnIndex: vulnIndex,
          fieldType: 'remediation',
          modelUsed: response.data.model_used || model
        });
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      setEnhanceError(
        error.response?.data?.message || 
        'Failed to enhance text. Please try again.'
      );
      
      setTimeout(() => setEnhanceError(null), 5000);
    } finally {
      setEnhancingRemediation(prev => ({ ...prev, [vulnIndex]: false }));
    }
  };

  const handleApplyResult = (editedResult) => {
    if (resultData && resultData.vulnIndex !== null && resultData.fieldType) {
      handleVulnChange(resultData.vulnIndex, resultData.fieldType, editedResult);
      setShowResultModal(false);
      setResultData(null);
      setCurrentVulnIndex(null);
      setCurrentFieldType(null);
    }
  };

  const handleCloseResultModal = () => {
    setShowResultModal(false);
    setResultData(null);
    setCurrentVulnIndex(null);
  };

  // Create handlers object for child components
  const handlers = {
    addVulnArrayItem,
    removeVulnArrayItem,
    handleEndpointChange,
    handleAttackChange,
    handleImageUpload,
    removeAttack
  };

  return (
    <section className="form-section">
      <div className="section-header">
        <h2>Vulnerabilities</h2>
        <button type="button" onClick={addVulnerability} className="btn btn-sm btn-secondary">+ Add Vulnerability</button>
      </div>

      {enhanceError && (
        <div className="ai-error-message">
          ⚠️ {enhanceError}
        </div>
      )}

      {/* AI Result Modal */}
      {resultData && (
        <AIResultModal
          isOpen={showResultModal}
          onClose={handleCloseResultModal}
          onApply={handleApplyResult}
          originalText={resultData.originalText}
          aiResult={resultData.aiResult}
          modelUsed={resultData.modelUsed}
        />
      )}

      {formData.vulnerabilities.map((vuln, vi) => {
        const isEnhancingDesc = enhancingDesc[vi] || false;

        return (
          <div key={vi} className="vulnerability-section">
            <div className="array-header">
              <div className="vuln-header-left">
                <button
                  type="button"
                  onClick={() => toggleCollapse(vi)}
                  className="btn-collapse"
                  title={expandedVulns[vi] ? "Collapse" : "Expand"}
                >
                  {expandedVulns[vi] ? '▼' : '▶'}
                </button>
                <h3>Vulnerability {vi + 1}: {vuln.name || 'Untitled'}</h3>
                {vuln.severity && (
                  <span className={`severity-badge severity-${vuln.severity.toLowerCase()}`}>
                    {vuln.severity}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {vi > 0 && (
                  <button
                    type="button"
                    onClick={() => moveVulnerability && moveVulnerability(vi, 'up')}
                    className="btn btn-sm btn-secondary"
                    title="Move up"
                  >
                    ▲
                  </button>
                )}
                {vi < formData.vulnerabilities.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveVulnerability && moveVulnerability(vi, 'down')}
                    className="btn btn-sm btn-secondary"
                    title="Move down"
                  >
                    ▼
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => handleSaveAsTemplate && handleSaveAsTemplate(vi)} 
                  className="btn btn-sm btn-success"
                  title="Save as template"
                >
                  💾 Save as Template
                </button>
                <button 
                  type="button" 
                  onClick={() => handleLoadTemplate && handleLoadTemplate(vi)} 
                  className="btn btn-sm btn-info"
                  title="Load from template"
                >
                  📋 Load Template
                </button>
                <button 
                  type="button" 
                  onClick={() => duplicateVulnerability && duplicateVulnerability(vi)} 
                  className="btn btn-sm btn-secondary"
                  title="Duplicate this vulnerability"
                >
                  📋 Duplicate
                </button>
                {formData.vulnerabilities.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveVulnerability(vi)} 
                    className="btn btn-sm btn-danger"
                    title="Delete this vulnerability"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {expandedVulns[vi] && (
              <>
                {/* name */}
                <div className="form-group">
                  <label>Vulnerability Name *</label>
                  <input type="text" value={vuln.name} required
                    onChange={(e) => handleVulnChange(vi, 'name', e.target.value)}
                    placeholder="e.g., SQL Injection in Login Form" />
                </div>

                {/* CVSS Calculator */}
                <CVSSCalculator
                  initialVector={vuln.cvss_vector}
                  initialScore={vuln.cvss_score}
                  onScoreUpdate={(data) => handleCVSSUpdate(vi, data)}
                />

                {/* severity + priority */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Severity</label>
                    <input type="text" value={vuln.severity}
                      onChange={(e) => handleVulnChange(vi, 'severity', e.target.value)}
                      placeholder="e.g., Critica, Alta, Media, Bassa, Informativa" />
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <input type="text" value={vuln.priority}
                      onChange={(e) => handleVulnChange(vi, 'priority', e.target.value)}
                      placeholder="e.g., P1" />
                  </div>
                </div>

                {/* OWASP Category */}
                <div className="form-group">
                  <label>OWASP Top 10 Category</label>
                  <select value={vuln.owasp_category || ''} 
                    onChange={(e) => handleVulnChange(vi, 'owasp_category', e.target.value)}>
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
                    <option value="Other">Other (Custom Category)</option>
                  </select>
                  {vuln.owasp_category === 'Other' && (
                    <input 
                      type="text" 
                      value={vuln.owasp_custom || ''}
                      onChange={(e) => handleVulnChange(vi, 'owasp_custom', e.target.value)}
                      placeholder="Enter custom category"
                      style={{ marginTop: '8px' }}
                    />
                  )}
                </div>

                {/* CVSS */}
                <div className="form-row">
                  <div className="form-group">
                    <label>CVSS Score</label>
                    <input type="text" value={vuln.cvss_score}
                      onChange={(e) => handleVulnChange(vi, 'cvss_score', e.target.value)}
                      placeholder="e.g., 9.8" />
                  </div>
                  <div className="form-group">
                    <label>CVSS Vector</label>
                    <input type="text" value={vuln.cvss_vector}
                      onChange={(e) => handleVulnChange(vi, 'cvss_vector', e.target.value)}
                      placeholder="CVSS:3.1/AV:N/AC:L/…" />
                  </div>
                </div>

                {/* description WITH AI ENHANCEMENT */}
                <div className="form-group">
                  <div className="form-group-header-with-ai">
                    <label>Description</label>
                    <div className="ai-controls-inline">
                      <AIEnhanceButton
                        text={vuln.description}
                        onEnhance={(action, editedText, customPrompt, maskMap, model) => handleEnhanceDescription(vi, action, editedText, customPrompt, maskMap, model)}
                        disabled={isEnhancingDesc}
                        savedPrompts={savedPrompts}
                        onSavePrompt={handleSavePrompt}
                        onDeletePrompt={handleDeletePrompt}
                        selectedModel={selectedModel}
                        onModelChange={onModelChange}
                      />
                      
                      {isEnhancingDesc && (
                        <span className="ai-enhancing-indicator">
                          ✨ Enhancing...
                        </span>
                      )}
                    </div>
                  </div>
                  <textarea 
                    value={vuln.description} 
                    rows="4"
                    onChange={(e) => handleVulnChange(vi, 'description', e.target.value)}
                    placeholder="Detailed description of the vulnerability…"
                    disabled={isEnhancingDesc}
                  />
                </div>

                {/* impact WITH AI ENHANCEMENT */}
                <div className="form-group">
                  <div className="form-group-header-with-ai">
                    <label>Impact</label>
                    <div className="ai-controls-inline">
                      <AIEnhanceButton
                        text={vuln.impact}
                        onEnhance={(action, editedText, customPrompt, maskMap, model) => handleEnhanceImpact(vi, action, editedText, customPrompt, maskMap, model)}
                        disabled={enhancingImpact[vi]}
                        savedPrompts={savedPrompts}
                        onSavePrompt={handleSavePrompt}
                        onDeletePrompt={handleDeletePrompt}
                        selectedModel={selectedModel}
                        onModelChange={onModelChange}
                      />
                      
                      {enhancingImpact[vi] && (
                        <span className="ai-enhancing-indicator">
                          ✨ Enhancing...
                        </span>
                      )}
                    </div>
                  </div>
                  <textarea 
                    value={vuln.impact} 
                    rows="3"
                    onChange={(e) => handleVulnChange(vi, 'impact', e.target.value)}
                    placeholder="What could happen if exploited…"
                    disabled={enhancingImpact[vi]}
                  />
                </div>

                {/* remediation WITH AI ENHANCEMENT */}
                <div className="form-group">
                  <div className="form-group-header-with-ai">
                    <label>Remediation</label>
                    <div className="ai-controls-inline">
                      <AIEnhanceButton
                        text={vuln.remediation}
                        onEnhance={(action, editedText, customPrompt, maskMap, model) => handleEnhanceRemediation(vi, action, editedText, customPrompt, maskMap, model)}
                        disabled={enhancingRemediation[vi]}
                        savedPrompts={savedPrompts}
                        onSavePrompt={handleSavePrompt}
                        onDeletePrompt={handleDeletePrompt}
                        selectedModel={selectedModel}
                        onModelChange={onModelChange}
                      />
                      
                      {enhancingRemediation[vi] && (
                        <span className="ai-enhancing-indicator">
                          ✨ Enhancing...
                        </span>
                      )}
                    </div>
                  </div>
                  <textarea 
                    value={vuln.remediation} 
                    rows="4"
                    onChange={(e) => handleVulnChange(vi, 'remediation', e.target.value)}
                    placeholder="How to fix this vulnerability…"
                    disabled={enhancingRemediation[vi]}
                  />
                </div>

                {/* CWE References */}
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ marginBottom: 0 }}>CWE References</label>
                    <button type="button" onClick={() => addCweReference(vi)} className="btn btn-sm btn-secondary">
                      + Add CWE
                    </button>
                  </div>
                  {(vuln.cwe_references || []).length === 0 && (
                    <p style={{ fontSize: '0.85em', color: '#888', margin: '4px 0 0' }}>
                      No CWE references added yet.
                    </p>
                  )}
                  {(vuln.cwe_references || []).map((cwe, ci) => (
                    <div key={ci} style={{ marginBottom: '8px', padding: '10px', background: '#f5f8ff', border: '1px solid #d0dff8', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Number input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <span style={{ fontWeight: '600', whiteSpace: 'nowrap', fontSize: '0.9em' }}>CWE-</span>
                          <input
                            type="text"
                            value={cwe.cwe_id || ''}
                            onChange={(e) => handleCweChange(vi, ci, 'cwe_id', e.target.value)}
                            onBlur={async (e) => {
                              const id = e.target.value.replace(/\D/g, '');
                              if (!id) return;
                              // Auto-generate URL from number
                              handleCweChange(vi, ci, 'cwe_url', `https://cwe.mitre.org/data/definitions/${id}.html`);
                              // Only auto-fetch title if name field is still empty
                              if (cwe.cwe_name && cwe.cwe_name.trim() !== '') return;
                              const ref = await fetchCweTitle(id);
                              handleCweChange(vi, ci, 'cwe_name', ref.cwe_name);
                            }}
                            placeholder="e.g. 89"
                            style={{ width: '70px' }}
                            title="CWE number"
                          />
                        </div>
                        {/* Editable name input */}
                        <input
                          type="text"
                          value={cwe.cwe_name || ''}
                          onChange={(e) => handleCweChange(vi, ci, 'cwe_name', e.target.value)}
                          placeholder="CWE name (auto-filled or type manually)"
                          style={{ flex: 1 }}
                          title="CWE name – auto-filled from MITRE when number is entered, editable"
                        />
                        {/* MITRE link */}
                        {cwe.cwe_url && (
                          <a
                            href={cwe.cwe_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-secondary"
                            title="Open MITRE CWE page"
                            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                          >
                            🔗 MITRE
                          </a>
                        )}
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeCweReference(vi, ci)}
                          className="btn btn-sm btn-danger"
                          title="Remove CWE reference"
                          style={{ flexShrink: 0 }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Internal Notes - not exported */}
                <div className="form-group">
                  <label>Internal Notes <span style={{ fontSize: '0.85em', color: '#666' }}>(Not included in final report)</span></label>
                  <textarea value={vuln.internal_notes || ''} rows="3"
                    onChange={(e) => handleVulnChange(vi, 'internal_notes', e.target.value)}
                    placeholder="Personal notes, testing details, or any information for internal use only…"
                    style={{ borderColor: '#ffa500', backgroundColor: '#fffbf0', color: '#333' }} />
                </div>

                {/* Endpoints section */}
                <EndpointsSection vulnIndex={vi} vuln={vuln} handlers={handlers} />
                
                {/* Attacks section (with AI enhancement for text blocks) */}
                <AttacksSection vulnIndex={vi} vuln={vuln} handlers={handlers} reportId={reportId} selectedModel={selectedModel} onModelChange={onModelChange} />
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
