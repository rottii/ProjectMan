const nodemailer = require('nodemailer');

// ========================
// SMTP TRANSPORT
// ========================

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[EmailService] SMTP not configured — emails will be logged to console.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

const FROM_ADDRESS = process.env.SMTP_FROM || 'noreply@asanaclone.app';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const APP_NAME = 'Asana Clone';

// ========================
// HTML EMAIL TEMPLATE
// ========================

function wrapInTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">● ${APP_NAME}</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <span style="font-size:12px;color:#9ca3af;">This email was sent by ${APP_NAME}. You can update your notification preferences in Settings.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function makeButton(text, url) {
  return `<a href="${url}" style="display:inline-block;background-color:#4F46E5;color:#ffffff;padding:12px 28px;border-radius:6px;font-weight:600;font-size:14px;text-decoration:none;margin:16px 0;">
    ${text}
  </a>`;
}

// ========================
// SEND EMAIL (core)
// ========================

async function sendEmail(to, subject, htmlBody) {
  const transport = getTransporter();

  if (!transport) {
    // Dev fallback: log to console
    console.log('\n========== EMAIL (dev mode) ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: [HTML content - ${htmlBody.length} chars]`);
    console.log('=======================================\n');
    return { success: true, dev: true };
  }

  try {
    const info = await transport.sendMail({
      from: `"${APP_NAME}" <${FROM_ADDRESS}>`,
      to,
      subject,
      html: htmlBody,
    });
    console.log(`[EmailService] Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ========================
// SPECIFIC EMAIL TYPES
// ========================

/**
 * Send email verification link.
 */
async function sendVerificationEmail(userEmail, userName, token) {
  const verifyUrl = `${APP_URL}/verify-email/${token}`;
  const subject = 'Verify your email address';
  const body = wrapInTemplate(subject, `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Welcome, ${userName}!</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Please verify your email address to start receiving notifications. Click the button below:
    </p>
    ${makeButton('Verify Email Address', verifyUrl)}
    <p style="color:#9ca3af;font-size:13px;margin:20px 0 0;">
      This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
    <p style="color:#9ca3af;font-size:12px;margin:12px 0 0;word-break:break-all;">
      Or copy this link: ${verifyUrl}
    </p>
  `);
  return sendEmail(userEmail, subject, body);
}

/**
 * Send task assignment notification email.
 */
async function sendTaskAssignedEmail(assigneeEmail, assigneeName, taskTitle, taskId, assignerName, projectName) {
  const taskUrl = `${APP_URL}/task/${taskId}`;
  const subject = `${assignerName} assigned you a task: ${taskTitle}`;
  const body = wrapInTemplate(subject, `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">New task assigned to you</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 12px;">
      <strong>${assignerName}</strong> assigned you a task${projectName ? ` in <strong>${projectName}</strong>` : ''}:
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 16px;">
      <span style="font-size:16px;font-weight:600;color:#111827;">✓ ${taskTitle}</span>
    </div>
    ${makeButton('View Task', taskUrl)}
  `);
  return sendEmail(assigneeEmail, subject, body);
}

/**
 * Send comment notification email.
 */
async function sendCommentEmail(recipientEmail, recipientName, taskTitle, taskId, commenterName, commentText) {
  const taskUrl = `${APP_URL}/task/${taskId}`;
  const subject = `${commenterName} commented on: ${taskTitle}`;
  // Strip HTML tags for preview
  const plainComment = commentText.replace(/<[^>]*>/g, '').substring(0, 200);
  const body = wrapInTemplate(subject, `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">New comment on your task</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 12px;">
      <strong>${commenterName}</strong> commented on <strong>${taskTitle}</strong>:
    </p>
    <div style="background:#f9fafb;border-left:4px solid #4F46E5;padding:12px 16px;margin:0 0 16px;border-radius:0 8px 8px 0;">
      <span style="font-size:14px;color:#374151;">"${plainComment}"</span>
    </div>
    ${makeButton('View Task', taskUrl)}
  `);
  return sendEmail(recipientEmail, subject, body);
}

/**
 * Send @mention notification email.
 */
async function sendMentionEmail(recipientEmail, recipientName, taskTitle, taskId, mentionerName, context) {
  const taskUrl = `${APP_URL}/task/${taskId}`;
  const subject = `${mentionerName} mentioned you${taskTitle ? ` in: ${taskTitle}` : ''}`;
  const body = wrapInTemplate(subject, `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">You were mentioned</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 12px;">
      <strong>${mentionerName}</strong> mentioned you in ${context || 'a task'}.
    </p>
    ${taskId ? makeButton('View Task', taskUrl) : ''}
  `);
  return sendEmail(recipientEmail, subject, body);
}

/**
 * Send due date reminder email.
 */
async function sendReminderEmail(recipientEmail, recipientName, taskTitle, taskId, reminderType) {
  const taskUrl = `${APP_URL}/task/${taskId}`;
  const messages = {
    'REMINDER_1WEEK': 'is due next week',
    'REMINDER_1DAY': 'is due tomorrow',
    'REMINDER_1HOUR': 'is due in 1 hour',
    'REMINDER_OVERDUE': 'is overdue',
  };
  const msg = messages[reminderType] || 'has an upcoming deadline';
  const subject = `Reminder: "${taskTitle}" ${msg}`;
  const body = wrapInTemplate(subject, `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">⏰ Task Reminder</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 12px;">
      Your task <strong>"${taskTitle}"</strong> ${msg}.
    </p>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:0 0 16px;">
      <span style="font-size:15px;font-weight:600;color:#92400e;">✓ ${taskTitle}</span>
    </div>
    ${makeButton('View Task', taskUrl)}
  `);
  return sendEmail(recipientEmail, subject, body);
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendTaskAssignedEmail,
  sendCommentEmail,
  sendMentionEmail,
  sendReminderEmail,
};
