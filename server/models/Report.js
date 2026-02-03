const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const targetSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  url:      { type: String, required: true },
  severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'] }
});

const userAccountSchema = new mongoose.Schema({
  username:    { type: String, required: true },
  description: { type: String }
});

const vulnerabilitySchema = new mongoose.Schema({
  // single-value fields per vulnerability
  name:          { type: String, required: true },
  severity:      { type: String, required: true, enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'] },
  priority:      { type: String },
  cvssScore:     { type: String },
  cvssVector:    { type: String },
  description:   { type: String },
  impact:        { type: String },
  remediation:   { type: String },

  // repeatable sub-arrays  →  VULN1 URL1, VULN1 URL2 …
  urls:          [{ type: String }],   // VULN# URL#
  parameters:    [{ type: String }],   // VULN# PARAMETER#
  methodologies: [{ type: String }],   // VULN# MET#
  attacks:       [{ type: String }],   // VULN# ATTACK#   ← NEW
  images:        [{ type: String }]    // VULN# IMAGE#    ← was dead, now used
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
  projectName:        { type: String, required: [true, 'Please provide a project name'], trim: true },
  client:             { type: String },                // CLIENT
  testingCompanyName: { type: String },                // TESTING COMPANY NAME
  testingMode:        { type: String },                // TESTING MODE
  startDate:          { type: Date },                  // START OF ACTIVITY
  endDate:            { type: Date },                  // END OF ACTIVITY
  duration:           { type: String },                // DURATION OF ACTIVITY  (free text: "5 days", "2 weeks" …)
  executiveSummary:   { type: String },                // EXECUTIVE SUMMARY

  // ---- DYNAMIC collections (appear N times per report) ----
  targets:         [targetSchema],          // TARGET#, TARGET# URL, TARGET# SEVERITY
  userAccounts:    [userAccountSchema],     // USERNAME#, USERNAME# DESCRIPTION
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