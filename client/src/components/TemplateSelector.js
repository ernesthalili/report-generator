import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TemplateSelector.css';

function TemplateSelector({ selectedTemplateId, onTemplateChange }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await axios.get('/api/templates');
      setTemplates(res.data.data);
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value === '' ? null : e.target.value;
    onTemplateChange(value);
  };

  if (loading) {
    return (
      <div className="form-group">
        <label>Report Template</label>
        <div className="template-selector-loading">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="form-group">
      <label>Report Template</label>
      <select 
        value={selectedTemplateId || ''} 
        onChange={handleChange}
        className="template-selector"
      >
        <option value="">Default WAPT Template</option>
        {templates.map(template => (
          <option key={template._id} value={template._id}>
            {template.name} {template.isOwner ? '(Your template)' : `(by ${template.uploadedBy?.username})`}
          </option>
        ))}
      </select>
      {error && <small className="error-text">{error}</small>}
      <small className="help-text">
        Select a custom template or use the default. You can manage templates in the Templates page.
      </small>
    </div>
  );
}

export default TemplateSelector;
