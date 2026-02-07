import React, { useState } from 'react';
import CVSSCalculator from './CVSSCalculator';

// ---------------------------------------------------------------------------
// Small reusable primitives
// ---------------------------------------------------------------------------

/**
 * Endpoints section - structured with index, http_method, path, parameter
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
      {endpoints.map((endpoint, idx) => (
        <div key={idx} className="list-item endpoint-item" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            value={endpoint.index || idx + 1}
            onChange={(e) => handleEndpointChange(vulnIndex, idx, 'index', parseInt(e.target.value) || 1)}
            placeholder="#"
            className="endpoint-index"
            style={{ width: '5px', flexShrink: 0 }}
          />
          <select
            value={endpoint.http_method || ''}
            onChange={(e) => handleEndpointChange(vulnIndex, idx, 'http_method', e.target.value)}
            className="http-method-select"
            style={{ width: '110px', flexShrink: 0 }}
          >
            <option value="">Method</option>
            {httpMethods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="text"
            value={endpoint.path || ''}
            onChange={(e) => handleEndpointChange(vulnIndex, idx, 'path', e.target.value)}
            placeholder="e.g., /api/login"
            className="endpoint-path"
            style={{ flex: '2', minWidth: '150px' }}
          />
          <input
            type="text"
            value={endpoint.parameter || ''}
            onChange={(e) => handleEndpointChange(vulnIndex, idx, 'parameter', e.target.value)}
            placeholder="e.g., username"
            className="endpoint-parameter"
            style={{ flex: '1', minWidth: '120px' }}
          />
          {endpoints.length > 1 && (
            <button
              type="button"
              onClick={() => removeVulnArrayItem(vulnIndex, 'endpoints', idx)}
              className="btn btn-sm btn-danger"
              style={{ flexShrink: 0 }}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Attacks section - can be text or image with caption
 */
function AttacksSection({ vulnIndex, vuln, handlers, reportId }) {
  const { addVulnArrayItem, removeAttack, handleAttackChange, handleImageUpload } = handlers;
  const attacks = vuln.attacks || [];

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleImageUpload(vulnIndex, e.target.files, reportId);
      e.target.value = ''; // Reset input
    }
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
      {attacks.map((attack, idx) => (
        <div key={idx} className="list-item attack-item">
          <div className="attack-type-row">
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
              className="btn btn-sm btn-danger"
            >
              ×
            </button>
          </div>
          
          {attack.type === 'text' ? (
            <textarea
              value={attack.text || ''}
              onChange={(e) => handleAttackChange(vulnIndex, idx, 'text', e.target.value)}
              placeholder="Describe the attack or payload used..."
              rows="3"
              className="attack-text"
            />
          ) : (
            <div className="attack-image-fields">
              <input
                type="text"
                value={attack.image || ''}
                onChange={(e) => handleAttackChange(vulnIndex, idx, 'image', e.target.value)}
                placeholder="Image filename (e.g., screenshot.png)"
                className="attack-image-path"
              />
              {attack.image && (
                <img 
                  src={attack.image} 
                  alt={`Attack proof ${idx + 1}`}
                  className="image-thumbnail"
                  style={{ maxWidth: '200px', maxHeight: '150px', marginTop: '8px' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <input
                type="text"
                value={attack.caption || ''}
                onChange={(e) => handleAttackChange(vulnIndex, idx, 'caption', e.target.value)}
                placeholder="Image caption"
                className="attack-image-caption"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported section components
// ---------------------------------------------------------------------------

/** Static fields: project info + client + dates + executive summary + revisioner + approver */
export function StaticFieldsSection({ formData, handleChange }) {
  return (
    <section className="form-section">
      <h2>Project Information</h2>

      <div className="form-group">
        <label>Project Name *</label>
        <input type="text" name="projectName" value={formData.projectName}
          onChange={handleChange} required placeholder="e.g., ABC Corp Web Application Assessment" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Client Name</label>
          <input type="text" name="client_name" value={formData.client_name}
            onChange={handleChange} placeholder="Client / target company name" />
        </div>

        <div className="form-group">
          <label>Testing Company Name</label>
          <input type="text" name="testing_company_name" value={formData.testing_company_name}
            onChange={handleChange} placeholder="Your company name" />
        </div>
      </div>

      <div className="form-group">
        <label>Testing Mode</label>
        <input type="text" name="testing_mode" value={formData.testing_mode}
          onChange={handleChange} placeholder="e.g., Black-box, White-box, Grey-box" />
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

        <div className="form-group">
          <label>Testing Duration</label>
          <input type="text" name="testing_duration" value={formData.testing_duration}
            onChange={handleChange} placeholder="e.g., 10 days, 2 weeks" />
        </div>
      </div>

      <div className="form-group">
        <label>Executive Summary</label>
        <textarea name="executive_summary" value={formData.executive_summary}
          onChange={handleChange} rows="5"
          placeholder="High-level summary of the engagement, scope, and key findings…" />
      </div>

      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Review & Approval</h3>

      <div className="form-row">
        <div className="form-group">
          <label>Revisioner Name</label>
          <input type="text" name="revisioner_name" value={formData.revisioner_name}
            onChange={handleChange} placeholder="e.g., Jane Doe" />
        </div>

        <div className="form-group">
          <label>Revisioner Role</label>
          <input type="text" name="revisioner_role" value={formData.revisioner_role}
            onChange={handleChange} placeholder="e.g., Lead Security Analyst" />
        </div>

        <div className="form-group">
          <label>Revisioner Date</label>
          <input type="date" name="revisioner_date" value={formData.revisioner_date}
            onChange={handleChange} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Approver Name</label>
          <input type="text" name="approver_name" value={formData.approver_name}
            onChange={handleChange} placeholder="e.g., John Smith" />
        </div>

        <div className="form-group">
          <label>Approver Date</label>
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
        <div key={index} className="form-group-array">
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
                placeholder="https://example.com" />
            </div>
            <div className="form-group">
              <label>Severity</label>
              <input type="text" value={target.severity}
                onChange={(e) => handleTargetChange(index, 'severity', e.target.value)}
                placeholder="e.g., Critica, Alta, Media, Bassa" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Dynamic: Credentials list (formerly User Accounts) */
export function CredentialsSection({ formData, addCredential, removeCredential, handleCredentialChange }) {
  return (
    <section className="form-section">
      <div className="section-header">
        <h2>Test Credentials</h2>
        <button type="button" onClick={addCredential} className="btn btn-sm btn-secondary">+ Add Credential</button>
      </div>

      {formData.credentials.map((cred, index) => (
        <div key={index} className="form-group-array">
          <div className="array-header">
            <h4>Credential {index + 1}</h4>
            {formData.credentials.length > 1 && (
              <button type="button" onClick={() => removeCredential(index)} className="btn btn-sm btn-danger">Remove</button>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={cred.username}
                onChange={(e) => handleCredentialChange(index, 'username', e.target.value)}
                placeholder="testuser@example.com" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input type="text" value={cred.description}
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
        <div key={index} className="form-group-array">
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

/** Dynamic: Vulnerabilities list */
export function VulnerabilitiesSection({
  formData,
  addVulnerability, removeVulnerability, duplicateVulnerability, handleVulnChange,
  addVulnArrayItem, removeVulnArrayItem,
  handleEndpointChange, handleAttackChange,
  handleImageUpload, removeAttack,
  reportId,
  handleSaveAsTemplate,
  handleLoadTemplate,
  moveVulnerability
}) {
  const [collapsedVulns, setCollapsedVulns] = useState({});

  const toggleCollapse = (index) => {
    setCollapsedVulns(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleCVSSUpdate = (vulnIndex, { score, severity, vector }) => {
    // Update all three fields together
    // We need to batch these updates to avoid conflicts
    handleVulnChange(vulnIndex, 'cvss_score', score);
    handleVulnChange(vulnIndex, 'severity', severity);
    handleVulnChange(vulnIndex, 'cvss_vector', vector);
  };

  const handlers = { 
    addVulnArrayItem, removeVulnArrayItem,
    handleEndpointChange, handleAttackChange,
    handleImageUpload, removeAttack
  };

  return (
    <section className="form-section">
      <div className="section-header">
        <h2>Vulnerabilities</h2>
        <button type="button" onClick={addVulnerability} className="btn btn-sm btn-secondary">+ Add Vulnerability</button>
      </div>

      {formData.vulnerabilities.map((vuln, vi) => (
        <div key={vi} className="vulnerability-section">
          <div className="array-header">
            <div className="vuln-header-left">
              <button
                type="button"
                onClick={() => toggleCollapse(vi)}
                className="btn-collapse"
                title={collapsedVulns[vi] ? "Expand" : "Collapse"}
              >
                {collapsedVulns[vi] ? '▶' : '▼'}
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
                <button type="button" onClick={() => removeVulnerability(vi)} className="btn btn-sm btn-danger">Remove</button>
              )}
            </div>
          </div>

          {!collapsedVulns[vi] && (
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

              {/* description */}
              <div className="form-group">
                <label>Description</label>
                <textarea value={vuln.description} rows="4"
                  onChange={(e) => handleVulnChange(vi, 'description', e.target.value)}
                  placeholder="Detailed description of the vulnerability…" />
              </div>

              {/* impact */}
              <div className="form-group">
                <label>Impact</label>
                <textarea value={vuln.impact} rows="3"
                  onChange={(e) => handleVulnChange(vi, 'impact', e.target.value)}
                  placeholder="What could happen if exploited…" />
              </div>

              {/* remediation */}
              <div className="form-group">
                <label>Remediation</label>
                <textarea value={vuln.remediation} rows="4"
                  onChange={(e) => handleVulnChange(vi, 'remediation', e.target.value)}
                  placeholder="How to fix this vulnerability…" />
              </div>

              {/* Internal Notes - not exported */}
              <div className="form-group">
                <label>Internal Notes <span style={{ fontSize: '0.85em', color: '#666' }}>(Not included in final report)</span></label>
                <textarea value={vuln.internal_notes || ''} rows="3"
                  onChange={(e) => handleVulnChange(vi, 'internal_notes', e.target.value)}
                  placeholder="Personal notes, testing details, or any information for internal use only…"
                  style={{ borderColor: '#ffa500', backgroundColor: '#fffbf0' }} />
              </div>

              {/* Endpoints section */}
              <EndpointsSection vulnIndex={vi} vuln={vuln} handlers={handlers} />
              
              {/* Attacks section (text and images) */}
              <AttacksSection vulnIndex={vi} vuln={vuln} handlers={handlers} reportId={reportId} />
            </>
          )}
        </div>
      ))}
    </section>
  );
}