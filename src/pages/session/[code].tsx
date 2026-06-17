import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface SessionData {
  id: string; code: string; map_number: number; congregation_name: string; congregation_id: string; created_at: string;
}
interface Address {
  id: string; block_number: number; unit_number?: string; house_number: string; street_name: string; suburb?: string; recorded_at: string;
}
interface MapData {
  id: string; map_number: number; name: string | null; block_count: number; image_url: string | null;
  dnc: Array<{ id: string; address: string; note?: string }>;
}

export default function SessionPage() {
  const router = useRouter();
  const { code } = router.query as { code: string };

  const [session, setSession] = useState<SessionData | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ unit: string; house: string; street: string; suburb: string } | null>(null);
  const [manualModal, setManualModal] = useState(false);
  const [manual, setManual] = useState({ unit: '', house: '', street: '', suburb: '' });
  const [endModal, setEndModal] = useState(false);
  const [endData, setEndData] = useState<Address[] | null>(null);
  const [isOverseer, setIsOverseer] = useState(false);

  const loadAddresses = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/addresses?session_id=${sessionId}`);
    if (res.ok) setAddresses(await res.json());
  }, []);

  useEffect(() => {
    if (!code) return;
    setIsOverseer(localStorage.getItem('nah_role') === 'overseer');

    const init = async () => {
      const res = await fetch(`/api/sessions/${code}`);
      if (!res.ok) { setError('Session not found or expired'); setLoading(false); return; }
      const s: SessionData = await res.json();
      setSession(s);

      // Load map data
      const mapsRes = await fetch(`/api/maps/public?congregation_id=${s.congregation_id}`);
      if (mapsRes.ok) {
        const maps: MapData[] = await mapsRes.json();
        const m = maps.find(x => x.map_number === s.map_number);
        if (m) {
          const mRes = await fetch(`/api/maps/${m.id}`);
          if (mRes.ok) setMapData(await mRes.json());
        }
      }

      await loadAddresses(s.id);
      setLoading(false);
    };
    init();
  }, [code, loadAddresses]);

  // Poll for new addresses every 5 seconds
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => loadAddresses(session.id), 5000);
    return () => clearInterval(interval);
  }, [session, loadAddresses]);

  const recordLocation = () => {
    if (!selectedBlock) { alert('Please select a block first'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        setLocating(false);
        // Reverse geocode
        const { latitude, longitude } = pos.coords;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const geo = await r.json();
          const addr = geo.address || {};
          setConfirmModal({
            unit: addr.unit || '',
            house: addr.house_number || '',
            street: addr.road || addr.street || '',
            suburb: addr.suburb || addr.city || addr.town || '',
          });
        } catch {
          setConfirmModal({ unit: '', house: '', street: '', suburb: '' });
        }
      },
      () => { setLocating(false); alert('Could not get location. Try manually.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveAddress = async (data: { unit: string; house: string; street: string; suburb: string }) => {
    if (!session || !selectedBlock) return;
    const res = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        block_number: selectedBlock,
        unit_number: data.unit || null,
        house_number: data.house,
        street_name: data.street,
        suburb: data.suburb || null,
      }),
    });
    if (res.ok) {
      setConfirmModal(null);
      setManualModal(false);
      setManual({ unit: '', house: '', street: '', suburb: '' });
      loadAddresses(session.id);
    }
  };

  const deleteAddress = async (id: string) => {
    await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  const endSession = async () => {
    if (!session) return;
    const res = await fetch(`/api/sessions/${code}`, { method: 'DELETE' });
    if (res.ok) {
      const { addresses: finalAddresses } = await res.json();
      setEndData(finalAddresses);
    }
  };

  const shareResults = (addrs: Address[]) => {
    const byBlock: Record<number, Address[]> = {};
    for (const a of addrs) {
      if (!byBlock[a.block_number]) byBlock[a.block_number] = [];
      byBlock[a.block_number].push(a);
    }
    const fmt = (a: Address) => [a.unit_number ? `Unit ${a.unit_number}/` : '', a.house_number, a.street_name, a.suburb].filter(Boolean).join(' ');
    const lines = Object.entries(byBlock).sort(([a], [b]) => Number(a) - Number(b)).map(([block, arr]) => {
      const evens = arr.filter(a => Number(a.house_number) % 2 === 0).sort((a, b) => Number(a.house_number) - Number(b.house_number));
      const odds  = arr.filter(a => Number(a.house_number) % 2 !== 0).sort((a, b) => Number(a.house_number) - Number(b.house_number));
      return `BLOCK ${block}:\nEven: ${evens.map(fmt).join(', ') || 'None'}\nOdd:  ${odds.map(fmt).join(', ') || 'None'}`;
    }).join('\n\n');
    const text = `Not At Home — Session ${code} | Map ${session?.map_number}\n\n${lines || 'No addresses recorded.'}`;
    if (navigator.share) navigator.share({ title: 'Not At Home Results', text });
    else navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
  };

  const fmtAddr = (a: Address) => [a.unit_number ? `U${a.unit_number}/` : '', a.house_number, a.street_name].filter(Boolean).join(' ');

  if (loading) return <div style={styles.center}><p>Loading session…</p></div>;
  if (error) return <div style={styles.center}><p style={{ color: '#dc2626' }}>{error}</p><a href="/" style={styles.link}>Go home</a></div>;

  // End session result screen
  if (endData) return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <span style={styles.appName}>Session {code} — Ended</span>
      </div>
      <div style={styles.content}>
        <div style={{ ...styles.card, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <h2 style={{ margin: 0 }}>Session Complete</h2>
          <p style={{ color: '#6b7280' }}>{endData.length} addresses recorded</p>
        </div>
        <button style={{ ...styles.btn, background: '#10b981', marginBottom: 12 }} onClick={() => shareResults(endData)}>
          ⬆ Share Results
        </button>
        <button style={{ ...styles.btn, background: '#6b7280' }} onClick={() => router.push('/overseer')}>
          Back to Overseer
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Head><title>Session {code} — Not At Home</title></Head>
      <div style={styles.page}>
        <div style={styles.topBar}>
          <span style={styles.appName}>Session: {code}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.smallBtn} onClick={() => {
              const url = window.location.href;
              if (navigator.share) navigator.share({ url }); else navigator.clipboard.writeText(url);
            }}>⬆ Share</button>
          </div>
        </div>

        <div style={styles.content}>
          {/* Map info */}
          {mapData && (
            <div style={styles.card}>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>📍 Territory Map {mapData.map_number}</p>
              {mapData.name && <h3 style={{ margin: '0 0 8px' }}>Map {mapData.map_number} — {mapData.name}</h3>}
              {mapData.image_url && (
                <img src={mapData.image_url} alt="Territory map" style={{ width: '100%', borderRadius: 8, marginBottom: 10 }} />
              )}
              {mapData.dnc.length > 0 && (
                <div style={{ background: '#fef9c3', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
                  <strong style={{ fontSize: 13 }}>Do Not Call:</strong>
                  {mapData.dnc.map(d => (
                    <div key={d.id} style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>• {d.address}{d.note ? ` — ${d.note}` : ''}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Block selector + recorder */}
          <div style={styles.card}>
            <h3 style={{ margin: '0 0 12px' }}>Select Block</h3>
            <div style={styles.blockGrid}>
              {Array.from({ length: mapData?.block_count || 6 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  style={{ ...styles.blockBtn, ...(selectedBlock === n ? styles.blockBtnSel : {}) }}
                  onClick={() => setSelectedBlock(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px', marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280', fontSize: 14 }}>Selected Block:</span>
              <strong>{selectedBlock ?? 'None'}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <button style={{ ...styles.recordBtn, opacity: locating ? 0.7 : 1 }} onClick={recordLocation} disabled={locating}>
                {locating ? '📡 Locating…' : '📍 Record Location'}
              </button>
              <button style={styles.manualBtn} onClick={() => setManualModal(true)}>
                + Record Manually
              </button>
            </div>
          </div>

          {/* Address list */}
          <div style={styles.card}>
            <h3 style={{ margin: '0 0 12px' }}>Not Home List</h3>
            {addresses.length === 0
              ? <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', margin: 0 }}>No addresses yet</p>
              : addresses.map(a => (
                <div key={a.id} style={styles.addrRow}>
                  <div>
                    <span style={styles.blockBadge}>Block {a.block_number}</span>
                    <span style={{ fontSize: 14, color: '#111827' }}>{fmtAddr(a)}</span>
                    {a.suburb && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>{a.suburb}</span>}
                  </div>
                  <button style={styles.deleteBtn} onClick={() => deleteAddress(a.id)}>✕</button>
                </div>
              ))
            }
          </div>

          {/* End session */}
          {isOverseer && (
            <button style={{ ...styles.btn, background: '#ef4444', marginTop: 4 }} onClick={() => setEndModal(true)}>
              → End Session
            </button>
          )}
        </div>
      </div>

      {/* Confirm location modal */}
      {confirmModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Confirm Location</h3>
              <button style={styles.closeBtn} onClick={() => setConfirmModal(null)}>✕</button>
            </div>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>Please confirm or edit the detected address</p>
            <div style={styles.row2}>
              <div style={styles.field2}><label style={styles.lbl}>Unit Number</label><input style={styles.inp} value={confirmModal.unit} onChange={e => setConfirmModal({ ...confirmModal, unit: e.target.value })} placeholder="Optional" /></div>
              <div style={styles.field2}><label style={styles.lbl}>House Number</label><input style={styles.inp} value={confirmModal.house} onChange={e => setConfirmModal({ ...confirmModal, house: e.target.value })} required /></div>
            </div>
            <div style={styles.field3}><label style={styles.lbl}>Street Name</label><input style={styles.inp} value={confirmModal.street} onChange={e => setConfirmModal({ ...confirmModal, street: e.target.value })} required /></div>
            <div style={styles.field3}><label style={styles.lbl}>Suburb</label><input style={styles.inp} value={confirmModal.suburb} onChange={e => setConfirmModal({ ...confirmModal, suburb: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button style={styles.cancelBtn} onClick={() => setConfirmModal(null)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={() => saveAddress(confirmModal)}>Confirm &amp; Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Manual entry modal */}
      {manualModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Record Manually</h3>
              <button style={styles.closeBtn} onClick={() => setManualModal(false)}>✕</button>
            </div>
            <div style={styles.row2}>
              <div style={styles.field2}><label style={styles.lbl}>Unit Number</label><input style={styles.inp} value={manual.unit} onChange={e => setManual({ ...manual, unit: e.target.value })} placeholder="Optional" /></div>
              <div style={styles.field2}><label style={styles.lbl}>House Number</label><input style={styles.inp} value={manual.house} onChange={e => setManual({ ...manual, house: e.target.value })} required /></div>
            </div>
            <div style={styles.field3}><label style={styles.lbl}>Street Name</label><input style={styles.inp} value={manual.street} onChange={e => setManual({ ...manual, street: e.target.value })} required /></div>
            <div style={styles.field3}><label style={styles.lbl}>Suburb</label><input style={styles.inp} value={manual.suburb} onChange={e => setManual({ ...manual, suburb: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button style={styles.cancelBtn} onClick={() => setManualModal(false)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={() => saveAddress(manual)} disabled={!manual.house || !manual.street}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* End session confirm */}
      {endModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 8px' }}>End Session?</h3>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
              This will close session <strong>{code}</strong>. All data will be available to share and then deleted.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={styles.cancelBtn} onClick={() => setEndModal(false)}>Cancel</button>
              <button style={{ ...styles.confirmBtn, background: '#ef4444' }} onClick={() => { setEndModal(false); endSession(); }}>
                Share &amp; End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 },
  appName: { fontWeight: 700, fontSize: 16 },
  smallBtn: { background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer' },
  content: { padding: '16px', maxWidth: 600, margin: '0 auto' },
  card: { background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid #e5e7eb', marginBottom: 14 },
  blockGrid: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 },
  blockBtn: { padding: '14px 4px', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  blockBtnSel: { background: '#eff6ff', border: '2px solid #2563eb', color: '#2563eb' },
  recordBtn: { padding: '13px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  manualBtn: { padding: '13px', background: '#f3f4f6', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' },
  addrRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f3f4f6' },
  blockBadge: { background: '#eff6ff', color: '#2563eb', borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 700, marginRight: 8 },
  deleteBtn: { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14, padding: 4 },
  btn: { width: '100%', padding: '14px', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 10 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 500 },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  field2: {},
  field3: { marginBottom: 12 },
  lbl: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  inp: { width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  cancelBtn: { flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer' },
  confirmBtn: { flex: 2, padding: '12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12 },
  link: { color: '#2563eb', fontSize: 15 },
};
