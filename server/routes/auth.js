const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailChangeVerification
} = require('../utils/emailService');

// ── Helpers ────────────────────────────────────────────────────────────────────

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const hashToken = (raw) =>
  crypto.createHash('sha256').update(raw).digest('hex');

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email or username' });
    }

    const user = await User.create({ username, email, password });

    // Generate and send verification email
    const token = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });
    await sendVerificationEmail(user, token);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account before logging in.'
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// ── GET /api/auth/verify-email?token=... ──────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const hashed = hashToken(req.query.token);

    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: 'Server error during email verification' });
  }
});

// ── POST /api/auth/resend-verification ────────────────────────────────────────
router.post('/resend-verification', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    // Always respond the same way to prevent email enumeration
    if (!user || user.isEmailVerified) {
      return res.json({ success: true, message: 'If that email exists and is unverified, a new link has been sent.' });
    }

    const token = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });
    await sendVerificationEmail(user, token);

    res.json({ success: true, message: 'If that email exists and is unverified, a new link has been sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Block unverified users
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in.',
        needsVerification: true
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    // Always respond the same way to prevent email enumeration
    if (!user || !user.isEmailVerified) {
      return res.json({ success: true, message: 'If that email is registered and verified, a reset link has been sent.' });
    }

    const token = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });
    await sendPasswordResetEmail(user, token);

    res.json({ success: true, message: 'If that email is registered and verified, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const hashed = hashToken(req.body.token);

    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: { id: req.user._id, username: req.user.username, email: req.user.email }
  });
});

// ── PUT /api/auth/settings/password ───────────────────────────────────────────
// Change password while logged in (requires current password)
router.put('/settings/password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = req.body.newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/auth/settings/email ───────────────────────────────────────────────
// Request email change — sends verification to the new address
router.put('/settings/email', protect, [
  body('newEmail').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password confirmation is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { newEmail, password } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Password is incorrect.' });
    }

    // Check the new email isn't already taken
    const taken = await User.findOne({ email: newEmail });
    if (taken) {
      return res.status(400).json({ success: false, message: 'That email address is already in use.' });
    }

    const token = user.generatePendingEmailToken(newEmail);
    await user.save({ validateBeforeSave: false });
    await sendEmailChangeVerification(user, newEmail, token);

    res.json({ success: true, message: `A verification link has been sent to ${newEmail}. Click it to confirm the change.` });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/auth/verify-email-change?token=... ───────────────────────────────
router.get('/verify-email-change', async (req, res) => {
  try {
    const hashed = hashToken(req.query.token);

    const user = await User.findOne({
      pendingEmailToken: hashed,
      pendingEmailExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired email change link.' });
    }

    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.pendingEmailToken = undefined;
    user.pendingEmailExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Email address updated successfully. Please log in again.' });
  } catch (error) {
    console.error('Verify email change error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
