import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface OpenSession { id: string; code: string; map_number: number; }

export default function Publisher() {
  const router = useRouter();
  const [congregation, setCongregation] = useState<{ id: string; name: string } | null>(null);
  const [sessions, setSessions] = useState<OpenSession[]>([]);
  const [code, setCode] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('nah_congregation');
    if (!saved) { router.push('/'); return; }
    const cong = JSON.parse(saved);
    setCongregation(cong);
    fetch(`/api/sessions/active?congregation_id=${cong.id}`)
      .then(r => r.json()).then(setSessions).catch(() => {});
  }, [router]);

  const join = (c: string) => {
    if (c.trim()) router.push(`/session/${c.trim()}`);
  };

  return (
    <>
      <Head><title>Not At Home — Join Session</title></Head>
      <div style={styles.page}>
        <div style={styles.topBar}>
          <a href="/role-selection" style={styles.back}>← Home</a>
          <span style={styles.title}>Join a Session</span>
          <span />
        </div>

        <div style={styles.content}>
          <p style={styles.desc}>Enter the 4-digit session code provided by your group overseer</p>

          <div style={styles.card}>
            <label style={styles.label}><strong>Session Code</strong></label>
            <span style={{ fontSize: 20, color: '#9ca3af', display: 'block', marginBottom: 6 }}>#</span>
            <input
              style={styles.input}
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Enter 4-digit code"
              inputMode="numeric"
              maxLength={4}
              onKeyDown={e => e.key === 'Enter' && join(code)}
            />
            <button style={{ ...styles.btn, marginTop: 14 }} onClick={() => join(code)} disabled={!code.trim()}>
              Join Session →
            </button>
          </div>

          {sessions.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Current Open Sessions</h3>
              {sessions.map(s => (
                <div key={s.id} style={styles.sessionRow}>
                  <div>
                    <div>Code: <strong>{s.code}</strong></div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>📍 Map: {s.map_number}</div>
                  </div>
                  <button style={styles.joinBtn} onClick={() => join(s.code)}>Join</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: 15 },
  title: { fontWeight: 700, fontSize: 18 },
  content: { padding: '20px 16px', maxWidth: 500, margin: '0 auto' },
  desc: { color: '#6b7280', fontSize: 14, marginBottom: 16 },
  card: { background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e5e7eb', marginBottom: 16 },
  label: { display: 'block', marginBottom: 8, fontSize: 14 },
  input: { width: '100%', padding: '12px 14px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 20, letterSpacing: '0.1em', outline: 'none', textAlign: 'center', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '13px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  sessionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' },
  joinBtn: { background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
