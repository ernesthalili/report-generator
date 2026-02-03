import React from 'react';

// ---------------------------------------------------------------------------
// Small reusable primitives
// ---------------------------------------------------------------------------

/**
 * A labelled add/remove string-array list inside a vulnerability.
 *   vulnIndex  – which vulnerability
 *   field      – key name (urls | parameters | methodologies | attacks | images)
 *   label      – human-readable section heading
 *   placeholder
 */
function VulnSubArray({ vulnIndex, field, label, placeholder, vuln, handlers }) {
  const { addVulnArrayItem, removeVulnArrayItem, handleVulnArrayChange } = handlers;
  const items = vuln[field];

  return (
    <div className="form-group-list">
      <div className="list-header">
        <label>{label}</label>
        <button
          type="button"
          onClick={() => addVulnArrayItem(vulnIndex, field)}
          className="btn btn-sm btn-secondary"
        >
          + Add
        </button>
      </div>
      {items.map((val, idx) => (
        <div key={idx} className="list-item">
          <input
            type="text"
            value={val}
            onChange={(e) => handleVulnArrayChange(vulnIndex, field, idx, e.target.value)}
            placeholder={placeholder}
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => removeVulnArrayItem(vulnIndex, field, idx)}
              className="btn btn-sm btn-danger"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported section components  – each receives the slice of props it needs
// ---------------------------------------------------------------------------

/** Static fields: project info + client + dates + executive summary */
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
          <label>Client</label>
          <input type="text" name="client" value={formData.client}
            onChange={handleChange} placeholder="Client / target company name" />
        </div>

        <div className="form-group">
          <label>Testing Company Name</label>
          <input type="text" name="testingCompanyName" value={formData.testingCompanyName}
            onChange={handleChange} placeholder="Your company name" />
        </div>
      </div>

      <div className="form-group">
        <label>Testing Mode</label>
        <input type="text" name="testingMode" value={formData.testingMode}
          onChange={handleChange} placeholder="e.g., Black Box, White Box, Grey Box" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Start of Activity</label>
          <input type="date" name="startDate" value={formData.startDate}
            onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>End of Activity</label>
          <input type="date" name="endDate" value={formData.endDate}
            onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Duration of Activity</label>
          <input type="text" name="duration" value={formData.duration}
            onChange={handleChange} placeholder="e.g., 5 days" />
        </div>
      </div>

      <div className="form-group">
        <label>Executive Summary</label>
        <textarea name="executiveSummary" value={formData.executiveSummary}
          onChange={handleChange} rows="5"
          placeholder="High-level summary of the engagement, scope, and key findings…" />
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
              <select value={target.severity} onChange={(e) => handleTargetChange(index, 'severity', e.target.value)}>
                <option value="">Select severity</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Informational">Informational</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Dynamic: User Accounts list */
export function UserAccountsSection({ formData, addUserAccount, removeUserAccount, handleUserAccountChange }) {
  return (
    <section className="form-section">
      <div className="section-header">
        <h2>Test User Accounts</h2>
        <button type="button" onClick={addUserAccount} className="btn btn-sm btn-secondary">+ Add User Account</button>
      </div>

      {formData.userAccounts.map((account, index) => (
        <div key={index} className="form-group-array">
          <div className="array-header">
            <h4>User Account {index + 1}</h4>
            {formData.userAccounts.length > 1 && (
              <button type="button" onClick={() => removeUserAccount(index)} className="btn btn-sm btn-danger">Remove</button>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={account.username}
                onChange={(e) => handleUserAccountChange(index, 'username', e.target.value)}
                placeholder="testuser@example.com" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input type="text" value={account.description}
                onChange={(e) => handleUserAccountChange(index, 'description', e.target.value)}
                placeholder="e.g., Admin user, Regular user" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Dynamic: Vulnerabilities list (the big one) */
export function VulnerabilitiesSection({
  formData,
  addVulnerability, removeVulnerability, handleVulnChange,
  addVulnArrayItem, removeVulnArrayItem, handleVulnArrayChange
}) {
  // bundle array-handlers so VulnSubArray doesn't need 3 individual props
  const handlers = { addVulnArrayItem, removeVulnArrayItem, handleVulnArrayChange };

  return (
    <section className="form-section">
      <div className="section-header">
        <h2>Vulnerabilities</h2>
        <button type="button" onClick={addVulnerability} className="btn btn-sm btn-secondary">+ Add Vulnerability</button>
      </div>

      {formData.vulnerabilities.map((vuln, vi) => (
        <div key={vi} className="vulnerability-section">
          <div className="array-header">
            <h3>Vulnerability {vi + 1}</h3>
            {formData.vulnerabilities.length > 1 && (
              <button type="button" onClick={() => removeVulnerability(vi)} className="btn btn-sm btn-danger">Remove</button>
            )}
          </div>

          {/* name */}
          <div className="form-group">
            <label>Vulnerability Name *</label>
            <input type="text" value={vuln.name} required
              onChange={(e) => handleVulnChange(vi, 'name', e.target.value)}
              placeholder="e.g., SQL Injection in Login Form" />
          </div>

          {/* severity + priority */}
          <div className="form-row">
            <div className="form-group">
              <label>Severity</label>
              <select value={vuln.severity} onChange={(e) => handleVulnChange(vi, 'severity', e.target.value)}>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Informational">Informational</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <input type="text" value={vuln.priority}
                onChange={(e) => handleVulnChange(vi, 'priority', e.target.value)}
                placeholder="e.g., P1" />
            </div>
          </div>

          {/* CVSS */}
          <div className="form-row">
            <div className="form-group">
              <label>CVSS Score</label>
              <input type="text" value={vuln.cvssScore}
                onChange={(e) => handleVulnChange(vi, 'cvssScore', e.target.value)}
                placeholder="e.g., 9.8" />
            </div>
            <div className="form-group">
              <label>CVSS Vector</label>
              <input type="text" value={vuln.cvssVector}
                onChange={(e) => handleVulnChange(vi, 'cvssVector', e.target.value)}
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

          {/* ---- repeatable sub-arrays ---- */}
          <VulnSubArray vulnIndex={vi} field="urls"          label="Affected URLs"            placeholder="e.g., /api/login"              vuln={vuln} handlers={handlers} />
          <VulnSubArray vulnIndex={vi} field="parameters"    label="Vulnerable Parameters"    placeholder="e.g., username"              vuln={vuln} handlers={handlers} />
          <VulnSubArray vulnIndex={vi} field="methodologies" label="Testing Methodologies"    placeholder="e.g., Manual testing"       vuln={vuln} handlers={handlers} />
          <VulnSubArray vulnIndex={vi} field="attacks"       label="Attack Descriptions"      placeholder="e.g., Payload used: ' OR 1=1" vuln={vuln} handlers={handlers} />
          <VulnSubArray vulnIndex={vi} field="images"        label="Proof-of-Concept Images"  placeholder="Image path or URL"          vuln={vuln} handlers={handlers} />
        </div>
      ))}
    </section>
  );
}
