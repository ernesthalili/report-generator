import { useState, useCallback } from 'react';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Default / blank shapes  – single source of truth
// ---------------------------------------------------------------------------
export const EMPTY_TARGET       = () => ({ name: '', url: '', severity: '' });
export const EMPTY_CREDENTIAL   = () => ({ username: '', description: '' });
export const EMPTY_TESTER       = () => ({ name: '', role: '', date: '' });
export const EMPTY_ENDPOINT     = () => ({ index: 1, http_method: '', path: '', parameter: '' });
export const EMPTY_ATTACK       = () => ({ type: 'text', text: '', image: '', caption: '' });

export const EMPTY_VULNERABILITY = () => ({
  name: '',
  severity: 'Medium',
  priority: '',
  cvss_score: '',
  cvss_vector: '',
  description: '',
  impact: '',
  remediation: '',
  endpoints: [EMPTY_ENDPOINT()],  // New structured endpoints
  attacks:   [EMPTY_ATTACK()]     // New structured attacks (text or image)
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

  // --- generic top-level field change ---
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
  const handleImageUpload = useCallback(async (vulnIndex, files) => {
    if (!files || files.length === 0) return;

    const formDataUpload = new FormData();
    Array.from(files).forEach(file => {
      formDataUpload.append('images', file);
    });

    try {
      const res = await axios.post('/api/reports/upload-images', formDataUpload, {
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
      alert('Failed to upload images');
    }
  }, []);

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
        cvss_score:  v.cvss_score || v.cvssScore || '',  // backward compat
        cvss_vector: v.cvss_vector || v.cvssVector || '',
        endpoints:   ensureEndpoints(v.endpoints),
        attacks:     ensureAttacks(v.attacks)
      }))
    });
  }, []);

  // =========================================================================
  // Submit helpers  (create / update)
  // =========================================================================
  const create = async () => {
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/reports', formData);
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
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update report');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    formData, loading, error,
    handleChange,
    addTarget, removeTarget, handleTargetChange,
    addCredential, removeCredential, handleCredentialChange,
    addTester, removeTester, handleTesterChange,
    addVulnerability, removeVulnerability, handleVulnChange,
    addVulnArrayItem, removeVulnArrayItem,
    handleEndpointChange, handleAttackChange,
    handleImageUpload, removeAttack,
    seedForm, create, update
  };
}