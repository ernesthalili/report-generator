import { useState, useCallback } from 'react';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Default / blank shapes  – single source of truth
// ---------------------------------------------------------------------------
export const EMPTY_TARGET       = () => ({ name: '', url: '', severity: '' });
export const EMPTY_USER_ACCOUNT = () => ({ username: '', description: '' });
export const EMPTY_VULNERABILITY = () => ({
  name: '',
  severity: 'Medium',
  priority: '',
  cvssScore: '',
  cvssVector: '',
  description: '',
  impact: '',
  remediation: '',
  urls:          [''],
  parameters:    [''],
  methodologies: [{ description: '', httpMethod: '' }],  // structured: description + HTTP method
  attacks:       [''],
  images:        []   // empty - files will be uploaded separately
});

const BLANK_FORM = () => ({
  projectName:        '',
  client:             '',
  testingCompanyName: '',
  testingMode:        '',
  startDate:          '',
  endDate:            '',
  duration:           '',
  executiveSummary:   '',
  targets:            [EMPTY_TARGET()],
  userAccounts:       [EMPTY_USER_ACCOUNT()],
  vulnerabilities:    [EMPTY_VULNERABILITY()]
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
  // User Accounts
  // =========================================================================
  const addUserAccount = useCallback(() => {
    setFormData(prev => ({ ...prev, userAccounts: [...prev.userAccounts, EMPTY_USER_ACCOUNT()] }));
  }, []);

  const removeUserAccount = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      userAccounts: prev.userAccounts.filter((_, i) => i !== index)
    }));
  }, []);

  const handleUserAccountChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const userAccounts = [...prev.userAccounts];
      userAccounts[index] = { ...userAccounts[index], [field]: value };
      return { ...prev, userAccounts };
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
  // Vulnerabilities  –  repeatable sub-array fields
  //   field in { urls, parameters, attacks } → simple strings
  //   methodologies → objects with { description, httpMethod }
  //   images → handled separately via file upload
  // =========================================================================
  const addVulnArrayItem = useCallback((vulnIndex, field) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      if (field === 'methodologies') {
        vulnerabilities[vulnIndex] = {
          ...vulnerabilities[vulnIndex],
          methodologies: [...vulnerabilities[vulnIndex].methodologies, { description: '', httpMethod: '' }]
        };
      } else {
        vulnerabilities[vulnIndex] = {
          ...vulnerabilities[vulnIndex],
          [field]: [...vulnerabilities[vulnIndex][field], '']
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

  const handleVulnArrayChange = useCallback((vulnIndex, field, itemIndex, value) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      const arr = [...vulnerabilities[vulnIndex][field]];
      arr[itemIndex] = value;
      vulnerabilities[vulnIndex] = { ...vulnerabilities[vulnIndex], [field]: arr };
      return { ...prev, vulnerabilities };
    });
  }, []);

  // Special handler for methodology objects (description + httpMethod)
  const handleMethodologyChange = useCallback((vulnIndex, itemIndex, subfield, value) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      const methodologies = [...vulnerabilities[vulnIndex].methodologies];
      methodologies[itemIndex] = { ...methodologies[itemIndex], [subfield]: value };
      vulnerabilities[vulnIndex] = { ...vulnerabilities[vulnIndex], methodologies };
      return { ...prev, vulnerabilities };
    });
  }, []);

  // File upload handler for images
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
          vulnerabilities[vulnIndex] = {
            ...vulnerabilities[vulnIndex],
            images: [...vulnerabilities[vulnIndex].images, ...res.data.files]
          };
          return { ...prev, vulnerabilities };
        });
      }
    } catch (err) {
      console.error('Image upload error:', err);
      alert('Failed to upload images');
    }
  }, []);

  const removeImage = useCallback((vulnIndex, imageIndex) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      vulnerabilities[vulnIndex] = {
        ...vulnerabilities[vulnIndex],
        images: vulnerabilities[vulnIndex].images.filter((_, i) => i !== imageIndex)
      };
      return { ...prev, vulnerabilities };
    });
  }, []);

  // =========================================================================
  // Seed form with existing data  (used by EditReport after fetch)
  // =========================================================================
  const seedForm = useCallback((report) => {
    const ensure = (arr, fallback) => (arr && arr.length > 0 ? arr : [fallback()]);
    const ensureStrArr = (arr) => (arr && arr.length > 0 ? arr : ['']);
    const ensureMethodologies = (arr) => {
      if (!arr || arr.length === 0) return [{ description: '', httpMethod: '' }];
      // Handle old string format gracefully
      return arr.map(m => 
        typeof m === 'string' ? { description: m, httpMethod: '' } : m
      );
    };

    setFormData({
      projectName:        report.projectName        || '',
      client:             report.client             || '',
      testingCompanyName: report.testingCompanyName || '',
      testingMode:        report.testingMode        || '',
      startDate:          report.startDate ? report.startDate.split('T')[0] : '',
      endDate:            report.endDate   ? report.endDate.split('T')[0]   : '',
      duration:           report.duration           || '',
      executiveSummary:   report.executiveSummary   || '',
      targets:            ensure(report.targets,         EMPTY_TARGET),
      userAccounts:       ensure(report.userAccounts,    EMPTY_USER_ACCOUNT),
      vulnerabilities:    ensure(report.vulnerabilities, EMPTY_VULNERABILITY).map(v => ({
        ...v,
        urls:          ensureStrArr(v.urls),
        parameters:    ensureStrArr(v.parameters),
        methodologies: ensureMethodologies(v.methodologies),
        attacks:       ensureStrArr(v.attacks),
        images:        v.images || []
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
    addUserAccount, removeUserAccount, handleUserAccountChange,
    addVulnerability, removeVulnerability, handleVulnChange,
    addVulnArrayItem, removeVulnArrayItem, handleVulnArrayChange,
    handleMethodologyChange,  // NEW - for structured methodology objects
    handleImageUpload, removeImage,  // NEW - for file uploads
    seedForm, create, update
  };
}