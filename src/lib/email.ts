export async function sendDncRequestEmail(opts: {
  to: string[];
  congregationName: string;
  address: string;
  blockNumber: number | null;
  mapNumber: number;
  reason: string;
  submittedBy: string;
}) {
  if (!opts.to.length) return;
  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://nothome.app';
  const html = `
    <h2>Not At Home — Do Not Call request</h2>
    <p>A publisher has requested a <strong>Do Not Call</strong> for <strong>${opts.congregationName}</strong>. It will not appear on the map until an admin approves it.</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Address</td><td style="padding:4px 0"><strong>${opts.address}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Map / Block</td><td style="padding:4px 0">Map ${opts.mapNumber}${opts.blockNumber != null ? ` — Block ${opts.blockNumber}` : ''}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Reason</td><td style="padding:4px 0">${opts.reason}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Submitted by</td><td style="padding:4px 0">${opts.submittedBy}</td></tr>
    </table>
    <p><a href="${appUrl}/congregation-admin" style="background:#7c3aed;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Review in the Requests tab</a></p>
    <p style="color:#6b7280;font-size:13px">Approve to place it on the map, or reject to discard it.</p>
  `;

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: 'smtp.improvmx.com',
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: `Not At Home <${process.env.SMTP_USER}>`,
    to: opts.to.join(', '),
    subject: `[Not At Home] Do Not Call request — ${opts.congregationName}`,
    html,
  });
}

export async function sendSessionExpiredEmail(opts: {
  to: string;
  congregationName: string;
  sessionCode: string;
  mapNumber: number;
  addresses: Array<{ block_number: number; house_number: string; unit_number?: string; street_name: string; suburb?: string }>;
}) {
  const byBlock: Record<number, typeof opts.addresses> = {};
  for (const a of opts.addresses) {
    if (!byBlock[a.block_number]) byBlock[a.block_number] = [];
    byBlock[a.block_number].push(a);
  }

  const formatAddress = (a: (typeof opts.addresses)[0]) =>
    [a.unit_number ? `Unit ${a.unit_number}/` : '', a.house_number, a.street_name, a.suburb].filter(Boolean).join(' ');

  const rows = Object.entries(byBlock).sort(([a], [b]) => Number(a) - Number(b)).map(([block, addrs]) => {
    const evens = addrs.filter(a => Number(a.house_number) % 2 === 0).sort((a, b) => Number(a.house_number) - Number(b.house_number));
    const odds  = addrs.filter(a => Number(a.house_number) % 2 !== 0).sort((a, b) => Number(a.house_number) - Number(b.house_number));
    return `<h3>Block ${block}</h3>
      <p><strong>Even numbers:</strong> ${evens.length ? evens.map(formatAddress).join(', ') : 'None'}</p>
      <p><strong>Odd numbers:</strong>  ${odds.length  ? odds.map(formatAddress).join(', ')  : 'None'}</p>`;
  }).join('');

  const html = `
    <h2>Not At Home — Auto-Expired Session</h2>
    <p><strong>Congregation:</strong> ${opts.congregationName}</p>
    <p><strong>Session code:</strong> ${opts.sessionCode} &nbsp;|&nbsp; <strong>Map:</strong> ${opts.mapNumber}</p>
    <p style="color:#b45309">⚠️ This session was not closed by the Group Overseer and has been automatically ended after 24 hours.</p>
    <hr/>
    ${rows || '<p>No addresses were recorded.</p>'}
  `;

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: 'smtp.improvmx.com',
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: `Not At Home <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: `[Not At Home] Session ${opts.sessionCode} auto-expired — ${opts.congregationName}`,
    html,
  });
}
