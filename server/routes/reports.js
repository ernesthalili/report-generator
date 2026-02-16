const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const Report = require('../models/Report');
const Template = require('../models/Template');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const expressions = require('angular-expressions');
const ImageModule = require('docxtemplater-image-module-free');
const CrossReferenceModule = require('../../docxtemplater-crossref-module');
const sizeOf = require('image-size');

// Configure angular-expressions for docxtemplater  
function angularParser(tag) {
  // For tags that start with & or $, return a simple getter that returns undefined
  // This prevents angular-expressions from trying to parse them
  // The CrossReferenceModule will handle these tags via its own parse() method
  if (tag.startsWith('&') || tag.startsWith('$')) {
    return {
      get: function(scope, context) {
        // Return undefined - the module will handle this tag
        return undefined;
      }
    };
  }
  
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
    // Get actual image dimensions and maintain aspect ratio
    const projectRoot = path.join(__dirname, '../..');
    const imagePath = tagValue.startsWith('/') 
      ? path.join(projectRoot, tagValue) 
      : path.join(projectRoot, 'uploads', tagValue);
    
    try {
      if (fs.existsSync(imagePath)) {
        const dimensions = sizeOf(imagePath);
        const originalWidth = dimensions.width;
        const originalHeight = dimensions.height;
        
        // Maximum width constraint
        const maxWidth = 600;
        
        // Calculate scaled dimensions maintaining aspect ratio
        let width = originalWidth;
        let height = originalHeight;
        
        if (width > maxWidth) {
          const scaleFactor = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * scaleFactor);
        }
        
        console.log(`Image dimensions: original=${originalWidth}x${originalHeight}, scaled=${width}x${height}`);
        return [width, height];
      }
    } catch (error) {
      console.error(`Error getting image size for ${imagePath}:`, error);
    }
    
    // Fallback to default size if error occurs
    return [600, 400];
  }
};

// ---------------------------------------------------------------------------
// Multer configuration for file uploads
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Extract reportId and vulnIdentifier from URL params (req.params)
    // vulnIdentifier can be either a vulnId (e.g., "a1b2c3d4") or a numeric index (e.g., "0")
    // For multipart/form-data, req.body is not available during file processing
    const reportId = req.params.reportId || req.query.reportId;
    const vulnIdentifier = req.params.vulnIdentifier || req.query.vulnIdentifier || '0';
    
    // Validate reportId is present
    if (!reportId) {
      return cb(new Error('Report ID is required for file upload'), null);
    }
    
    // Validate reportId format (UUID or MongoDB ObjectId)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const objectIdRegex = /^[0-9a-f]{24}$/i;
    
    if (!uuidRegex.test(reportId) && !objectIdRegex.test(reportId)) {
      return cb(new Error('Invalid report ID format'), null);
    }
    
    // Create path: /uploads/report-{reportId}/vuln-{vulnIdentifier}/
    const uploadsDir = path.join(__dirname, '../../uploads', `report-${reportId}`, `vuln-${vulnIdentifier}`);
    
    // Check if base report folder exists
    const reportDir = path.join(__dirname, '../../uploads', `report-${reportId}`);
    if (!fs.existsSync(reportDir)) {
      return cb(new Error(`Report folder not found: report-${reportId}. Please ensure the report is initialized.`), null);
    }
    
    // Create vulnerability subfolder if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
      } catch (err) {
        console.error('Error creating upload directory:', err);
        return cb(new Error('Failed to create upload directory. Check server permissions.'), null);
      }
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

// @route   POST /api/reports/initialize-folder
// @desc    Initialize folder structure for a new report
// @access  Private
router.post('/initialize-folder', protect, async (req, res) => {
  try {
    const { reportId } = req.body;
    
    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID is required'
      });
    }
    
    // Validate reportId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reportId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID format'
      });
    }
    
    const reportDir = path.join(__dirname, '../../uploads', `report-${reportId}`);
    
    // Check if folder already exists
    if (fs.existsSync(reportDir)) {
      return res.json({
        success: true,
        message: 'Report folder already exists',
        reportId
      });
    }
    
    // Create the folder
    try {
      fs.mkdirSync(reportDir, { recursive: true });
      console.log(`Created report folder: report-${reportId}`);
    } catch (err) {
      console.error('Error creating report folder:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to create report folder. Check server permissions.'
      });
    }
    
    res.json({
      success: true,
      message: 'Report folder initialized successfully',
      reportId
    });
  } catch (error) {
    console.error('Initialize folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing report folder'
    });
  }
});

// @route   GET /api/reports
// @desc    Get all reports for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id })
      .populate('template', 'name')
      .sort({ updatedAt: -1 });
    
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
    const report = await Report.findById(req.params.id).populate('template', 'name');

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

    // Ensure report folder exists when accessing for editing
    const reportDir = path.join(__dirname, '../../uploads', `report-${req.params.id}`);
    if (!fs.existsSync(reportDir)) {
      console.warn(`Report folder missing for report ${req.params.id}, creating...`);
      try {
        fs.mkdirSync(reportDir, { recursive: true });
      } catch (err) {
        console.error('Error creating report folder:', err);
        // Don't fail the request, just log the warning
        // The folder will be created when images are uploaded
      }
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
  body('projectName').trim().notEmpty().withMessage('Project name is required'),
  body('reportId').trim().notEmpty().withMessage('Report ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { reportId, ...reportData } = req.body;
    
    // Validate reportId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reportId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID format. Expected UUID.'
      });
    }
    
    // Check if report folder exists (it should have been created during initialization)
    const reportDir = path.join(__dirname, '../../uploads', `report-${reportId}`);
    if (!fs.existsSync(reportDir)) {
      // Auto-create if missing (shouldn't happen, but defensive programming)
      console.warn(`Report folder not found during save, creating: report-${reportId}`);
      try {
        fs.mkdirSync(reportDir, { recursive: true });
      } catch (err) {
        console.error('Error creating report folder:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to create report folder. Check server permissions.'
        });
      }
    }

    // Create the report in database with the provided reportId as a custom field
    const finalReportData = {
      ...reportData,
      user: req.user._id,
      customReportId: reportId  // Store the UUID for reference
    };

    const report = await Report.create(finalReportData);
    
    // Rename the folder from report-{uuid} to report-{mongoId}
    // This maintains consistency with existing folder structure
    const newReportDir = path.join(__dirname, '../../uploads', `report-${report._id}`);
    
    try {
      // Only rename if the directories are different
      if (reportDir !== newReportDir) {
        if (fs.existsSync(newReportDir)) {
          // If destination exists, remove it first (shouldn't happen)
          fs.rmSync(newReportDir, { recursive: true, force: true });
        }
        fs.renameSync(reportDir, newReportDir);
        console.log(`Renamed folder: report-${reportId} -> report-${report._id}`);
        
        // Update image paths in the report data
        if (report.vulnerabilities && report.vulnerabilities.length > 0) {
          let updated = false;
          report.vulnerabilities.forEach(vuln => {
            if (vuln.attacks && vuln.attacks.length > 0) {
              vuln.attacks.forEach(attack => {
                if (attack.type === 'image' && attack.image) {
                  attack.image = attack.image.replace(`report-${reportId}`, `report-${report._id}`);
                  updated = true;
                }
              });
            }
          });
          
          if (updated) {
            await report.save();
          }
        }
      }
    } catch (err) {
      console.error('Error renaming report folder:', err);
      // Don't fail the request, just log the error
      // The report is created, just the folder rename failed
    }

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

    // Ensure report folder exists
    const reportDir = path.join(__dirname, '../../uploads', `report-${req.params.id}`);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // CLEANUP: Delete orphaned vulnerability folders
    // Get the old vulnerability IDs before update
    const oldVulnIds = new Set(
      (report.vulnerabilities || [])
        .map(v => v.vulnId)
        .filter(Boolean)
    );

    // Get the new vulnerability IDs from the request
    const newVulnIds = new Set(
      (req.body.vulnerabilities || [])
        .map(v => v.vulnId)
        .filter(Boolean)
    );

    // Find deleted vulnerability IDs
    const deletedVulnIds = [...oldVulnIds].filter(id => !newVulnIds.has(id));

    // Delete folders for removed vulnerabilities
    if (deletedVulnIds.length > 0 && fs.existsSync(reportDir)) {
      console.log(`Cleaning up ${deletedVulnIds.length} orphaned vulnerability folder(s)...`);
      
      deletedVulnIds.forEach(vulnId => {
        const vulnDir = path.join(reportDir, `vuln-${vulnId}`);
        if (fs.existsSync(vulnDir)) {
          try {
            fs.rmSync(vulnDir, { recursive: true, force: true });
            console.log(`Deleted orphaned folder: ${vulnDir}`);
          } catch (err) {
            console.error(`Error deleting vulnerability folder ${vulnDir}:`, err);
          }
        }
      });
    }

    // Update the report
    report = await Report.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('template', 'name');

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

    // Delete the report folder and all its contents
    const reportDir = path.join(__dirname, '../../uploads', `report-${req.params.id}`);
    if (fs.existsSync(reportDir)) {
      try {
        fs.rmSync(reportDir, { recursive: true, force: true });
      } catch (err) {
        console.error('Error deleting report folder:', err);
      }
    }

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

// @route   POST /api/reports/:reportId/upload-images/:vulnIdentifier?
// @desc    Upload vulnerability proof-of-concept images
// @access  Private
// @param   vulnIdentifier - Can be vulnId (e.g., "a1b2c3d4") or numeric index (e.g., "0") for backward compatibility
router.post('/:reportId/upload-images/:vulnIdentifier?', protect, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const reportId = req.params.reportId;
    const vulnIdentifier = req.params.vulnIdentifier || '0';
    
    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID is required'
      });
    }

    // Return the file paths with the new structure
    const filePaths = req.files.map(file => 
      `/uploads/report-${reportId}/vuln-${vulnIdentifier}/${file.filename}`
    );
    
    console.log(`Uploaded ${filePaths.length} images to report-${reportId}/vuln-${vulnIdentifier}`);
    
    res.json({
      success: true,
      files: filePaths,
      message: `Successfully uploaded ${filePaths.length} image(s)`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading files'
    });
  }
});

// @route   POST /api/reports/:id/generate
// @desc    Generate DOCX from report
// @access  Private
router.post('/:id/generate', protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('template');

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

    // Determine which template to use
    let templatePath;
    if (report.template && report.template.filePath) {
      // Use custom template
      templatePath = report.template.filePath;
      console.log(`Using custom template: ${report.template.name}`);
    } else {
      // Use default template
      templatePath = path.join(__dirname, '../../templates/WAPT_template.docx');
      console.log('Using default template');
    }

    // Check if template exists
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        success: false,
        message: 'Template file not found'
      });
    }

    // Load the template
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    // Initialize ImageModule
    const imageModule = new ImageModule(imageOpts);
    
    // Initialize CrossReferenceModule
    const crossRefModule = new CrossReferenceModule({
      figureLabel: 'Figure',
      bookmarkPrefix: '_Fig',
      startNumber: 1
    });
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,  // Add angular parser to support conditionals
      modules: [imageModule, crossRefModule]   // Add image module and crossref module
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

    // Generate filename in format: [Client name] - Report Tecnico - WAPT - [report name] - [Month] - [Year]
    const generateFilename = (report) => {
      const italianMonths = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
      ];
      
      const clientName = report.client_name || 'Client';
      const reportName = report.projectName || 'Report';
      
      // Get month and year from approver_date
      let month = '';
      let year = '';
      if (report.approver_date) {
        const date = new Date(report.approver_date);
        month = italianMonths[date.getMonth()];
        year = date.getFullYear();
      }
      
      // Build filename parts
      const parts = [clientName, 'Report Tecnico', 'WAPT', reportName];
      if (month) parts.push(month);
      if (year) parts.push(year);
      
      return parts.join(' - ') + '.docx';
    };

    const filename = generateFilename(report);

    // Set headers and send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
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