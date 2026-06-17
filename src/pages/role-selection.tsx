import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function RoleSelection() {
  const router = useRouter();
  const [congName, setCongName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('nah_congregation');
    if (!saved) { router.push('/'); return; }
    try { setCongName(JSON.parse(saved).name); } catch { router.push('/'); }
  }, [router]);

  const handleRole = (role: 'overseer' | 'publisher') => {
    localStorage.setItem('nah_role', role);
    router.push(role === 'overseer' ? '/overseer' : '/publisher');
  };

  const handleChange = () => {
    localStorage.removeItem('nah_congregation');
    localStorage.removeItem('nah_role');
    router.push('/');
  };

  return (
    <>
      <Head><title>Not At Home — Select Role</title></Head>
      <div style={styles.page}>
        <div style={styles.topBar}>
          <span style={styles.congName}>{congName}</span>
          <button style={styles.changeBtn} onClick={handleChange}>→ Change Congregation</button>
        </div>

        <div style={styles.content}>
          <div style={styles.logoWrap}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="22" fill="#EFF6FF"/>
              <circle cx="22" cy="22" r="16" stroke="#2563EB" strokeWidth="2.5" fill="none"/>
              <path d="M14 22l6 6 10-10" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={styles.title}>Not At Home</h1>
          <p style={styles.sub}>Select your role to continue</p>

          <div style={styles.cards}>
            <button style={styles.roleCard} onClick={() => handleRole('overseer')}>
              <div style={{ ...styles.roleIcon, background: '#EFF6FF' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div style={styles.roleName}>Group Overseer</div>
              <div style={styles.roleDesc}>Open or end group sessions</div>
            </button>

            <button style={styles.roleCard} onClick={() => handleRole('publisher')}>
              <div style={{ ...styles.roleIcon, background: '#F0FDF4' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div style={styles.roleName}>Publisher</div>
              <div style={styles.roleDesc}>Join sessions and record data</div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  congName: { fontWeight: 700, fontSize: 16, color: '#111827' },
  changeBtn: { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: '#6b7280', cursor: 'pointer' },
  content: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px 20px' },
  logoWrap: { marginBottom: 12 },
  title: { fontSize: 32, fontWeight: 800, color: '#2563eb', margin: '0 0 6px', textAlign: 'center' },
  sub: { color: '#6b7280', fontSize: 15, marginBottom: 32, textAlign: 'center' },
  cards: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 480 },
  roleCard: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '24px 16px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' },
  roleIcon: { width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
  roleName: { fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 },
  roleDesc: { fontSize: 12, color: '#6b7280' },
};
