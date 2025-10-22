// Only import nodemailer on the server side
let nodemailer: any;
if (typeof window === 'undefined') {
  // This code only runs on the server
  nodemailer = require('nodemailer');
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email using nodemailer
 * @param options Email options including recipient, subject, and HTML content
 * @returns Promise resolving to boolean indicating success or failure
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    console.error('Email sending is not supported on the client side');
    return false;
  }
  // First try SMTP. If not fully configured, fall back to Resend API if available
  // Check for required environment variables - use SMTP_ prefixed variables first, fall back to EMAIL_ prefixed ones
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = process.env.SMTP_PORT || process.env.EMAIL_PORT;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  // Default from address if not provided in environment variables
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || user || '';
  const secure = process.env.SMTP_SECURE === 'true' || process.env.EMAIL_SECURE === 'true';

  // If SMTP is not fully configured, try Resend
  const smtpConfigured = Boolean(host && port && user && pass);
  if (!smtpConfigured) {
    const resendKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM || 'onboarding@resend.dev';
    if (resendKey) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFrom,
            to: options.to,
            subject: options.subject,
            html: options.html,
          }),
        });
        if (!resp.ok) {
          const text = await resp.text();
          console.error('Resend send failed:', text);
          return false;
        }
        return true;
      } catch (err) {
        console.error('Error sending via Resend:', err);
        return false;
      }
    }
    // Neither SMTP nor Resend configured
    console.error('Email configuration missing. Provide SMTP_* (or EMAIL_*) or RESEND_API_KEY.');
    return false;
  }

  try {
    // Ensure nodemailer is available (server-side only)
    if (!nodemailer) {
      console.error('Nodemailer is not available');
      return false;
    }
    
    // Create transporter with SMTP settings
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure,
      auth: {
        user,
        pass,
      },
    });

    // Log email configuration (without password)
    console.log('Sending email with configuration:', {
      host,
      port,
      secure,
      user,
      from
    });
    
    // Send email
    const info = await transporter.sendMail({
      from: from && from.includes('<') ? from : `"Not At Home" <${from || user || 'noreply@nothome.app'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send a notification about a new congregation request
 * @param congregationName Name of the congregation
 * @param contactEmail Contact email of the requester
 * @param pinCode PIN code for the congregation
 * @returns Promise resolving to boolean indicating success or failure
 */
export async function sendCongregationRequestNotification(
  congregationName: string,
  contactEmail: string,
  pinCode: string
): Promise<boolean> {
  // Get admin email from environment variable
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('Admin email not configured. Set ADMIN_EMAIL environment variable.');
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const adminDashboardUrl = `${appUrl}/admin/pending-requests`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">New Congregation Request</h2>
      
      <p>A new congregation has requested access to Not At Home:</p>
      
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Congregation Name:</strong> ${congregationName}</p>
        <p><strong>Contact Email:</strong> ${contactEmail}</p>
        <p><strong>PIN Code:</strong> ${pinCode}</p>
      </div>
      
      <p>Please review this request in the <a href="${adminDashboardUrl}" style="color: #2563eb; text-decoration: underline;">admin dashboard</a>.</p>
      
      <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
        This is an automated email from Not At Home.
      </p>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `New Congregation Request: ${congregationName}`,
    html,
  });
} 