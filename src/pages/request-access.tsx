import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function RequestAccess() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/congregation-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), contact_email: email.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Request failed'); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  };

  if (done) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>✅</div>
        <h2 style={{ textAlign: 'center', color: '#111827', marginBottom: 8 }}>Request Submitted!</h2>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
          We'll review your request and get back to you at <strong>{email}</strong>.
        </p>
        <button style={styles.btn} onClick={() => router.push('/')}>Back to Login</button>
      </div>
    </div>
  );

  return (
    <>
      <Head><title>Not At Home — Request Access</title></Head>
      <div style={styles.page}>
        <div style={styles.card}>
          <a href="/" style={styles.back}>← Back</a>
          <h2 style={styles.title}>Request Congregation Access</h2>
          <p style={styles.sub}>We'll set up your congregation and send you login details.</p>
          <form onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>Congregation Name</label>
              <input style={styles.input} value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Liverpool" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Contact Email</label>
              <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@example.com" />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
            <button style={styles.btn} type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit Request'}</button>
          </form>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  card: { background: '#fff', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 440, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  back: { color: '#6b7280', textDecoration: 'none', fontSize: 14 },
  title: { fontSize: 24, fontWeight: 700, margin: '16px 0 6px', color: '#111827' },
  sub: { color: '#6b7280', fontSize: 14, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '13px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
};
