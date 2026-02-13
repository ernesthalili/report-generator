import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import CVSSCalculator from './CVSSCalculator';
import './TemplateManager.css';

// ---------------------------------------------------------------------------
// Conflict Resolution Modal
// ---------------------------------------------------------------------------
const ConflictModal = ({ conflicts, onResolve, onCancel }) => {
  const [renames, setRenames] = useState(() => {
    const init = {};
    conflicts.forEach((t, i) => { init[i] = t.name + ' (imported)'; });
    return init;
  });
  const [errors, setErrors] = useState({});

  const handleRenameChange = (idx, value) => {
    setRenames(prev => ({ ...prev, [idx]: value }));
    if (errors[idx]) setErrors(prev => ({ ...prev, [idx]: '' }));
  };

  const handleConfirm = () => {
    const newErrors = {};
    conflicts.forEach((_, i) => {
      if (!renames[i] || !renames[i].trim()) {
        newErrors[i] = 'Name cannot be empty';
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onResolve(renames);
  };

  return (
    <div className="conflict-modal-overlay">
      <div className="conflict-modal">
        <div className="conflict-modal-header">
          <h3>⚠️ Name Conflicts Detected</h3>
          <p>
            {conflicts.length} template{conflicts.length > 1 ? 's' : ''} already exist
            with the same name. Please rename {conflicts.length > 1 ? 'them' : 'it'} to continue.
          </p>
        </div>
        <div className="conflict-modal-body">
          {conflicts.map((t, i) => (
            <div key={i} className="conflict-item">
              <div className="conflict-original">
                <span className="conflict-label">Existing name:</span>
                <span className="conflict-name">"{t.name}"</span>
              </div>
              <div className="conflict-rename">
                <label>New name for import:</label>
                <input
                  type="text"
                  value={renames[i] || ''}
                  onChange={e => handleRenameChange(i, e.target.value)}
                  className={errors[i] ? 'input-error' : ''}
                  placeholder="Enter a new name..."
                  autoFocus={i === 0}
                />
                {errors[i] && <span className="field-error">{errors[i]}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="conflict-modal-footer">
          <button onClick={onCancel} className="btn btn-sm btn-secondary">
            Cancel Import
          </button>
          <button onClick={handleConfirm} className="btn btn-sm btn-primary">
            Confirm &amp; Import
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main TemplateManager Component
// ---------------------------------------------------------------------------
const TemplateManager = ({ onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [pendingImport, setPendingImport] = useState(null);
  const fileInputRef = useRef(null);

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

  useEffect(() => { loadTemplates(); }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

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
    if (selectionMode) return;
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
    setFormData(prev => ({ ...prev, cvss_score: score, severity, cvss_vector: vector }));
  };

  const handleSaveTemplate = async () => {
    try {
      if (!formData.name.trim()) { alert('Template name is required'); return; }
      if (selectedTemplate) {
        await axios.put('/api/vulnerability-templates/' + selectedTemplate._id, formData);
        showSuccess('Template updated successfully');
      } else {
        await axios.post('/api/vulnerability-templates', formData);
        showSuccess('Template created successfully');
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
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await axios.delete('/api/vulnerability-templates/' + templateId);
      showSuccess('Template deleted successfully');
      await loadTemplates();
      if (selectedTemplate?._id === templateId) { setSelectedTemplate(null); resetForm(); }
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
    setFormData({ name: '', severity: '', priority: '', cvss_score: '', cvss_vector: '', description: '', impact: '', remediation: '', owasp_category: '' });
  };

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    setSelectedIds(new Set());
    setSelectedTemplate(null);
  };

  const toggleSelectId = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === templates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(templates.map(t => t._id)));
    }
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  const handleExport = async () => {
    try {
      const idsParam = selectionMode && selectedIds.size > 0
        ? '?ids=' + [...selectedIds].join(',')
        : '';

      const res = await axios.get('/api/vulnerability-templates/export' + idsParam, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'vulnerability-templates-' + Date.now() + '.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      const count = selectionMode && selectedIds.size > 0 ? selectedIds.size : templates.length;
      showSuccess('Exported ' + count + ' template' + (count !== 1 ? 's' : '') + ' successfully');
    } catch (err) {
      alert('Failed to export templates');
      console.error(err);
    }
  };

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------
  const handleImportClick = () => { fileInputRef.current?.click(); };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      setImporting(true);
      const text = await file.text();
      let parsed;

      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        alert('Invalid JSON file. Please upload a valid template export file.');
        setImporting(false);
        return;
      }

      const incoming = Array.isArray(parsed) ? parsed : parsed?.templates;
      if (!Array.isArray(incoming) || incoming.length === 0) {
        alert('No templates found in the file.');
        setImporting(false);
        return;
      }

      const checkRes = await axios.post('/api/vulnerability-templates/import/check', {
        templates: incoming
      });

      const checked = checkRes.data.data;
      const conflicting = checked.filter(t => t.hasConflict);

      if (conflicting.length > 0) {
        setPendingImport(checked);
        setConflicts(conflicting);
      } else {
        await doImport(checked);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process import file');
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  const handleConflictResolve = async (renames) => {
    let renameIdx = 0;
    const resolved = pendingImport.map(t => {
      if (t.hasConflict) {
        const newName = renames[renameIdx++];
        return { ...t, name: newName.trim(), hasConflict: false };
      }
      return t;
    });

    setConflicts([]);
    setPendingImport(null);
    await doImport(resolved);
  };

  const handleConflictCancel = () => {
    setConflicts([]);
    setPendingImport(null);
    showSuccess('Import cancelled');
  };

  const doImport = async (templatesToImport) => {
    try {
      setImporting(true);
      const clean = templatesToImport.map(({ hasConflict, ...rest }) => rest);
      const res = await axios.post('/api/vulnerability-templates/import', { templates: clean });
      const { created, skipped, failed } = res.data.data;

      let msg = 'Imported ' + created + ' template' + (created !== 1 ? 's' : '');
      if (skipped.length) msg += ', ' + skipped.length + ' skipped';
      if (failed.length) msg += ', ' + failed.length + ' failed';
      showSuccess(msg);
      await loadTemplates();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to import templates');
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const exportCount = selectionMode && selectedIds.size > 0 ? selectedIds.size : templates.length;
  const allSelected = templates.length > 0 && selectedIds.size === templates.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return ReactDOM.createPortal(
    <div className="template-manager-overlay">
      <div className="template-manager">

        {/* Header */}
        <div className="template-manager-header">
          <h2>Vulnerability Templates</h2>
          <div className="header-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              onClick={handleImportClick}
              className="btn btn-sm btn-outline-primary"
              disabled={importing}
              title="Import templates from a JSON file"
            >
              {importing ? '⏳ Importing…' : '📥 Import'}
            </button>
            <button
              onClick={handleExport}
              className="btn btn-sm btn-outline-primary"
              disabled={templates.length === 0}
              title={selectionMode && selectedIds.size > 0
                ? 'Export ' + selectedIds.size + ' selected'
                : 'Export all ' + templates.length}
            >
              📤 Export{selectionMode && selectedIds.size > 0
                ? ' (' + selectedIds.size + ')'
                : ' all (' + templates.length + ')'}
            </button>
            <button
              onClick={toggleSelectionMode}
              className={'btn btn-sm ' + (selectionMode ? 'btn-primary' : 'btn-outline-secondary')}
              disabled={templates.length === 0}
              title="Toggle selection mode to pick templates for export"
            >
              {selectionMode ? '✓ Done Selecting' : '☑ Select'}
            </button>
            <button onClick={onClose} className="btn btn-sm btn-secondary">✕ Close</button>
          </div>
        </div>

        {/* Alerts */}
        {error && <div className="alert alert-error">{error}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        <div className="template-manager-content">

          {/* Sidebar */}
          <div className="templates-sidebar">
            <div className="sidebar-header">
              <div className="sidebar-title-row">
                <h3>Saved Templates</h3>
                {selectionMode && templates.length > 0 && (
                  <button className="btn-link" onClick={toggleSelectAll}>
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>
              {!selectionMode && (
                <button onClick={handleNewTemplate} className="btn btn-sm btn-primary">
                  + New Template
                </button>
              )}
              {selectionMode && (
                <div className="selection-hint">
                  {selectedIds.size === 0
                    ? 'Check templates to select for export'
                    : selectedIds.size + ' selected'}
                </div>
              )}
            </div>

            {loading ? (
              <div className="loading-spinner">Loading…</div>
            ) : templates.length === 0 ? (
              <div className="empty-state">
                <p>No templates yet. Create or import your first one!</p>
              </div>
            ) : (
              <div className="templates-list">
                {templates.map(template => (
                  <div
                    key={template._id}
                    className={
                      'template-item' +
                      (selectedTemplate?._id === template._id ? ' active' : '') +
                      (selectionMode ? ' selectable' : '') +
                      (selectedIds.has(template._id) ? ' checked' : '')
                    }
                    onClick={() => handleSelectTemplate(template)}
                  >
                    {selectionMode && (
                      <input
                        type="checkbox"
                        className="template-checkbox"
                        checked={selectedIds.has(template._id)}
                        onChange={e => toggleSelectId(template._id, e)}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                    <div className="template-item-body">
                      <div className="template-item-header">
                        <span className="template-name">{template.name}</span>
                        <span className={'template-severity severity-' + template.severity.toLowerCase()}>
                          {template.severity}
                        </span>
                      </div>
                      <div className="template-item-footer">
                        <small>{new Date(template.updatedAt).toLocaleDateString()}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="template-editor">
            {selectedTemplate || isEditing ? (
              <>
                <div className="editor-header">
                  <h3>{selectedTemplate ? (isEditing ? 'Edit Template' : 'Template Details') : 'New Template'}</h3>
                  <div className="editor-actions">
                    {selectedTemplate && !isEditing && (
                      <>
                        <button onClick={() => setIsEditing(true)} className="btn btn-sm btn-secondary">✏️ Edit</button>
                        <button onClick={() => handleDeleteTemplate(selectedTemplate._id)} className="btn btn-sm btn-danger">🗑️ Delete</button>
                      </>
                    )}
                    {isEditing && (
                      <>
                        <button onClick={handleSaveTemplate} className="btn btn-sm btn-primary">💾 Save</button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            if (selectedTemplate) { handleSelectTemplate(selectedTemplate); }
                            else { setSelectedTemplate(null); resetForm(); }
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
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., SQL Injection Template" disabled={!isEditing} required />
                  </div>

                  {isEditing && (
                    <CVSSCalculator initialVector={formData.cvss_vector} initialScore={formData.cvss_score} onScoreUpdate={handleCVSSUpdate} />
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Severity</label>
                      <input type="text" name="severity" value={formData.severity} onChange={handleInputChange} placeholder="Critica, Alta, Media, Bassa" disabled={!isEditing} />
                    </div>
                    <div className="form-group">
                      <label>Priority</label>
                      <input type="text" name="priority" value={formData.priority} onChange={handleInputChange} placeholder="e.g., P1" disabled={!isEditing} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>CVSS Score</label>
                      <input type="text" name="cvss_score" value={formData.cvss_score} onChange={handleInputChange} placeholder="e.g., 9.8" disabled={!isEditing} />
                    </div>
                    <div className="form-group">
                      <label>CVSS Vector</label>
                      <input type="text" name="cvss_vector" value={formData.cvss_vector} onChange={handleInputChange} placeholder="CVSS:3.1/AV:N/AC:L/..." disabled={!isEditing} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>OWASP Top 10 Category</label>
                    <select name="owasp_category" value={formData.owasp_category} onChange={handleInputChange} disabled={!isEditing}>
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
                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" placeholder="Detailed description of the vulnerability..." disabled={!isEditing} />
                  </div>

                  <div className="form-group">
                    <label>Impact</label>
                    <textarea name="impact" value={formData.impact} onChange={handleInputChange} rows="3" placeholder="What could happen if exploited..." disabled={!isEditing} />
                  </div>

                  <div className="form-group">
                    <label>Remediation</label>
                    <textarea name="remediation" value={formData.remediation} onChange={handleInputChange} rows="4" placeholder="How to fix this vulnerability..." disabled={!isEditing} />
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                {selectionMode
                  ? <p>Select templates on the left to include them in your export, then click <strong>Export</strong>.</p>
                  : <p>Select a template to view or edit, or create a new one.</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {conflicts.length > 0 && (
        <ConflictModal
          conflicts={conflicts}
          onResolve={handleConflictResolve}
          onCancel={handleConflictCancel}
        />
      )}
    </div>,
    document.body
  );
};

export default TemplateManager;
