const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Email templates ────────────────────────────────────────────────────────────

const emailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; background: #0a0a0a; font-family: 'Courier New', monospace; color: #ffffff; }
    .container { max-width: 520px; margin: 40px auto; background: #1a1a1a; border: 1px solid rgba(161,0,255,0.3); border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #A100FF 0%, #6600CC 100%); padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; color: #fff; letter-spacing: 2px; text-transform: uppercase; }
    .body { padding: 36px 32px; }
    .body p { color: #ccc; line-height: 1.7; margin: 0 0 16px; }
    .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: linear-gradient(135deg, #A100FF, #8000CC); color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; font-size: 13px; }
    .note { font-size: 12px; color: #666; margin-top: 24px; border-top: 1px solid #333; padding-top: 16px; }
    .footer { background: #111; padding: 16px 32px; text-align: center; font-size: 11px; color: #555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>PenTest Report Generator</h1></div>
    <div class="body">${content}</div>
    <div class="footer">This is an automated message — do not reply.</div>
  </div>
</body>
</html>
`;

// ── Send verification email ────────────────────────────────────────────────────
exports.sendVerificationEmail = async (user, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: `${process.env.APP_NAME || 'PenTest App'} <onboarding@resend.dev>`,
    to: user.email,
    subject: 'Verify your email address',
    html: emailWrapper(`
      <p>Hi <strong>${user.username}</strong>,</p>
      <p>Thanks for registering. Please verify your email address by clicking the button below. The link expires in <strong>24 hours</strong>.</p>
      <a href="${url}" class="btn">Verify Email</a>
      <p class="note">If you didn't create an account, you can safely ignore this email.</p>
    `)
  });
};

// ── Send password reset email ──────────────────────────────────────────────────
exports.sendPasswordResetEmail = async (user, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: `${process.env.APP_NAME || 'PenTest App'} <onboarding@resend.dev>`,
    to: user.email,
    subject: 'Reset your password',
    html: emailWrapper(`
      <p>Hi <strong>${user.username}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to set a new one. The link expires in <strong>1 hour</strong>.</p>
      <a href="${url}" class="btn">Reset Password</a>
      <p class="note">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
    `)
  });
};

// ── Send email change verification ────────────────────────────────────────────
exports.sendEmailChangeVerification = async (user, newEmail, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email-change?token=${token}`;
  await resend.emails.send({
    from: `${process.env.APP_NAME || 'PenTest App'} <onboarding@resend.dev>`,
    to: newEmail,
    subject: 'Confirm your new email address',
    html: emailWrapper(`
      <p>Hi <strong>${user.username}</strong>,</p>
      <p>You requested to change your email address to <strong>${newEmail}</strong>. Click the button below to confirm this change. The link expires in <strong>24 hours</strong>.</p>
      <a href="${url}" class="btn">Confirm New Email</a>
      <p class="note">If you didn't request this change, please secure your account immediately.</p>
    `)
  });
};

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    family: 4,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};
