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
      <div style={S.page}>

        {/* Top bar */}
        <div style={S.topBar}>
          <span style={S.congName}>{congName}</span>
          <button style={S.changeBtn} onClick={handleChange}>Change</button>
        </div>

        {/* Hero */}
        <div style={S.hero}>
          <svg width="52" height="52" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="22" fill="#EFF6FF"/>
            <circle cx="22" cy="22" r="16" stroke="#2563EB" strokeWidth="2.5" fill="none"/>
            <path d="M14 22l6 6 10-10" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 style={S.title}>Not At Home</h1>
          <p style={S.sub}>Select your role to continue</p>
        </div>

        {/* Role cards — full width, stacked vertically */}
        <div style={S.cards}>
          <button style={{ ...S.card, borderColor: '#bfdbfe' }} onClick={() => handleRole('overseer')}>
            <div style={{ ...S.iconWrap, background: '#eff6ff' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div style={S.cardText}>
              <div style={{ ...S.cardTitle, color: '#1d4ed8' }}>Group Overseer</div>
              <div style={S.cardDesc}>Open or end group sessions and manage territory</div>
            </div>
            <div style={S.arrow}>›</div>
          </button>

          <button style={{ ...S.card, borderColor: '#bbf7d0' }} onClick={() => handleRole('publisher')}>
            <div style={{ ...S.iconWrap, background: '#f0fdf4' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div style={S.cardText}>
              <div style={{ ...S.cardTitle, color: '#15803d' }}>Publisher</div>
              <div style={S.cardDesc}>Join a session and record not-at-home addresses</div>
            </div>
            <div style={S.arrow}>›</div>
          </button>
        </div>
      </div>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    minHeight: '100dvh',
    background: '#f3f4f6',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
  },
  congName: { fontWeight: 700, fontSize: 18, color: '#111827' },
  changeBtn: {
    background: 'none',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 13,
    color: '#6b7280',
    cursor: 'pointer',
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '44px 24px 32px',
  },
  title: {
    fontSize: 36,
    fontWeight: 800,
    color: '#2563eb',
    margin: '14px 0 6px',
    textAlign: 'center',
  },
  sub: {
    color: '#6b7280',
    fontSize: 16,
    margin: 0,
    textAlign: 'center',
  },
  cards: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '0 20px 40px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: '#fff',
    border: '2px solid',
    borderRadius: 18,
    padding: '20px 18px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle: { fontWeight: 700, fontSize: 17, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 1.4 },
  arrow: { fontSize: 24, color: '#d1d5db', flexShrink: 0 },
};
