import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const secure = process.env.SMTP_SECURE === 'true';
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const defaultFrom = process.env.SMTP_FROM || `No Reply <${user || 'no-reply@example.com'}>`;

if (!host || !user || !pass) {
  // eslint-disable-next-line no-console
  console.warn('SMTP is not fully configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in env.');
}

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure, // false for 587
  auth: user && pass ? { user, pass } : undefined,
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}) {
  const info = await transporter.sendMail({
    from: opts.from || defaultFrom,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
  return info;
}
