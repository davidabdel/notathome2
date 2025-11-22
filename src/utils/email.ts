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

/**
 * Send a notification about an expired session
 * @param notificationEmail Email address to send notification to
 * @param congregationName Name of the congregation
 * @param sessionCode Session code
 * @param mapNumber Map number
 * @param addresses Array of addresses recorded in the session
 * @returns Promise resolving to boolean indicating success or failure
 */
export async function sendExpiredSessionNotification(
  notificationEmail: string,
  congregationName: string,
  sessionCode: string,
  mapNumber: string | number,
  addresses: any[]
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Format addresses for email
  let addressesHtml = '';
  if (addresses && addresses.length > 0) {
    // Group addresses by block number
    const addressesByBlock: Record<number, any[]> = {};

    addresses.forEach((address) => {
      const blockNum = address.block_number || 0;
      if (!addressesByBlock[blockNum]) {
        addressesByBlock[blockNum] = [];
      }
      addressesByBlock[blockNum].push(address);
    });

    addressesHtml = '<div style="margin-top: 20px;">';

    Object.keys(addressesByBlock).sort((a, b) => Number(a) - Number(b)).forEach((blockNumber) => {
      addressesHtml += `<h3 style="color: #4b5563; margin-top: 16px; margin-bottom: 8px;">Block ${blockNumber}</h3>`;
      addressesHtml += '<ul style="list-style-type: none; padding: 0;">';

      addressesByBlock[Number(blockNumber)].forEach((address) => {
        let addressText = '';
        if (address.address) {
          addressText = address.address;
        } else if (address.latitude && address.longitude) {
          addressText = `Lat: ${address.latitude.toFixed(6)}, Lng: ${address.longitude.toFixed(6)}`;
        } else {
          addressText = 'Unknown Location';
        }

        addressesHtml += `<li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${addressText}</li>`;
      });

      addressesHtml += '</ul>';
    });

    addressesHtml += '</div>';
  } else {
    addressesHtml = '<p style="color: #6b7280; font-style: italic;">No addresses were recorded in this session.</p>';
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Session Closed Automatically</h2>
      
      <p>A session for <strong>${congregationName}</strong> has been automatically closed after 24 hours.</p>
      
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Session Code:</strong> ${sessionCode}</p>
        <p><strong>Map Number:</strong> ${mapNumber}</p>
        <p><strong>Status:</strong> Closed (Expired)</p>
      </div>
      
      <h3 style="color: #111827; margin-top: 24px;">Recorded Not-At-Homes</h3>
      ${addressesHtml}
      
      <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
        This is an automated email from Not At Home.
      </p>
    </div>
  `;

  return sendEmail({
    to: notificationEmail,
    subject: `Session Report: ${congregationName} - Map ${mapNumber}`,
    html,
  });
}