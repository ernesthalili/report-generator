const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const Report = require('../models/Report');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const expressions = require('angular-expressions');
const ImageModule = require('docxtemplater-image-module-free');

// Configure angular-expressions for docxtemplater
function angularParser(tag) {
  tag = tag
    .replace(/^\.$/, "this")
    .replace(/('|')/g, "'")
    .replace(/("|")/g, '"');
  const expr = expressions.compile(tag);
  return {
    get: function (scope, context) {
      let obj = {};
      const scopeList = context.scopeList;
      const num = context.num;
      for (let i = 0, len = num + 1; i < len; i++) {
        obj = Object.assign(obj, scopeList[i]);
      }
      return expr(scope, obj);
    },
  };
}

// Configure image module options
const imageOpts = {
  centered: false,
  getImage: function (tagValue, tagName) {
    // tagValue is the image path (e.g., "/uploads/filename.png")
    // Convert relative path to absolute path
    const projectRoot = path.join(__dirname, '../..');
    const imagePath = tagValue.startsWith('/') 
      ? path.join(projectRoot, tagValue) 
      : path.join(projectRoot, 'uploads', tagValue);
    
    console.log(`Loading image: ${imagePath}`);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.error(`Image not found: ${imagePath}`);
      // Return a 1x1 transparent PNG as placeholder
      return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    }
    
    return fs.readFileSync(imagePath);
  },
  getSize: function (img, tagValue, tagName) {
    // Set default image size
    // You can make this dynamic based on actual image dimensions if needed
    return [600, 400]; // width, height in pixels
  }
};

// ---------------------------------------------------------------------------
// Multer configuration for file uploads
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Extract reportId and vulnIndex from request body or query
    const reportId = req.body.reportId || req.query.reportId || 'temp';
    const vulnIndex = req.body.vulnIndex || req.query.vulnIndex || '0';
    
    // Create path: /uploads/report-{reportId}/vuln-{vulnIndex}/
    const uploadsDir = path.join(__dirname, '../../uploads', `report-${reportId}`, `vuln-${vulnIndex}`);
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Use timestamp + original name to avoid conflicts
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 }, // 10MB default
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   GET /api/reports
// @desc    Get all reports for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id }).sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports'
    });
  }
});

// @route   GET /api/reports/:id
// @desc    Get single report
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Make sure user owns the report
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this report'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report'
    });
  }
});

// @route   POST /api/reports
// @desc    Create new report
// @access  Private
router.post('/', [
  protect,
  body('projectName').trim().notEmpty().withMessage('Project name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const reportData = {
      ...req.body,
      user: req.user._id
    };

    const report = await Report.create(reportData);

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating report'
    });
  }
});

// @route   PUT /api/reports/:id
// @desc    Update report
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Make sure user owns the report
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this report'
      });
    }

    report = await Report.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating report'
    });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete report
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Make sure user owns the report
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this report'
      });
    }

    await report.deleteOne();

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting report'
    });
  }
});

// @route   POST /api/reports/upload-images
// @desc    Upload vulnerability proof-of-concept images
// @access  Private
router.post('/upload-images', protect, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const reportId = req.body.reportId || req.query.reportId || 'temp';
    const vulnIndex = req.body.vulnIndex || req.query.vulnIndex || '0';

    // Return the file paths with the new structure
    const filePaths = req.files.map(file => 
      `/uploads/report-${reportId}/vuln-${vulnIndex}/${file.filename}`
    );
    
    res.json({
      success: true,
      files: filePaths
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading files'
    });
  }
});

// @route   POST /api/reports/:id/generate
// @desc    Generate DOCX from report
// @access  Private
router.post('/:id/generate', protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Make sure user owns the report
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to generate this report'
      });
    }

    // Load the template
    const templatePath = path.join(__dirname, '../../templates/WAPT_template.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    // Initialize ImageModule
    const imageModule = new ImageModule(imageOpts);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,  // Add angular parser to support conditionals
      modules: [imageModule]   // Add image module
    });

    // Prepare data for template
    const templateData = prepareTemplateData(report);

    // Debug: Log the template data to console
    console.log('Template Data:', JSON.stringify(templateData, null, 2));

    // Render the document
    doc.render(templateData);

    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    // Set headers and send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${report.projectName.replace(/[^a-z0-9]/gi, '_')}_report.docx"`);
    res.send(buf);

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating document: ' + error.message
    });
  }
});

// Helper function to prepare data for template matching the docxtemplater tags
function prepareTemplateData(report) {
  // Helper function to format dates
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('it-IT', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // Base template data with single-value fields
  const data = {
    // Client and testing company info
    client_name: report.client_name || '',
    testing_company_name: report.testing_company_name || '',
    testing_mode: report.testing_mode || '',
    testing_start_date: formatDate(report.testing_start_date),
    testing_end_date: formatDate(report.testing_end_date),
    testing_duration: report.testing_duration || '',
    
    // Executive summary
    executive_summary: report.executive_summary || '',
    
    // Revisioner info
    revisioner_name: report.revisioner_name || '',
    revisioner_role: report.revisioner_role || '',
    revisioner_date: formatDate(report.revisioner_date),
    
    // Approver info
    approver_name: report.approver_name || '',
    approver_date: formatDate(report.approver_date),
    
    // Arrays for loops
    targets: [],
    credentials: [],
    testers: [],
    vulnerabilities: []
  };

  // Process targets array
  if (report.targets && report.targets.length > 0) {
    data.targets = report.targets.map(target => ({
      name: target.name || '',
      url: target.url || '',
      severity: target.severity || ''
    }));
  }

  // Process credentials array (renamed from userAccounts in model)
  if (report.credentials && report.credentials.length > 0) {
    data.credentials = report.credentials.map(cred => ({
      username: cred.username || '',
      description: cred.description || ''
    }));
  }

  // Process testers array
  if (report.testers && report.testers.length > 0) {
    data.testers = report.testers.map(tester => ({
      name: tester.name || '',
      role: tester.role || '',
      date: formatDate(tester.date)
    }));
  }

  // Process vulnerabilities array with nested structures
  if (report.vulnerabilities && report.vulnerabilities.length > 0) {
    data.vulnerabilities = report.vulnerabilities.map(vuln => {
      const vulnData = {
        name: vuln.name || '',
        severity: vuln.severity || '',
        priority: vuln.priority || '',
        cvss_score: vuln.cvss_score || 0,
        cvss_vector: vuln.cvss_vector || '',
        description: vuln.description || '',
        impact: vuln.impact || '',
        remediation: vuln.remediation || '',
        endpoints: [],
        attacks: []
      };

      // Process endpoints array within vulnerability
      if (vuln.endpoints && vuln.endpoints.length > 0) {
        vulnData.endpoints = vuln.endpoints.map(endpoint => ({
          index: endpoint.index || '',
          http_method: endpoint.http_method || '',
          path: endpoint.path || '',
          parameter: endpoint.parameter || ''
        }));
      }

      // Process attacks array within vulnerability
      if (vuln.attacks && vuln.attacks.length > 0) {
        vulnData.attacks = vuln.attacks.map(attack => {
          const attackData = {
            type: attack.type || 'text'
          };

          if (attack.type === 'text') {
            attackData.text = attack.text || '';
          } else if (attack.type === 'image') {
            // Store the image path - the ImageModule will handle loading it
            attackData.image = attack.image || '';
            attackData.caption = attack.caption || '';
          }

          return attackData;
        });
      }

      return vulnData;
    });
  }

  return data;
}

module.exports = router;