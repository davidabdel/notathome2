import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    await fetch('/api/admin-auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail.trim() }),
    });
    setForgotSent(true);
    setForgotLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return; }
    if (data.role === 'super_admin') router.push('/super-admin');
    else router.push('/congregation-admin');
  };

  return (
    <>
      <Head><title>Not At Home — Admin Login</title></Head>
      <div style={styles.page}>
        <div style={styles.card}>
          <a href="/" style={styles.back}>← Back to congregation login</a>
          <div style={{ textAlign: 'center', margin: '20px 0 8px' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="#F5F3FF"/>
              <path d="M12 28v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="18" cy="14" r="4" stroke="#7c3aed" strokeWidth="2"/>
            </svg>
          </div>
          <h2 style={styles.title}>Admin Login</h2>
          <p style={styles.sub}>Congregation admin or super admin access</p>

          {forgotMode ? (
            forgotSent ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#16a34a', marginBottom: 20 }}>✓ If that email exists, a reset link has been sent.</p>
                <button onClick={() => { setForgotMode(false); setForgotSent(false); }} style={{ ...styles.btn, background: '#6b7280' }}>Back to Login</button>
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>Enter your admin email and we'll send a reset link.</p>
                <div style={styles.field}>
                  <label style={styles.label}>Email</label>
                  <input style={styles.input} type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required autoFocus />
                </div>
                <button style={styles.btn} type="submit" disabled={forgotLoading}>{forgotLoading ? 'Sending…' : 'Send Reset Link'}</button>
                <p style={{ textAlign: 'center', marginTop: 14 }}>
                  <button type="button" onClick={() => setForgotMode(false)} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 13 }}>Back to login</button>
                </p>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{error}</p>}
              <button style={styles.btn} type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
              <p style={{ textAlign: 'center', marginTop: 14 }}>
                <button type="button" onClick={() => setForgotMode(true)} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 13 }}>Forgot password?</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  card: { background: '#fff', borderRadius: 20, padding: '28px 28px 32px', width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  back: { color: '#6b7280', textDecoration: 'none', fontSize: 13 },
  title: { textAlign: 'center', fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: '#111827' },
  sub: { textAlign: 'center', color: '#6b7280', fontSize: 13, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '13px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
};
