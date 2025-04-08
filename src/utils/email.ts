import nodemailer from 'nodemailer';

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
  // Check for required environment variables
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing. Check environment variables.');
    return false;
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"Not At Home" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
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