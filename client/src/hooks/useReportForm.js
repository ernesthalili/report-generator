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
  methodologies: [''],
  attacks:       [''],
  images:        ['']
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
  //   field in { urls, parameters, methodologies, attacks, images }
  // =========================================================================
  const addVulnArrayItem = useCallback((vulnIndex, field) => {
    setFormData(prev => {
      const vulnerabilities = [...prev.vulnerabilities];
      vulnerabilities[vulnIndex] = {
        ...vulnerabilities[vulnIndex],
        [field]: [...vulnerabilities[vulnIndex][field], '']
      };
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

  // =========================================================================
  // Seed form with existing data  (used by EditReport after fetch)
  // =========================================================================
  const seedForm = useCallback((report) => {
    const ensure = (arr, fallback) => (arr && arr.length > 0 ? arr : [fallback()]);
    const ensureStrArr = (arr) => (arr && arr.length > 0 ? arr : ['']);

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
        methodologies: ensureStrArr(v.methodologies),
        attacks:       ensureStrArr(v.attacks),
        images:        ensureStrArr(v.images)
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
    seedForm, create, update
  };
}