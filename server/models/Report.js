const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const targetSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  url:      { type: String, required: true },
  severity: { type: String }  // Removed enum to allow Italian values
});

const userAccountSchema = new mongoose.Schema({
  username:    { type: String, required: true },
  description: { type: String }
});

const testerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String },
  date: { type: Date }
});

const endpointSchema = new mongoose.Schema({
  index:       { type: Number },
  http_method: { type: String },
  path:        { type: String },
  parameter:   { type: String }
});

const attackSchema = new mongoose.Schema({
  type:    { type: String, enum: ['text', 'image'], required: true },
  text:    { type: String },   // For text type
  image:   { type: String },   // For image type (file path or name)
  caption: { type: String }    // For image type (caption)
});

const vulnerabilitySchema = new mongoose.Schema({
  // single-value fields per vulnerability
  name:          { type: String, required: true },
  severity:      { type: String, required: true },  // Removed enum to allow Italian values
  priority:      { type: String },
  cvss_score:    { type: Number },          // Changed to cvss_score (snake_case) and Number
  cvss_vector:   { type: String },          // Changed to cvss_vector (snake_case)
  description:   { type: String },
  impact:        { type: String },
  remediation:   { type: String },
  
  // OWASP Top 10 classification
  owasp_category: { type: String },  // e.g., "A01 - Broken Access Control"
  
  // Internal notes (not exported to report)
  internal_notes: { type: String },

  // New structure: endpoints instead of separate urls/parameters/methodologies
  endpoints:     [endpointSchema],
  
  // New structure: attacks can be text or images with captions
  attacks:       [attackSchema]
});

// ---------------------------------------------------------------------------
// Main report schema
// ---------------------------------------------------------------------------

const reportSchema = new mongoose.Schema({
  // owner
  user: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true
  },

  // ---- STATIC fields (appear exactly once per report) ----
  projectName:             { type: String, required: [true, 'Please provide a project name'], trim: true },
  client_name:             { type: String },                // CLIENT (renamed from 'client')
  testing_company_name:    { type: String },                // TESTING COMPANY NAME (renamed from 'testingCompanyName')
  testing_mode:            { type: String },                // TESTING MODE (renamed from 'testingMode')
  testing_start_date:      { type: Date },                  // START OF ACTIVITY (renamed from 'startDate')
  testing_end_date:        { type: Date },                  // END OF ACTIVITY (renamed from 'endDate')
  testing_duration:        { type: String },                // DURATION OF ACTIVITY (renamed from 'duration')
  executive_summary:       { type: String },                // EXECUTIVE SUMMARY (renamed from 'executiveSummary')
  
  // ---- NEW fields for revisioner ----
  revisioner_name:         { type: String },
  revisioner_role:         { type: String },
  revisioner_date:         { type: Date },
  
  // ---- NEW fields for approver ----
  approver_name:           { type: String },
  approver_date:           { type: Date },

  // ---- DYNAMIC collections (appear N times per report) ----
  targets:         [targetSchema],          // TARGET#, TARGET# URL, TARGET# SEVERITY
  credentials:     [userAccountSchema],     // USERNAME#, USERNAME# DESCRIPTION (renamed from 'userAccounts')
  testers:         [testerSchema],          // NEW: Testers array
  vulnerabilities: [vulnerabilitySchema],   // VULNERABILITY# …

  // ---------------------------------------------------------------------------
  // housekeeping
  // ---------------------------------------------------------------------------
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

reportSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Report', reportSchema);
