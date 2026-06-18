import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface Session { id: string; code: string; map_number: number; created_at: string; }
interface Map { id: string; map_number: number; name: string | null; block_count: number; }

export default function Overseer() {
  const router = useRouter();
  const [congregation, setCongregation] = useState<{ id: string; name: string } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [maps, setMaps] = useState<Map[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedMap, setSelectedMap] = useState<number | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nah_congregation');
    if (!saved) { router.push('/'); return; }
    const cong = JSON.parse(saved);
    setCongregation(cong);
    loadSessions(cong.id);
    loadMaps(cong.id);
  }, [router]);

  const loadSessions = async (cid: string) => {
    const res = await fetch(`/api/sessions/active?congregation_id=${cid}`);
    if (res.ok) setSessions(await res.json());
  };

  const loadMaps = async (cid: string) => {
    const res = await fetch(`/api/maps/public?congregation_id=${cid}`);
    if (res.ok) setMaps(await res.json());
  };

  const createSession = async () => {
    if (!selectedMap || !congregation) return;
    setLoading(true);
    const res = await fetch('/api/sessions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ congregation_id: congregation.id, map_number: selectedMap }),
    });
    if (res.ok) {
      const s = await res.json();
      setShowMapModal(false);
      setSelectedMap(null);
      router.push(`/session/${s.code}`);
    }
    setLoading(false);
  };

  const joinSession = () => {
    if (joinCode.trim()) router.push(`/session/${joinCode.trim()}`);
  };

  const share = (code: string) => {
    const url = `${window.location.origin}/session/${code}`;
    if (navigator.share) navigator.share({ title: 'Join session', url });
    else navigator.clipboard.writeText(url);
  };

  return (
    <>
      <Head><title>Not At Home — Group Overseer</title></Head>
      <div style={styles.page}>
        <div style={styles.topBar}>
          <span style={styles.appName}>Not at Home</span>
          <button style={styles.changeBtn} onClick={() => { localStorage.setItem('nah_role', ''); router.push('/role-selection'); }}>→ Change Role</button>
        </div>

        <div style={styles.content}>
          <button style={styles.startBtn} onClick={() => setShowMapModal(true)}>
            ▶ Start Group Session
          </button>

          <div style={styles.joinCard}>
            <p style={styles.joinLabel}>OR ENTER EXISTING SESSION CODE</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20, color: '#9ca3af' }}>#</span>
              <input
                style={styles.joinInput}
                placeholder="Enter session code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && joinSession()}
                maxLength={4}
                inputMode="numeric"
              />
              {joinCode && <button style={styles.joinBtn} onClick={joinSession}>Join</button>}
            </div>
          </div>

          {sessions.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Your Active Sessions</h3>
              {sessions.map(s => (
                <div key={s.id} style={styles.sessionCard}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Code: <strong style={{ color: '#111', fontSize: 16 }}>{s.code}</strong></div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>📍 Map: {s.map_number}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>🕐 {new Date(s.created_at).toLocaleTimeString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={styles.iconBtn} onClick={() => share(s.code)} title="Share">⬆</button>
                    <button style={styles.iconBtn} onClick={() => router.push(`/session/${s.code}`)} title="Open">→</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={styles.notice}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 700, color: '#b45309', margin: '0 0 4px' }}>Important Notice!</p>
              <p style={{ color: '#78350f', fontSize: 13, margin: 0 }}>
                All sessions and data are deleted after 24 hours. Be sure to tap "End Session" and share the data before it expires.
              </p>
            </div>
          </div>
        </div>

        {showMapModal && (
          <div style={styles.overlay} onClick={() => setShowMapModal(false)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Select Map Number</h3>
              <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>Choose which map to work on</p>
              {maps.length === 0
                ? <p style={{ color: '#9ca3af', textAlign: 'center' }}>No maps configured. Contact your congregation admin.</p>
                : (
                <div style={styles.mapGrid}>
                  {maps.map(m => (
                    <button
                      key={m.id}
                      style={{ ...styles.mapBtn, ...(selectedMap === m.map_number ? styles.mapBtnSelected : {}) }}
                      onClick={() => setSelectedMap(m.map_number)}
                    >
                      {m.map_number}
                      {m.name && <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{m.name}</div>}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button style={styles.cancelBtn} onClick={() => setShowMapModal(false)}>Cancel</button>
                <button style={{ ...styles.createBtn, opacity: !selectedMap || loading ? 0.5 : 1 }} onClick={createSession} disabled={!selectedMap || loading}>
                  {loading ? 'Creating…' : 'Create Session'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', minHeight: '100dvh', background: '#f3f4f6', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 },
  appName: { fontWeight: 700, fontSize: 16 },
  changeBtn: { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: '#6b7280', cursor: 'pointer' },
  content: { padding: '20px 16px', maxWidth: 500, margin: '0 auto' },
  startBtn: { width: '100%', padding: '18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 14, fontSize: 18, fontWeight: 700, cursor: 'pointer', marginBottom: 16 },
  joinCard: { background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 20, border: '1px solid #e5e7eb' },
  joinLabel: { fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', margin: '0 0 12px', textAlign: 'center' },
  joinInput: { flex: 1, border: '1.5px solid #d1d5db', borderRadius: 8, padding: '12px 14px', fontSize: 22, letterSpacing: '0.15em', outline: 'none', textAlign: 'center', minWidth: 0 },
  joinBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 18px', fontSize: 15, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 700, margin: '0 0 10px' },
  sessionCard: { background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #2563eb', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 },
  iconBtn: { background: '#f3f4f6', border: 'none', borderRadius: 8, width: 44, height: 44, cursor: 'pointer', fontSize: 18 },
  notice: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto' },
  mapGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 },
  mapBtn: { padding: '18px 4px', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 17, fontWeight: 600, cursor: 'pointer' },
  mapBtnSelected: { background: '#eff6ff', border: '2px solid #2563eb', color: '#2563eb' },
  cancelBtn: { flex: 1, padding: '14px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer' },
  createBtn: { flex: 2, padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};
