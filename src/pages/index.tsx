import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<NodeJS.Timeout>();

  // Restore saved congregation from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nah_congregation');
    if (saved) {
      try {
        const { name: savedName } = JSON.parse(saved);
        if (savedName) router.push('/role-selection');
      } catch {}
    }
  }, [router]);

  const handleNameChange = (val: string) => {
    setName(val);
    clearTimeout(debounceRef.current);
    if (val.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/congregation-names?q=${encodeURIComponent(val)}`);
      if (res.ok) setSuggestions(await res.json());
    }, 200);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/congregation-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), pin_code: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      localStorage.setItem('nah_congregation', JSON.stringify({ id: data.id, name: data.name }));
      router.push('/role-selection');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Not At Home</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logoWrap}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="22" fill="#EFF6FF"/>
              <circle cx="22" cy="22" r="16" stroke="#2563EB" strokeWidth="2.5" fill="none"/>
              <path d="M14 22l6 6 10-10" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={styles.title}>Not At Home</h1>
          <p style={styles.sub}>Bearing thorough witness</p>

          <div style={styles.formCard}>
            <p style={styles.formTitle}>Congregation Access</p>
            <form onSubmit={handleLogin}>
              <div style={styles.field}>
                <label style={styles.label}>
                  <span style={styles.icon}>🏛</span> Congregation Name
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={styles.input}
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="Enter congregation name"
                    autoComplete="off"
                    required
                  />
                  {suggestions.length > 0 && (
                    <div style={styles.dropdown}>
                      {suggestions.map(s => (
                        <div key={s} style={styles.dropdownItem}
                          onMouseDown={() => { setName(s); setSuggestions([]); }}>
                          <span style={{ marginRight: 8, opacity: 0.5 }}>🔍</span>{s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  <span style={styles.icon}>🔒</span> PIN Code
                </label>
                <input
                  style={styles.input}
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Same as your Zoom PIN"
                  required
                />
              </div>

              {error && <p style={styles.error}>{error}</p>}

              <button style={styles.btn} type="submit" disabled={loading}>
                {loading ? 'Logging in…' : 'Login'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span style={{ color: '#6b7280', fontSize: 14 }}>Need access for your congregation? </span>
              <a href="/request-access" style={styles.link}>Request Access</a>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 480, marginTop: 12, padding: '0 16px' }}>
          <button style={styles.adminBtn} onClick={() => router.push('/admin-login')}>
            Congregation Admin Login →
          </button>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg,#f0f4ff 0%,#e8eeff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  card: { width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '32px 28px 24px', marginBottom: 0 },
  logoWrap: { textAlign: 'center', marginBottom: 12 },
  title: { textAlign: 'center', fontSize: 36, fontWeight: 800, color: '#2563eb', margin: '0 0 4px' },
  sub: { textAlign: 'center', color: '#6b7280', fontSize: 15, marginBottom: 24 },
  formCard: { background: '#f9fafb', borderRadius: 12, padding: '20px 16px 16px' },
  formTitle: { textAlign: 'center', color: '#374151', fontSize: 14, fontWeight: 600, marginBottom: 16, letterSpacing: '0.01em' },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  icon: { marginRight: 6 },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', background: '#fff' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' },
  dropdownItem: { padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#374151', display: 'flex', alignItems: 'center' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  btn: { width: '100%', padding: '13px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  link: { color: '#2563eb', fontWeight: 600, fontSize: 14, textDecoration: 'none' },
  adminBtn: { width: '100%', padding: '12px', background: 'transparent', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, cursor: 'pointer' },
};
