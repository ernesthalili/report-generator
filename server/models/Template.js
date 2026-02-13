const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  // Template name (without extension)
  name: {
    type: String,
    required: [true, 'Please provide a template name'],
    trim: true
  },
  
  // Original filename
  filename: {
    type: String,
    required: true
  },
  
  // Path to the template file
  filePath: {
    type: String,
    required: true
  },
  
  // User who uploaded the template
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Whether this is the default template
  isDefault: {
    type: Boolean,
    default: false
  },
  
  // Upload date
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  
  // Last modified date
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

templateSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Template', templateSchema);
