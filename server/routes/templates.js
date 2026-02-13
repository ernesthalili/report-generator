const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Template = require('../models/Template');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configure multer for template uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.user._id;
    const userTemplatesDir = path.join(__dirname, '../../templates', `user-${userId}`);
    
    // Create user template directory if it doesn't exist
    if (!fs.existsSync(userTemplatesDir)) {
      try {
        fs.mkdirSync(userTemplatesDir, { recursive: true });
      } catch (err) {
        console.error('Error creating user template directory:', err);
        return cb(new Error('Failed to create template directory'), null);
      }
    }
    
    cb(null, userTemplatesDir);
  },
  filename: function (req, file, cb) {
    // Use timestamp + sanitized original name
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}-${sanitizedName}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10485760 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    // Accept only .docx files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.originalname.toLowerCase().endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'), false);
    }
  }
});

// @route   GET /api/templates
// @desc    Get all templates (with ownership info)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const templates = await Template.find().populate('uploadedBy', 'username').sort({ uploadedAt: -1 });
    
    // Add ownership flag to each template
    const templatesWithOwnership = templates.map(template => ({
      ...template.toObject(),
      isOwner: template.uploadedBy._id.toString() === req.user._id.toString()
    }));
    
    res.json({
      success: true,
      count: templates.length,
      data: templatesWithOwnership
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching templates'
    });
  }
});

// @route   POST /api/templates/upload
// @desc    Upload a new template
// @access  Private
router.post('/upload', protect, upload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      // Delete the uploaded file if name is not provided
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Template name is required'
      });
    }

    // Create template record
    const template = await Template.create({
      name: name.trim(),
      filename: req.file.filename,
      filePath: req.file.path,
      uploadedBy: req.user._id
    });

    const populatedTemplate = await Template.findById(template._id).populate('uploadedBy', 'username');

    res.status(201).json({
      success: true,
      message: 'Template uploaded successfully',
      data: {
        ...populatedTemplate.toObject(),
        isOwner: true
      }
    });
  } catch (error) {
    console.error('Upload template error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading template: ' + error.message
    });
  }
});

// @route   DELETE /api/templates/:id
// @desc    Delete a template
// @access  Private (only owner can delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check if user is the owner
    if (template.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this template'
      });
    }

    // Check if template is marked as default
    if (template.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the default template'
      });
    }

    // Delete the file from filesystem
    if (fs.existsSync(template.filePath)) {
      try {
        fs.unlinkSync(template.filePath);
        console.log(`Deleted template file: ${template.filePath}`);
      } catch (err) {
        console.error('Error deleting template file:', err);
      }
    }

    // Delete from database
    await Template.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting template'
    });
  }
});

// @route   GET /api/templates/default
// @desc    Get the default template info
// @access  Private
router.get('/default', protect, async (req, res) => {
  try {
    const defaultTemplate = {
      _id: 'default',
      name: 'WAPT Default Template',
      filename: 'WAPT_template.docx',
      filePath: path.join(__dirname, '../../templates/WAPT_template.docx'),
      isDefault: true,
      uploadedBy: null
    };

    res.json({
      success: true,
      data: defaultTemplate
    });
  } catch (error) {
    console.error('Get default template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching default template'
    });
  }
});

module.exports = router;
