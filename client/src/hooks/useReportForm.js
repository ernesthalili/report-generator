import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Utility: Generate short unique ID (8 characters)
// ---------------------------------------------------------------------------
const generateShortId = () => {
  return Math.random().toString(36).substring(2, 10);
};

// ---------------------------------------------------------------------------
// Default / blank shapes  – single source of truth
// ---------------------------------------------------------------------------
export const EMPTY_TARGET       = () => ({ name: '', url: '', severity: '' });
export const EMPTY_CREDENTIAL   = () => ({ username: '', description: '' });
export const EMPTY_TESTER       = () => ({ name: '', role: '', date: '' });
export const EMPTY_ENDPOINT     = () => ({ index: 1, http_method: '', path: '', parameter: '' });
export const EMPTY_ATTACK       = () => ({ type: 'text', text: '', image: '', caption: '' });

export const EMPTY_CWE_REFERENCE  = () => ({ cwe_id: '' });

// Build the stored cwe_name and cwe_url from a bare CWE ID number (sync, instant)
export const cweIdToRef = (rawId) => {
  const id = String(rawId).replace(/\D/g, ''); // strip non-digits, e.g. "CWE-89" → "89"
  return {
    cwe_id:   id,
    cwe_name: id ? `CWE-${id}` : '',
    cwe_url:  id ? `https://cwe.mitre.org/data/definitions/${id}.html` : ''
  };
};

// Fetch the official CWE title from the MITRE CWE API and return an enriched ref.
// Falls back gracefully if the request fails or id is empty.
// Returns: { cwe_id, cwe_name, cwe_url }  (cwe_name includes title when available)
export const fetchCweTitle = async (rawId) => {
  const id = String(rawId).replace(/\D/g, '');
  const base = cweIdToRef(id);
  if (!id) return base;
  try {
    const res = await fetch(`https://cwe-api.mitre.org/api/v1/cwe/${id}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return base;
    const data = await res.json();
    // The API returns { Weaknesses: [{ CweID, Name, ... }] }
    const weakness = data?.Weaknesses?.[0];
    if (weakness?.Name) {
      return { ...base, cwe_name: `CWE-${id}: ${weakness.Name}` };
    }
  } catch (_) {
    // network unavailable or CORS - fall back to generic name
  }
  return base;
};

export const EMPTY_VULNERABILITY = () => ({
  vulnId: generateShortId(),  // Unique ID for this vulnerability (for file uploads)
  name: '',
  severity: '',  // Changed from 'Medium' to allow user to enter Italian values
  priority: '',
  cvss_score: '',
  cvss_vector: '',
  description: '',
  impact: '',
  remediation: '',
  owasp_category: '',      // OWASP Top 10 classification
  cwe_references: [],      // CWE references (many-to-many)
  internal_notes: '',      // Internal notes (not exported)
  endpoints: [EMPTY_ENDPOINT()],  // Structured endpoints
  attacks:   [EMPTY_ATTACK()]     // Structured attacks (text or image)
});

const BLANK_FORM = () => ({
  projectName:             '',
  client_name:             '',
  testing_company_name:    '',
  testing_mode:            '',
  testing_start_date:      '',
  testing_end_date:        '',
  testing_duration:        '',
  executive_summary:       '',
  revisioner_name:         '',
  revisioner_role:         '',
  revisioner_date:         '',
  approver_name:           '',
  approver_date:           '',
  template:                null,  // Template ID for custom template selection
  targets:                 [EMPTY_TARGET()],
  credentials:             [EMPTY_CREDENTIAL()],
  testers:                 [EMPTY_TESTER()],
  vulnerabilities:         [EMPTY_VULNERABILITY()]
});

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export default function useReportForm() {
  const [formData, setFormData]   = useState(BLANK_FORM);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState('');

  // =========================================================================
  // Auto-save to localStorage every 30 seconds
  // =========================================================================
  useEffect(() => {
    const timer = setInterval(() => {
      // Only save if there's meaningful data
      if (formData.projectName || formData.vulnerabilities.some(v => v.name)) {
        localStorage.setItem('pentest-draft', JSON.stringify({
          formData,
          timestamp: Date.now()
        }));
        console.log('Draft auto-saved at', new Date().toLocaleTimeString());
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(timer);
  }, [formData]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('pentest-draft');
    if (draft) {
      try {
        const { formData: savedData, timestamp } = JSON.parse(draft);
        const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);
        
        if (hoursSince < 24) { // Only restore if less than 24 hours old
          const shouldRestore = window.confirm(
            `Found unsaved draft from ${new Date(timestamp).toLocaleString()}. Restore it?`
          );
          if (shouldRestore) {
            setFormData(savedData);
          } else {
            // User declined, clear the draft
            localStorage.removeItem('pentest-draft');
          }
        } else {
          // Draft too old, remove it
          localStorage.removeItem('pentest-draft');
        }
      } catch (err) {
        console.error('Failed to restore draft:', err);
        localStorage.removeItem('pentest-draft');
      }
    }
  }, []);

  // --- generic top-level field change ---
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle template selection
  const handleTemplateChange = useCallback((templateId) => {
    setFormData(prev => ({ ...prev, template: templateId }));
  }, []);

  // =========================================================================
  // Targets
  // =========================================================================
  const addTarget = useCallback(() => {
    setFormData(prev => ({ ...prev, targets: [...prev.targets, EMPTY_TARGET()] }));
  }, []);

  const removeTarget = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      targets: prev.targets.filter((_, i) => i !== index)
    }));
  }, []);

  const handleTargetChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const targets = [...prev.targets];
      targets[index] = { ...targets[index], [field]: value };
      return { ...prev, targets };
    });
  }, []);

  // =========================================================================
  // Credentials (formerly User Accounts)
  // =========================================================================
  const addCredential = useCallback(() => {
    setFormData(prev => ({ ...prev, credentials: [...prev.credentials, EMPTY_CREDENTIAL()] }));
  }, []);

  const removeCredential = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      credentials: prev.credentials.filter((_, i) => i !== index)
    }));
  }, []);

  const handleCredentialChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const credentials = [...prev.credentials];
      credentials[index] = { ...credentials[index], [field]: value };
      return { ...prev, credentials };
    });
  }, []);

  // =========================================================================
  // Testers
  // =========================================================================
  const addTester = useCallback(() => {
    setFormData(prev => ({ ...prev, testers: [...prev.testers, EMPTY_TESTER()] }));
  }, []);

  const removeTester = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      testers: prev.testers.filter((_, i) => i !== index)
    }));
  }, []);

  const handleTesterChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const testers = [...prev.testers];
      testers[index] = { ...testers[index], [field]: value };
      return { ...prev, testers };
    });
  }, []);

  // =========================================================================
  // Vulnerabilities  –  top-level scalar fields
  // =========================================================================
  const addVulnerability = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      vulnerabilities: [...prev.vulnerabilities, EMPTY_VULNERABILITY()]
    }));
  }, []);

  const removeVulnerability = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      vulnerabilities: prev.vulnerabilities.filter((_, i) => i !== index)
    }));
  }, []);

  const duplicateVulnerability = useCallback((index) => {
    setFormData(prev => {
      const vulnToCopy = prev.vulnerabilities[index];
      const duplicated = {
        ...vulnToCopy,
        vulnId: generateShortId(),  // Generate NEW unique ID for the duplicate
        name: vulnToCopy.name + ' (Copy)',
        // Deep copy arrays to avoid reference issues
        cwe_references: (vulnToCopy.cwe_references || []).map(c => ({...c})),
        endpoints: vulnToCopy.endpoints.map(e => ({...e})),
        attacks: vulnToCopy.attacks.map(a => ({...a}))
      };
      
      const newVulns = [...prev.vulnerabilities];
      newVulns.splice(index + 1, 0, duplicated); // Insert after current
      
      return { ...prev, vulnerabilities: newVulns };
    });
  }, []);

  const handleVulnChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      vulnerabilities[index] = { ...vulnerabilities[index], [field]: value };
      return { ...prev, vulnerabilities };
    });
  }, []);

  // =========================================================================
  // Vulnerabilities  –  repeatable sub-array fields (endpoints and attacks)
  // =========================================================================
  const addVulnArrayItem = useCallback((vulnIndex, field) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      if (field === 'endpoints') {
        const currentEndpoints = vulnerabilities[vulnIndex].endpoints;
        const newIndex = currentEndpoints.length > 0 
          ? Math.max(...currentEndpoints.map(e => e.index || 0)) + 1 
          : 1;
        vulnerabilities[vulnIndex] = {
          ...vulnerabilities[vulnIndex],
          endpoints: [...currentEndpoints, { ...EMPTY_ENDPOINT(), index: newIndex }]
        };
      } else if (field === 'attacks') {
        vulnerabilities[vulnIndex] = {
          ...vulnerabilities[vulnIndex],
          attacks: [...vulnerabilities[vulnIndex].attacks, EMPTY_ATTACK()]
        };
      }
      return { ...prev, vulnerabilities };
    });
  }, []);

  const removeVulnArrayItem = useCallback((vulnIndex, field, itemIndex) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      vulnerabilities[vulnIndex] = {
        ...vulnerabilities[vulnIndex],
        [field]: vulnerabilities[vulnIndex][field].filter((_, i) => i !== itemIndex)
      };
      return { ...prev, vulnerabilities };
    });
  }, []);

  // =========================================================================
  // CWE References
  // =========================================================================
  const addCweReference = useCallback((vulnIndex) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      vulnerabilities[vulnIndex] = {
        ...vulnerabilities[vulnIndex],
        cwe_references: [
          ...(vulnerabilities[vulnIndex].cwe_references || []),
          EMPTY_CWE_REFERENCE()
        ]
      };
      return { ...prev, vulnerabilities };
    });
  }, []);

  const removeCweReference = useCallback((vulnIndex, cweIndex) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      vulnerabilities[vulnIndex] = {
        ...vulnerabilities[vulnIndex],
        cwe_references: vulnerabilities[vulnIndex].cwe_references.filter((_, i) => i !== cweIndex)
      };
      return { ...prev, vulnerabilities };
    });
  }, []);

  const handleCweChange = useCallback((vulnIndex, cweIndex, field, value) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      const cweRefs = [...(vulnerabilities[vulnIndex].cwe_references || [])];
      if (field === 'cwe_id') {
        // Auto-derive name and url whenever the ID changes
        const { cwe_id, cwe_name, cwe_url } = cweIdToRef(value);
        cweRefs[cweIndex] = { ...cweRefs[cweIndex], cwe_id, cwe_name, cwe_url };
      } else {
        cweRefs[cweIndex] = { ...cweRefs[cweIndex], [field]: value };
      }
      vulnerabilities[vulnIndex] = { ...vulnerabilities[vulnIndex], cwe_references: cweRefs };
      return { ...prev, vulnerabilities };
    });
  }, []);

  // Handler for endpoint objects (index, http_method, path, parameter)
  const handleEndpointChange = useCallback((vulnIndex, itemIndex, subfield, value) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      const endpoints = [...vulnerabilities[vulnIndex].endpoints];
      endpoints[itemIndex] = { ...endpoints[itemIndex], [subfield]: value };
      vulnerabilities[vulnIndex] = { ...vulnerabilities[vulnIndex], endpoints };
      return { ...prev, vulnerabilities };
    });
  }, []);

  // Handler for attack objects (type, text, image, caption)
  const handleAttackChange = useCallback((vulnIndex, itemIndex, subfield, value) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      const attacks = [...vulnerabilities[vulnIndex].attacks];
      attacks[itemIndex] = { ...attacks[itemIndex], [subfield]: value };
      vulnerabilities[vulnIndex] = { ...vulnerabilities[vulnIndex], attacks };
      return { ...prev, vulnerabilities };
    });
  }, []);

  // File upload handler for images - now adds to attacks array as type 'image'
  const handleImageUpload = useCallback(async (vulnIndex, files, reportId) => {
    if (!files || files.length === 0) return;
    
    if (!reportId) {
      alert('Report ID is missing. Cannot upload images.');
      console.error('handleImageUpload called without reportId');
      return;
    }

    const formDataUpload = new FormData();
    Array.from(files).forEach(file => {
      formDataUpload.append('images', file);
    });
    
    // Get vulnId from the vulnerability object, fallback to index for backward compatibility
    const vulnerability = formData.vulnerabilities[vulnIndex];
    const vulnIdentifier = vulnerability?.vulnId || vulnIndex.toString();
    
    // Pass reportId and vulnIdentifier as URL parameters
    // This ensures they're available during multer's file processing

    try {
      const res = await axios.post(`/api/reports/${reportId}/upload-images/${vulnIdentifier}`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setFormData(prev => {
          const vulnerabilities = [...prev.vulnerabilities];
          const newImageAttacks = res.data.files.map(filePath => ({
            type: 'image',
            text: '',
            image: filePath,
            caption: ''
          }));
          vulnerabilities[vulnIndex] = {
            ...vulnerabilities[vulnIndex],
            attacks: [...vulnerabilities[vulnIndex].attacks, ...newImageAttacks]
          };
          return { ...prev, vulnerabilities };
        });
      }
    } catch (err) {
      console.error('Image upload error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to upload images. Please check folder permissions and try again.';
      alert(errorMsg);
    }
  }, [formData.vulnerabilities]);

  const removeAttack = useCallback((vulnIndex, attackIndex) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      vulnerabilities[vulnIndex] = {
        ...vulnerabilities[vulnIndex],
        attacks: vulnerabilities[vulnIndex].attacks.filter((_, i) => i !== attackIndex)
      };
      return { ...prev, vulnerabilities };
    });
  }, []);

  // =========================================================================
  // Seed form with existing data  (used by EditReport after fetch)
  // =========================================================================
  const seedForm = useCallback((report) => {
    const ensure = (arr, fallback) => (arr && arr.length > 0 ? arr : [fallback()]);
    const ensureEndpoints = (arr) => {
      if (!arr || arr.length === 0) return [EMPTY_ENDPOINT()];
      return arr.map((e, idx) => ({
        index: e.index || idx + 1,
        http_method: e.http_method || '',
        path: e.path || '',
        parameter: e.parameter || ''
      }));
    };
    const ensureAttacks = (arr) => {
      if (!arr || arr.length === 0) return [EMPTY_ATTACK()];
      return arr.map(a => ({
        type: a.type || 'text',
        text: a.text || '',
        image: a.image || '',
        caption: a.caption || ''
      }));
    };

    setFormData({
      projectName:             report.projectName             || '',
      client_name:             report.client_name             || report.client || '',  // backward compat
      testing_company_name:    report.testing_company_name    || report.testingCompanyName || '',
      testing_mode:            report.testing_mode            || report.testingMode || '',
      testing_start_date:      report.testing_start_date ? report.testing_start_date.split('T')[0] : (report.startDate ? report.startDate.split('T')[0] : ''),
      testing_end_date:        report.testing_end_date   ? report.testing_end_date.split('T')[0]   : (report.endDate ? report.endDate.split('T')[0] : ''),
      testing_duration:        report.testing_duration        || report.duration || '',
      executive_summary:       report.executive_summary       || report.executiveSummary || '',
      revisioner_name:         report.revisioner_name         || '',
      revisioner_role:         report.revisioner_role         || '',
      revisioner_date:         report.revisioner_date ? report.revisioner_date.split('T')[0] : '',
      approver_name:           report.approver_name           || '',
      approver_date:           report.approver_date ? report.approver_date.split('T')[0] : '',
      targets:                 ensure(report.targets,                    EMPTY_TARGET),
      credentials:             ensure(report.credentials || report.userAccounts, EMPTY_CREDENTIAL),  // backward compat
      testers:                 ensure(report.testers,                    EMPTY_TESTER),
      vulnerabilities:         ensure(report.vulnerabilities,            EMPTY_VULNERABILITY).map(v => ({
        ...v,
        vulnId: v.vulnId || generateShortId(),  // Preserve existing vulnId or generate for old reports
        cvss_score:  v.cvss_score || v.cvssScore || '',  // backward compat
        cvss_vector: v.cvss_vector || v.cvssVector || '',
        owasp_category: v.owasp_category || '',  // new field
        internal_notes: v.internal_notes || '',  // new field
        cwe_references: Array.isArray(v.cwe_references)
          ? v.cwe_references.map(c => {
              // Derive cwe_id from stored cwe_name ("CWE-89: …" → "89") for backward compat
              const idMatch = (c.cwe_name || '').match(/(\d+)/);
              const id = c.cwe_id || (idMatch ? idMatch[1] : '');
              return { cwe_id: id, cwe_name: c.cwe_name || '', cwe_url: c.cwe_url || '' };
            })
          : [],
        endpoints:   ensureEndpoints(v.endpoints),
        attacks:     ensureAttacks(v.attacks)
      }))
    });
  }, []);

  // =========================================================================
  // Submit helpers  (create / update)
  // =========================================================================
  const create = async (reportId) => {
    setError('');
    setLoading(true);
    
    if (!reportId) {
      setError('Report ID is missing. Cannot create report.');
      setLoading(false);
      return false;
    }
    
    try {
      // Include the reportId in the request so the backend can associate it
      const dataToSend = { ...formData, reportId };
      await axios.post('/api/reports', dataToSend);
      // Clear draft after successful submission
      localStorage.removeItem('pentest-draft');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create report');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const update = async (id) => {
    setError('');
    setLoading(true);
    try {
      await axios.put(`/api/reports/${id}`, formData);
      // Clear draft after successful update
      localStorage.removeItem('pentest-draft');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update report');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // Template Management
  // =========================================================================
  const saveAsTemplate = useCallback(async (vulnIndex) => {
    const vuln = formData.vulnerabilities[vulnIndex];
    
    // Prompt for template name
    const templateName = prompt('Enter a name for this template:', vuln.name || 'Untitled Template');
    if (!templateName) return; // User cancelled
    
    // Prepare template data (exclude endpoints and attacks)
    const templateData = {
      name:           templateName.trim(),
      severity:       vuln.severity       || '',
      priority:       vuln.priority       || '',
      cvss_score:     vuln.cvss_score     || '',
      cvss_vector:    vuln.cvss_vector    || '',
      description:    vuln.description    || '',
      impact:         vuln.impact         || '',
      remediation:    vuln.remediation    || '',
      owasp_category: vuln.owasp_category || '',
      cwe_references: Array.isArray(vuln.cwe_references)
        ? vuln.cwe_references.filter(c => c.cwe_id || c.cwe_name)
            .map(c => ({ cwe_name: c.cwe_name, cwe_url: c.cwe_url }))
        : [],
      internal_notes: vuln.internal_notes || ''
    };
    
    try {
      const res = await axios.post('/api/vulnerability-templates', templateData);
      if (res.data.success) {
        alert(`Template "${templateName}" saved successfully!`);
      }
    } catch (err) {
      console.error('Save template error:', err);
      alert(err.response?.data?.message || 'Failed to save template. The name might already exist.');
    }
  }, [formData.vulnerabilities]);

  const loadTemplate = useCallback(async (vulnIndex) => {
    try {
      // Fetch all templates
      const res = await axios.get('/api/vulnerability-templates');
      
      if (!res.data.success || res.data.data.length === 0) {
        alert('No templates available. Save a vulnerability as a template first.');
        return;
      }
      
      // Create selection list
      const templates = res.data.data;
      const templateList = templates.map((t, idx) => `${idx + 1}. ${t.name}`).join('\n');
      const selection = prompt(
        `Select a template (enter number):\n\n${templateList}`,
        '1'
      );
      
      if (!selection) return; // User cancelled
      
      const selectedIndex = parseInt(selection) - 1;
      if (selectedIndex < 0 || selectedIndex >= templates.length) {
        alert('Invalid selection');
        return;
      }
      
      const template = templates[selectedIndex];
      
      // Load template data into vulnerability (preserve endpoints and attacks)
      setFormData(prev => {
        const vulnerabilities = [...prev.vulnerabilities];
        vulnerabilities[vulnIndex] = {
          ...vulnerabilities[vulnIndex],
          // Preserve vulnId - do NOT overwrite it with template data
          name:           template.name || vulnerabilities[vulnIndex].name,
          severity:       template.severity       || '',
          priority:       template.priority       || '',
          cvss_score:     template.cvss_score     || '',
          cvss_vector:    template.cvss_vector    || '',
          description:    template.description    || '',
          impact:         template.impact         || '',
          remediation:    template.remediation    || '',
          owasp_category: template.owasp_category || '',
          cwe_references: Array.isArray(template.cwe_references)
            ? template.cwe_references.map(c => {
                const idMatch = (c.cwe_name || '').match(/(\d+)/);
                const id = c.cwe_id || (idMatch ? idMatch[1] : '');
                return { cwe_id: id, cwe_name: c.cwe_name || '', cwe_url: c.cwe_url || '' };
              })
            : [],
          internal_notes: template.internal_notes || ''
          // Keep existing endpoints, attacks, and vulnId
        };
        return { ...prev, vulnerabilities };
      });
      
      alert(`Template "${template.name}" loaded successfully!`);
    } catch (err) {
      console.error('Load template error:', err);
      alert('Failed to load templates');
    }
  }, []);

  const moveVulnerability = useCallback((index, direction) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= vulnerabilities.length) {
        return prev; // Out of bounds
      }
      
      // Swap vulnerabilities
      [vulnerabilities[index], vulnerabilities[newIndex]] = 
        [vulnerabilities[newIndex], vulnerabilities[index]];
      
      return { ...prev, vulnerabilities };
    });
  }, []);

  return {
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
    seedForm, create, update
  };
}
