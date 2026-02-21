import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import TemplateManager from '../components/TemplateManager';
import Copyright from '../components/Copyright';
import './Dashboard.css';

const STATUS_OPTIONS = ['Editing', 'Finished'];

function Dashboard() {
  const [reports, setReports]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [filtersOpen, setFiltersOpen]       = useState(false);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    search:    '',
    status:    '',
    tester:    '',
    client:    '',
    dateFrom:  '',
    dateTo:    '',
    dateField: 'testing_start_date',
  });

  const sidebarRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        !e.target.closest('.drawer-toggle')
      ) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    try {
      const res = await axios.get('/api/reports');
      setReports(res.data.data);
    } catch (err) {
      setError('Failed to load reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Status update ────────────────────────────────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`/api/reports/${id}`, { status: newStatus });
      setReports(reports.map(r => r._id === id ? { ...r, status: newStatus } : r));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await axios.delete(`/api/reports/${id}`);
      setReports(reports.filter(r => r._id !== id));
    } catch (err) {
      alert('Failed to delete report');
    }
  };

  const handleGenerateDoc = async (id, projectName) => {
    try {
      const res = await axios.post(`/api/reports/${id}/generate`, {}, { responseType: 'blob' });
      let filename = `${projectName.replace(/[^a-z0-9]/gi, '_')}_report.docx`;
      const cd = res.headers['content-disposition'];
      if (cd) {
        const m = cd.match(/filename[^;=\n]*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/);
        if (m && m[3]) filename = decodeURIComponent(m[3]);
        else if (m && m[2]) filename = decodeURIComponent(m[2]);
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate document');
    }
  };

  const toggleExpand = (id) => setExpandedReport(expandedReport === id ? null : id);

  const getSeverityCounts = (vulnerabilities) => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    (vulnerabilities || []).forEach(vuln => {
      const s = vuln.severity?.toLowerCase() || '';
      if (s.includes('critical') || s.includes('critica')) counts.critical++;
      else if (s.includes('high') || s.includes('alta') || s.includes('alto')) counts.high++;
      else if (s.includes('medium') || s.includes('media') || s.includes('medio')) counts.medium++;
      else if (s.includes('low') || s.includes('bassa') || s.includes('basso')) counts.low++;
    });
    return counts;
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // ── Derived filter options ────────────────────────────────────────────────────
  const allTesters = useMemo(() => {
    const names = new Set();
    reports.forEach(r => (r.testers || []).forEach(t => { if (t.name) names.add(t.name); }));
    return [...names].sort();
  }, [reports]);

  const allClients = useMemo(() => {
    const names = new Set();
    reports.forEach(r => { if (r.client_name) names.add(r.client_name); });
    return [...names].sort();
  }, [reports]);

  // ── Filtered reports ─────────────────────────────────────────────────────────
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const search = filters.search.toLowerCase();
      if (search && !r.projectName?.toLowerCase().includes(search) &&
          !r.client_name?.toLowerCase().includes(search)) return false;

      if (filters.status && r.status !== filters.status) return false;
      if (filters.client && r.client_name !== filters.client) return false;

      if (filters.tester) {
        const hasTester = (r.testers || []).some(t => t.name === filters.tester);
        if (!hasTester) return false;
      }

      const dateVal = r[filters.dateField];
      if (filters.dateFrom && dateVal) {
        if (new Date(dateVal) < new Date(filters.dateFrom)) return false;
      }
      if (filters.dateTo && dateVal) {
        if (new Date(dateVal) > new Date(filters.dateTo)) return false;
      }

      return true;
    });
  }, [reports, filters]);

  const activeFilterCount = [
    filters.search, filters.status, filters.tester,
    filters.client, filters.dateFrom, filters.dateTo
  ].filter(Boolean).length;

  const resetFilters = () => setFilters({
    search: '', status: '', tester: '', client: '',
    dateFrom: '', dateTo: '', dateField: 'testing_start_date',
  });

  const handleNavClick = (action) => { setSidebarOpen(false); action(); };
  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '??';

  return (
    <div className="dashboard">

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <button
              className="drawer-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Menu"
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
            <h1>Report Generator</h1>
          </div>
          <div className="header-actions">
            <div className="user-info">
              <span className="user-avatar">{initials}</span>
              <span className="user-name">{user?.username}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div className="dashboard-body">

        {sidebarOpen && (
          <div className="drawer-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
        <nav ref={sidebarRef} className={`drawer-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="drawer-header">
            <span className="drawer-title">Navigation</span>
            <button className="drawer-close" onClick={() => setSidebarOpen(false)}>✕</button>
          </div>
          <div className="drawer-user">
            <div className="drawer-avatar">{initials}</div>
            <div>
              <div className="drawer-username">{user?.username}</div>
              <div className="drawer-email">{user?.email}</div>
            </div>
          </div>
          <div className="drawer-nav">
            <div className="drawer-section-label">Main</div>
            <div className="drawer-item drawer-item-active">
              <span className="drawer-item-icon">📊</span> Dashboard
            </div>
            <div className="drawer-item" onClick={() => handleNavClick(() => navigate('/reports/create'))}>
              <span className="drawer-item-icon">➕</span> New Report
            </div>
            <div className="drawer-section-label">Templates</div>
            <div className="drawer-item" onClick={() => handleNavClick(() => setShowTemplateManager(true))}>
              <span className="drawer-item-icon">📋</span> Vulnerability Templates
            </div>
            <div className="drawer-item" onClick={() => handleNavClick(() => navigate('/templates'))}>
              <span className="drawer-item-icon">📄</span> Report Templates
            </div>
          </div>
          <div className="drawer-footer">
            <div className="drawer-item" onClick={() => handleNavClick(() => navigate('/settings'))}>
              <span className="drawer-item-icon">⚙️</span> Settings
            </div>
            <div className="drawer-item drawer-item-danger" onClick={logout}>
              <span className="drawer-item-icon">🚪</span> Logout
            </div>
          </div>
        </nav>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <main className="dashboard-content">
          <div className="content-header">
            <h2>My Reports</h2>
            <button
              className={`btn-filter-toggle ${filtersOpen ? 'active' : ''}`}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              🔍 Filters {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
            </button>
          </div>

          {/* ── FILTER PANEL ─────────────────────────────────────────── */}
          {filtersOpen && (
            <div className="filter-panel">
              <div className="filter-grid">

                <div className="filter-group filter-group-wide">
                  <label className="filter-label">Search</label>
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Project name or client…"
                    value={filters.search}
                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                  />
                </div>

                <div className="filter-group">
                  <label className="filter-label">Status</label>
                  <select
                    className="filter-input"
                    value={filters.status}
                    onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Client</label>
                  <select
                    className="filter-input"
                    value={filters.client}
                    onChange={e => setFilters(f => ({ ...f, client: e.target.value }))}
                  >
                    <option value="">All clients</option>
                    {allClients.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Tester</label>
                  <select
                    className="filter-input"
                    value={filters.tester}
                    onChange={e => setFilters(f => ({ ...f, tester: e.target.value }))}
                  >
                    <option value="">All testers</option>
                    {allTesters.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Date field</label>
                  <select
                    className="filter-input"
                    value={filters.dateField}
                    onChange={e => setFilters(f => ({ ...f, dateField: e.target.value }))}
                  >
                    <option value="testing_start_date">Start date</option>
                    <option value="testing_end_date">End date</option>
                    <option value="createdAt">Created at</option>
                    <option value="updatedAt">Updated at</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">From</label>
                  <input
                    type="date"
                    className="filter-input"
                    value={filters.dateFrom}
                    onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  />
                </div>

                <div className="filter-group">
                  <label className="filter-label">To</label>
                  <input
                    type="date"
                    className="filter-input"
                    value={filters.dateTo}
                    onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                  />
                </div>

              </div>

              <div className="filter-footer">
                <span className="filter-results-count">
                  Showing <strong>{filteredReports.length}</strong> of <strong>{reports.length}</strong> reports
                </span>
                {activeFilterCount > 0 && (
                  <button className="btn-reset-filters" onClick={resetFilters}>
                    ✕ Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : filteredReports.length === 0 ? (
            <div className="empty-state">
              {reports.length === 0 ? (
                <>
                  <p>No reports yet. Create your first one!</p>
                  <button onClick={() => navigate('/reports/create')} className="btn btn-primary">
                    Create Report
                  </button>
                </>
              ) : (
                <>
                  <p>No reports match the current filters.</p>
                  <button onClick={resetFilters} className="btn btn-secondary">Clear Filters</button>
                </>
              )}
            </div>
          ) : (
            <div className="reports-grid">
              {filteredReports.map((report) => {
                const sc = getSeverityCounts(report.vulnerabilities);
                const isExpanded = expandedReport === report._id;
                const total = report.vulnerabilities?.length || 0;
                const status = report.status || 'Editing';
                return (
                  <div key={report._id} className="report-card">
                    <div className="card-main">
                      <div className="card-header">
                        <div className="card-title-row">
                          <h3>{report.projectName}</h3>
                          <div className="status-toggle-group">
                            {STATUS_OPTIONS.map(s => (
                              <button
                                key={s}
                                className={`status-btn status-btn-${s.toLowerCase()} ${status === s ? 'active' : ''}`}
                                onClick={() => handleStatusChange(report._id, s)}
                                title={`Mark as ${s}`}
                              >
                                {s === 'Editing' ? '✏️' : '✅'} {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="card-meta">
                          <span className="card-client">{report.client_name || 'No client specified'}</span>
                          <span className="card-date">Updated: {formatDate(report.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="card-body">
                        <div className="card-info-group">
                          <span className="info-label">Testing Period:</span>
                          <span className="info-value-text">
                            {formatDate(report.testing_start_date)} – {formatDate(report.testing_end_date)}
                          </span>
                        </div>
                        <div className="severity-distribution">
                          <div className="severity-bar-container">
                            {sc.critical > 0 && <div className="severity-bar severity-bar-critical" style={{ width: `${(sc.critical/total)*100}%` }} title={`Critical: ${sc.critical}`}><span className="severity-count">{sc.critical}</span></div>}
                            {sc.high > 0    && <div className="severity-bar severity-bar-high"     style={{ width: `${(sc.high/total)*100}%` }}     title={`High: ${sc.high}`}><span className="severity-count">{sc.high}</span></div>}
                            {sc.medium > 0  && <div className="severity-bar severity-bar-medium"   style={{ width: `${(sc.medium/total)*100}%` }}   title={`Medium: ${sc.medium}`}><span className="severity-count">{sc.medium}</span></div>}
                            {sc.low > 0     && <div className="severity-bar severity-bar-low"      style={{ width: `${(sc.low/total)*100}%` }}      title={`Low: ${sc.low}`}><span className="severity-count">{sc.low}</span></div>}
                          </div>
                          <div className="severity-labels">
                            {sc.critical > 0 && <span className="severity-label label-critical">Critical: {sc.critical}</span>}
                            {sc.high > 0     && <span className="severity-label label-high">High: {sc.high}</span>}
                            {sc.medium > 0   && <span className="severity-label label-medium">Medium: {sc.medium}</span>}
                            {sc.low > 0      && <span className="severity-label label-low">Low: {sc.low}</span>}
                          </div>
                        </div>
                        <button className="expand-btn" onClick={() => toggleExpand(report._id)}>
                          {isExpanded ? '▲ Hide Details' : `▼ View ${total} Vulnerabilities`}
                        </button>
                      </div>

                      <div className="card-actions">
                        <button onClick={() => navigate(`/reports/edit/${report._id}`)} className="btn btn-sm btn-secondary">Edit</button>
                        <button onClick={() => handleGenerateDoc(report._id, report.projectName)} className="btn btn-sm btn-primary">📥 Download DOCX</button>
                        <button onClick={() => handleDelete(report._id)} className="btn btn-sm btn-danger">Delete</button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="card-expanded">
                        <div className="vulnerabilities-list">
                          <h4>Vulnerabilities</h4>
                          {report.vulnerabilities?.length > 0 ? (
                            <div className="vuln-items">
                              {report.vulnerabilities.map((vuln, idx) => (
                                <div key={idx} className="vuln-item">
                                  <span className={`vuln-severity severity-${vuln.severity?.toLowerCase() || 'unknown'}`}>{vuln.severity || 'N/A'}</span>
                                  <span className="vuln-name">{vuln.name || 'Unnamed Vulnerability'}</span>
                                  {vuln.cvss_score && <span className="vuln-cvss">CVSS: {vuln.cvss_score}</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="no-vulns">No vulnerabilities added yet</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <Copyright />
        </main>
      </div>

      {showTemplateManager && <TemplateManager onClose={() => setShowTemplateManager(false)} />}
    </div>
  );
}

export default Dashboard;
