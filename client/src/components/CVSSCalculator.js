import React, { useState, useEffect, useCallback, useRef } from 'react';
import './CVSSCalculator.css';

const CVSSCalculator = ({ onScoreUpdate, initialVector = '', initialScore = '' }) => {
  const [metrics, setMetrics] = useState({
    AV: 'N',  // Attack Vector
    AC: 'L',  // Attack Complexity
    PR: 'N',  // Privileges Required
    UI: 'N',  // User Interaction
    S: 'U',   // Scope
    C: 'H',   // Confidentiality Impact
    I: 'H',   // Integrity Impact
    A: 'H'    // Availability Impact
  });

  const [score, setScore] = useState(0);
  const [severity, setSeverity] = useState('');
  const isInitializing = useRef(true);
  const previousVector = useRef('');

  // Parse initial CVSS vector whenever it changes
  useEffect(() => {
    // Support multiple CVSS vector formats
    if (initialVector && initialVector.length > 0 && initialVector !== previousVector.current) {
      previousVector.current = initialVector;
      
      // Extract the vector part - handle different formats:
      // Format 1: "CVSS:3.1/AV:N/AC:L/..."
      // Format 2: "CVSS 3.1: /AV:N/AC:L/..."
      // Format 3: "/AV:N/AC:L/..." (just the vector part)
      let vectorString = initialVector;
      
      // Remove "CVSS:3.1/" or "CVSS 3.1: /" prefix if present
      vectorString = vectorString.replace(/^CVSS[:\s]*3\.1[:\s]*\/?/i, '');
      
      // Now parse the vector parts
      const vectorParts = vectorString.split('/').filter(part => part.trim().length > 0);
      const parsedMetrics = {};
      
      vectorParts.forEach(part => {
        const [key, value] = part.split(':');
        if (key && value && key.trim() && value.trim()) {
          parsedMetrics[key.trim()] = value.trim();
        }
      });
      
      if (Object.keys(parsedMetrics).length > 0) {
        setMetrics(prev => ({ ...prev, ...parsedMetrics }));
      }
    }
    
    // Mark initialization as complete after first render
    if (isInitializing.current) {
      setTimeout(() => {
        isInitializing.current = false;
      }, 100);
    }
  }, [initialVector]);

  // CVSS 3.1 metric definitions
  const metricDefinitions = {
    AV: {
      label: 'Attack Vector (AV)',
      options: {
        'N': { label: 'Network', value: 0.85, desc: 'Exploitable remotely' },
        'A': { label: 'Adjacent', value: 0.62, desc: 'Adjacent network access required' },
        'L': { label: 'Local', value: 0.55, desc: 'Local access required' },
        'P': { label: 'Physical', value: 0.20, desc: 'Physical access required' }
      }
    },
    AC: {
      label: 'Attack Complexity (AC)',
      options: {
        'L': { label: 'Low', value: 0.77, desc: 'No special conditions' },
        'H': { label: 'High', value: 0.44, desc: 'Special conditions required' }
      }
    },
    PR: {
      label: 'Privileges Required (PR)',
      options: {
        'N': { label: 'None', value: 0.85, valueChanged: 0.85, desc: 'No privileges required' },
        'L': { label: 'Low', value: 0.62, valueChanged: 0.68, desc: 'Low privileges required' },
        'H': { label: 'High', value: 0.27, valueChanged: 0.50, desc: 'High privileges required' }
      }
    },
    UI: {
      label: 'User Interaction (UI)',
      options: {
        'N': { label: 'None', value: 0.85, desc: 'No user interaction' },
        'R': { label: 'Required', value: 0.62, desc: 'User interaction required' }
      }
    },
    S: {
      label: 'Scope (S)',
      options: {
        'U': { label: 'Unchanged', desc: 'Scope unchanged' },
        'C': { label: 'Changed', desc: 'Scope changed' }
      }
    },
    C: {
      label: 'Confidentiality Impact (C)',
      options: {
        'H': { label: 'High', value: 0.56, desc: 'Total information disclosure' },
        'L': { label: 'Low', value: 0.22, desc: 'Some information disclosed' },
        'N': { label: 'None', value: 0.00, desc: 'No impact' }
      }
    },
    I: {
      label: 'Integrity Impact (I)',
      options: {
        'H': { label: 'High', value: 0.56, desc: 'Total compromise of integrity' },
        'L': { label: 'Low', value: 0.22, desc: 'Some integrity compromise' },
        'N': { label: 'None', value: 0.00, desc: 'No impact' }
      }
    },
    A: {
      label: 'Availability Impact (A)',
      options: {
        'H': { label: 'High', value: 0.56, desc: 'Total loss of availability' },
        'L': { label: 'Low', value: 0.22, desc: 'Reduced availability' },
        'N': { label: 'None', value: 0.00, desc: 'No impact' }
      }
    }
  };

  // Calculate CVSS 3.1 score
  const calculateScore = useCallback((metricsToUse) => {
    // Exploitability metrics
    const AV = metricDefinitions.AV.options[metricsToUse.AV].value;
    const AC = metricDefinitions.AC.options[metricsToUse.AC].value;
    
    // PR value depends on scope
    let PR;
    if (metricsToUse.S === 'U') {
      PR = metricDefinitions.PR.options[metricsToUse.PR].value;
    } else {
      PR = metricDefinitions.PR.options[metricsToUse.PR].valueChanged;
    }
    
    const UI = metricDefinitions.UI.options[metricsToUse.UI].value;

    // Impact metrics
    const C = metricDefinitions.C.options[metricsToUse.C].value;
    const I = metricDefinitions.I.options[metricsToUse.I].value;
    const A = metricDefinitions.A.options[metricsToUse.A].value;

    // Calculate Impact Sub Score (ISS)
    const ISS = 1 - ((1 - C) * (1 - I) * (1 - A));

    // Calculate Impact
    let impact;
    if (metricsToUse.S === 'U') {
      impact = 6.42 * ISS;
    } else {
      impact = 7.52 * (ISS - 0.029) - 3.25 * Math.pow(ISS - 0.02, 15);
    }

    // Calculate Exploitability
    const exploitability = 8.22 * AV * AC * PR * UI;

    // Calculate Base Score
    let baseScore;
    if (impact <= 0) {
      baseScore = 0;
    } else {
      if (metricsToUse.S === 'U') {
        baseScore = Math.min(impact + exploitability, 10);
      } else {
        baseScore = Math.min(1.08 * (impact + exploitability), 10);
      }
    }

    // Round up to one decimal
    baseScore = Math.ceil(baseScore * 10) / 10;

    return baseScore;
  }, []);

  // Get severity rating based on score
  const getSeverity = useCallback((score) => {
    if (score === 0) return 'Informativa';
    if (score >= 0.1 && score <= 3.9) return 'Bassa';
    if (score >= 4.0 && score <= 6.9) return 'Media';
    if (score >= 7.0 && score <= 8.9) return 'Alta';
    if (score >= 9.0 && score <= 10.0) return 'Critica';
    return '';
  }, []);

  // Update score when metrics change - but NOT during initialization
  useEffect(() => {
    const newScore = calculateScore(metrics);
    const newSeverity = getSeverity(newScore);
    
    setScore(newScore);
    setSeverity(newSeverity);

    // Generate CVSS vector string in standard format
    const vector = `CVSS:3.1/AV:${metrics.AV}/AC:${metrics.AC}/PR:${metrics.PR}/UI:${metrics.UI}/S:${metrics.S}/C:${metrics.C}/I:${metrics.I}/A:${metrics.A}`;
    
    // Only notify parent component if we're not initializing
    // This prevents overwriting existing values when editing a report
    if (onScoreUpdate && !isInitializing.current) {
      onScoreUpdate({
        score: newScore.toFixed(1),
        severity: newSeverity,
        vector: vector
      });
    }
  }, [metrics, calculateScore, getSeverity, onScoreUpdate]);

  const handleMetricChange = (metric, value) => {
    setMetrics(prev => ({ ...prev, [metric]: value }));
  };

  const getSeverityClass = (sev) => {
    switch(sev) {
      case 'Critica': return 'severity-critical';
      case 'Alta': return 'severity-high';
      case 'Media': return 'severity-medium';
      case 'Bassa': return 'severity-low';
      case 'Informativa': return 'severity-info';
      default: return '';
    }
  };

  return (
    <div className="cvss-calculator">
      <div className="cvss-header">
        <h4>CVSS 3.1 Calculator</h4>
        <div className={`cvss-score ${getSeverityClass(severity)}`}>
          <div className="score-value">{score.toFixed(1)}</div>
          <div className="score-severity">{severity}</div>
        </div>
      </div>

      <div className="cvss-metrics">
        {Object.entries(metricDefinitions).map(([metricKey, metricDef]) => (
          <div key={metricKey} className="cvss-metric-group">
            <label className="metric-label">{metricDef.label}</label>
            <div className="metric-options">
              {Object.entries(metricDef.options).map(([optKey, opt]) => (
                <button
                  key={optKey}
                  type="button"
                  className={`metric-option ${metrics[metricKey] === optKey ? 'active' : ''}`}
                  onClick={() => handleMetricChange(metricKey, optKey)}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="cvss-vector">
        <label>CVSS Vector: </label>
        <code>CVSS:3.1/AV:{metrics.AV}/AC:{metrics.AC}/PR:{metrics.PR}/UI:{metrics.UI}/S:{metrics.S}/C:{metrics.C}/I:{metrics.I}/A:{metrics.A}</code>
      </div>
    </div>
  );
};

export default CVSSCalculator;