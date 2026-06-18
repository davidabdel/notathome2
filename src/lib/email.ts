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

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Not At Home <onboarding@resend.dev>',
      to: [opts.to],
      subject: `[Not At Home] Session ${opts.sessionCode} auto-expired — ${opts.congregationName}`,
      html,
    }),
  });
}
