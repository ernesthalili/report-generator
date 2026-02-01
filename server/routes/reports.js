const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const Report = require('../models/Report');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

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
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });

    // Prepare data for template
    const templateData = prepareTemplateData(report);

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

// Helper function to prepare data for template
function prepareTemplateData(report) {
  const data = {
    'TESTING COMPANY NAME': report.testingCompanyName || '',
    'TESTING MODE': report.testingMode || ''
  };

  // Add targets
  report.targets.forEach((target, index) => {
    const num = index + 1;
    data[`TARGET${num} NAME`] = target.name || '';
    data[`TARGET${num} URL`] = target.url || '';
    data[`TARGET${num} SEVERITY`] = target.severity || '';
  });

  // Add user accounts
  report.userAccounts.forEach((account, index) => {
    const num = index + 1;
    data[`USERNAME${num}`] = account.username || '';
    data[`USERNAME${num} DESCRIPTION`] = account.description || '';
  });

  // Add vulnerabilities
  report.vulnerabilities.forEach((vuln, index) => {
    const num = index + 1;
    data[`VULNERABILITY${num} NAME`] = vuln.name || '';
    data[`VULNERABILITY${num} SEVERITY`] = vuln.severity || '';
    data[`VULNERABILITY${num} PRIORITY`] = vuln.priority || '';
    data[`CVSS VULN${num}`] = vuln.cvssScore || '';
    data[`CVSS VECTOR VULN${num}`] = vuln.cvssVector || '';
    data[`VULN${num} DESCRIPTION`] = vuln.description || '';
    data[`VULN${num} DESCRIPTION1`] = vuln.description1 || '';
    data[`VULN${num} DESCRIPTION2`] = vuln.description2 || '';
    data[`VULN${num} IMPACT`] = vuln.impact || '';
    data[`VULN${num} REMEDIETION`] = vuln.remediation || '';
    
    // Add targets for vulnerability
    if (vuln.targets) {
      vuln.targets.forEach((target, tIndex) => {
        data[`VULN${num} TARGET${tIndex + 1}`] = target || '';
      });
    }
    
    // Add parameters
    if (vuln.parameters) {
      vuln.parameters.forEach((param, pIndex) => {
        data[`VULN${num} PARAMETER${pIndex + 1}`] = param || '';
      });
    }
    
    // Add methodologies
    if (vuln.methodologies) {
      vuln.methodologies.forEach((met, mIndex) => {
        data[`VULN${num} MET${mIndex + 1}`] = met || '';
      });
    }
  });

  return data;
}

module.exports = router;
