import React, { useState, useEffect, useCallback, useRef } from 'react';
import './CVSSCalculator.css';

// ---------------------------------------------------------------------------
// Utility: parse a CVSS vector string into a metrics object
// ---------------------------------------------------------------------------
const parseVector = (vectorString) => {
  if (!vectorString || vectorString.trim().length === 0) return null;

  // Strip prefix: "CVSS:3.1/" or "CVSS 3.1: /" etc.
  const stripped = vectorString.replace(/^CVSS[:\s]*3\.1[:\s]*\/?/i, '');
  const parts = stripped.split('/').filter(p => p.trim().length > 0);
  const parsed = {};
  parts.forEach(part => {
    const [key, value] = part.split(':');
    if (key && value && key.trim() && value.trim()) {
      parsed[key.trim()] = value.trim();
    }
  });
  return Object.keys(parsed).length > 0 ? parsed : null;
};

const DEFAULT_METRICS = {
  AV: 'N',
  AC: 'L',
  PR: 'N',
  UI: 'N',
  S: 'U',
  C: 'H',
  I: 'H',
  A: 'H'
};

const CVSSCalculator = ({ onScoreUpdate, initialVector = '', initialScore = '' }) => {
  // Initialise metrics synchronously from initialVector so they are correct
  // on the very first render – no race condition with onScoreUpdate.
  const [metrics, setMetrics] = useState(() => {
    const parsed = parseVector(initialVector);
    return parsed ? { ...DEFAULT_METRICS, ...parsed } : { ...DEFAULT_METRICS };
  });

  const [score, setScore] = useState(0);
  const [severity, setSeverity] = useState('');

  // Track whether the component has finished its first render cycle so we
  // can suppress the onScoreUpdate call that fires from the initial metrics
  // effect (we don't want to overwrite the parent's already-correct values).
  const mountedRef = useRef(false);
  const previousVector = useRef(initialVector);
  // The last CVSS vector string this component itself emitted via onScoreUpdate.
  // Used to detect the echo-back: parent stores the vector we sent, passes it
  // back as initialVector, which would otherwise trigger a re-parse loop.
  const lastEmittedVector = useRef('');

  // Re-parse only when initialVector is a genuine external change – not an
  // echo-back of the vector we ourselves just emitted via onScoreUpdate.
  useEffect(() => {
    if (initialVector === previousVector.current) return;
    previousVector.current = initialVector;

    const normIncoming = (initialVector || '').trim().toUpperCase();
    const normEmitted  = (lastEmittedVector.current || '').trim().toUpperCase();
    if (normIncoming && normIncoming === normEmitted) return; // echo-back, skip

    const parsed = parseVector(initialVector);
    if (parsed) {
      setMetrics(prev => ({ ...prev, ...parsed }));
    }
  }, [initialVector]);

  // CVSS 3.1 metric definitions
  const metricDefinitions = {
    AV: {
      label: 'Attack Vector (AV)',
      options: {
        'N': { label: 'Network',   value: 0.85, desc: 'Exploitable remotely' },
        'A': { label: 'Adjacent',  value: 0.62, desc: 'Adjacent network access required' },
        'L': { label: 'Local',     value: 0.55, desc: 'Local access required' },
        'P': { label: 'Physical',  value: 0.20, desc: 'Physical access required' }
      }
    },
    AC: {
      label: 'Attack Complexity (AC)',
      options: {
        'L': { label: 'Low',  value: 0.77, desc: 'No special conditions' },
        'H': { label: 'High', value: 0.44, desc: 'Special conditions required' }
      }
    },
    PR: {
      label: 'Privileges Required (PR)',
      options: {
        'N': { label: 'None', value: 0.85, valueChanged: 0.85, desc: 'No privileges required' },
        'L': { label: 'Low',  value: 0.62, valueChanged: 0.68, desc: 'Low privileges required' },
        'H': { label: 'High', value: 0.27, valueChanged: 0.50, desc: 'High privileges required' }
      }
    },
    UI: {
      label: 'User Interaction (UI)',
      options: {
        'N': { label: 'None',     value: 0.85, desc: 'No user interaction' },
        'R': { label: 'Required', value: 0.62, desc: 'User interaction required' }
      }
    },
    S: {
      label: 'Scope (S)',
      options: {
        'U': { label: 'Unchanged', desc: 'Scope unchanged' },
        'C': { label: 'Changed',   desc: 'Scope changed' }
      }
    },
    C: {
      label: 'Confidentiality Impact (C)',
      options: {
        'H': { label: 'High', value: 0.56, desc: 'Total information disclosure' },
        'L': { label: 'Low',  value: 0.22, desc: 'Some information disclosed' },
        'N': { label: 'None', value: 0.00, desc: 'No impact' }
      }
    },
    I: {
      label: 'Integrity Impact (I)',
      options: {
        'H': { label: 'High', value: 0.56, desc: 'Total compromise of integrity' },
        'L': { label: 'Low',  value: 0.22, desc: 'Some integrity compromise' },
        'N': { label: 'None', value: 0.00, desc: 'No impact' }
      }
    },
    A: {
      label: 'Availability Impact (A)',
      options: {
        'H': { label: 'High', value: 0.56, desc: 'Total loss of availability' },
        'L': { label: 'Low',  value: 0.22, desc: 'Reduced availability' },
        'N': { label: 'None', value: 0.00, desc: 'No impact' }
      }
    }
  };

  const calculateScore = useCallback((metricsToUse) => {
    const AV = metricDefinitions.AV.options[metricsToUse.AV].value;
    const AC = metricDefinitions.AC.options[metricsToUse.AC].value;
    const PR = metricsToUse.S === 'U'
      ? metricDefinitions.PR.options[metricsToUse.PR].value
      : metricDefinitions.PR.options[metricsToUse.PR].valueChanged;
    const UI = metricDefinitions.UI.options[metricsToUse.UI].value;
    const C  = metricDefinitions.C.options[metricsToUse.C].value;
    const I  = metricDefinitions.I.options[metricsToUse.I].value;
    const A  = metricDefinitions.A.options[metricsToUse.A].value;

    const ISS = 1 - ((1 - C) * (1 - I) * (1 - A));
    const impact = metricsToUse.S === 'U'
      ? 6.42 * ISS
      : 7.52 * (ISS - 0.029) - 3.25 * Math.pow(ISS - 0.02, 15);
    const exploitability = 8.22 * AV * AC * PR * UI;

    if (impact <= 0) return 0;
    const raw = metricsToUse.S === 'U'
      ? Math.min(impact + exploitability, 10)
      : Math.min(1.08 * (impact + exploitability), 10);
    return Math.ceil(raw * 10) / 10;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getSeverity = useCallback((s) => {
    if (s === 0)              return 'Informativa';
    if (s <= 3.9)             return 'Bassa';
    if (s <= 6.9)             return 'Media';
    if (s <= 8.9)             return 'Alta';
    if (s <= 10.0)            return 'Critica';
    return '';
  }, []);

  // Recalculate whenever metrics change; notify parent only after mount.
  useEffect(() => {
    const newScore    = calculateScore(metrics);
    const newSeverity = getSeverity(newScore);
    setScore(newScore);
    setSeverity(newSeverity);

    const vector = `CVSS:3.1/AV:${metrics.AV}/AC:${metrics.AC}/PR:${metrics.PR}/UI:${metrics.UI}/S:${metrics.S}/C:${metrics.C}/I:${metrics.I}/A:${metrics.A}`;

    if (mountedRef.current && onScoreUpdate) {
      lastEmittedVector.current = vector; // record so echo-back is ignored
      onScoreUpdate({ score: newScore.toFixed(1), severity: newSeverity, vector });
    }
  }, [metrics, calculateScore, getSeverity, onScoreUpdate]);

  // Mark component as mounted after the first effect cycle completes.
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleMetricChange = (metric, value) => {
    setMetrics(prev => ({ ...prev, [metric]: value }));
  };

  const getSeverityClass = (sev) => {
    switch (sev) {
      case 'Critica':    return 'severity-critical';
      case 'Alta':       return 'severity-high';
      case 'Media':      return 'severity-medium';
      case 'Bassa':      return 'severity-low';
      case 'Informativa': return 'severity-info';
      default:           return '';
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
