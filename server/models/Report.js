const mongoose = require('mongoose');

const vulnerabilitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  severity: { type: String, required: true, enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'] },
  priority: { type: String },
  cvssScore: { type: String },
  cvssVector: { type: String },
  description: { type: String },
  description1: { type: String },
  description2: { type: String },
  impact: { type: String },
  remediation: { type: String },
  targets: [{ type: String }],
  parameters: [{ type: String }],
  methodologies: [{ type: String }],
  images: [{ type: String }] // File paths
});

const targetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  severity: { type: String }
});

const userAccountSchema = new mongoose.Schema({
  username: { type: String, required: true },
  description: { type: String }
});

const reportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectName: {
    type: String,
    required: [true, 'Please provide a project name'],
    trim: true
  },
  // Project metadata
  testingCompanyName: { type: String },
  testingMode: { type: String },
  
  // Targets
  targets: [targetSchema],
  
  // User accounts tested
  userAccounts: [userAccountSchema],
  
  // Vulnerabilities
  vulnerabilities: [vulnerabilitySchema],
  
  // Template used
  templatePath: { type: String },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
reportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Report', reportSchema);
