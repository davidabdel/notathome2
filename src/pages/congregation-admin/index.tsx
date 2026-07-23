import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface MapRow { id: string; map_number: number; name: string | null; block_count: number; image_url: string | null; }
interface DNCEntry { id: string; block_number?: number | null; address: string; note: string | null; last_visit?: string | null; }
interface Settings { name: string; pin_code: string; notification_email: string | null; }

export default function CongregationAdmin() {
  const router = useRouter();
  const [congregation, setCongregation] = useState('');
  const [maps, setMaps] = useState<MapRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'maps' | 'settings' | 'admins'>('maps');
  const [settingsForm, setSettingsForm] = useState({ pin_code: '', notification_email: '' });
  const [msg, setMsg] = useState('');
  const [admins, setAdmins] = useState<Array<{ id: string; email: string; created_at: string }>>([]);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '' });

  // Map detail modal
  const [detailMap, setDetailMap] = useState<MapRow | null>(null);
  const [detailForm, setDetailForm] = useState({ map_number: '', name: '', block_count: '1' });
  const [dnc, setDnc] = useState<DNCEntry[]>([]);
  const [dncForm, setDncForm] = useState({ address: '', note: '', block: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingMap, setSavingMap] = useState(false);
  const [addingDnc, setAddingDnc] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Add map modal
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ map_number: '', name: '', block_count: '10' });

  // DNC bulk import
  const csvRef = useRef<HTMLInputElement>(null);
  const [importingDnc, setImportingDnc] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/admin-auth/me');
      if (!meRes.ok) { router.push('/admin-login'); return; }
      const me = await meRes.json();
      if (me.role !== 'congregation_admin') { router.push('/admin-login'); return; }
      setCongregation(me.congregation_name || '');
      await Promise.all([loadMaps(), loadSettings(), loadAdmins()]);
      setLoading(false);
    };
    init();
  }, [router]);

  const loadMaps = async () => {
    const res = await fetch('/api/maps');
    if (res.ok) setMaps(await res.json());
  };

  const loadSettings = async () => {
    const res = await fetch('/api/congregation-admin/settings');
    if (res.ok) {
      const s = await res.json();
      setSettings(s);
      setSettingsForm({ pin_code: s.pin_code || '', notification_email: s.notification_email || '' });
    }
  };

  const loadAdmins = async () => {
    const res = await fetch('/api/congregation-admin/admins');
    if (res.ok) setAdmins(await res.json());
  };

  const loadDnc = async (mapId: string) => {
    const res = await fetch(`/api/maps/${mapId}/dnc`);
    if (res.ok) setDnc(await res.json());
  };

  const openDetail = (m: MapRow) => {
    setDetailMap(m);
    setDetailForm({ map_number: String(m.map_number), name: m.name || '', block_count: String(m.block_count) });
    setDnc([]);
    setDncForm({ address: '', note: '', block: '' });
    loadDnc(m.id);
  };

  const openAdd = () => {
    setAddForm({ map_number: '', name: '', block_count: '10' });
    setAddModal(true);
  };

  const createMap = async () => {
    const res = await fetch('/api/maps', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ map_number: Number(addForm.map_number), name: addForm.name || null, block_count: Number(addForm.block_count) }),
    });
    if (res.ok) {
      const created = await res.json();
      setAddModal(false);
      await loadMaps();
      openDetail(created);
    } else {
      const d = await res.json();
      alert(d.error || 'Failed to create map');
    }
  };

  const saveMapDetails = async () => {
    if (!detailMap) return;
    setSavingMap(true);
    await fetch(`/api/maps/${detailMap.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ map_number: Number(detailForm.map_number), name: detailForm.name || null, block_count: Number(detailForm.block_count) }),
    });
    await loadMaps();
    setSavingMap(false);
    setMsg('Saved!'); setTimeout(() => setMsg(''), 2000);
  };

  const uploadImage = async (file: File) => {
    if (!detailMap) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      const res = await fetch(`/api/maps/${detailMap.id}/image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, contentType: file.type }),
      });
      if (res.ok) {
        const { image_url } = await res.json();
        setDetailMap({ ...detailMap, image_url });
        await loadMaps();
      } else {
        alert('Image upload failed');
      }
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const addDnc = async () => {
    if (!detailMap || !dncForm.address.trim()) return;
    setAddingDnc(true);
    const res = await fetch(`/api/maps/${detailMap.id}/dnc`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: dncForm.address, note: dncForm.note, block_number: dncForm.block ? parseInt(dncForm.block, 10) : null }),
    });
    if (res.ok) { setDncForm({ address: '', note: '', block: '' }); loadDnc(detailMap.id); }
    setAddingDnc(false);
  };

  const deleteDnc = async (dncId: string) => {
    if (!detailMap) return;
    await fetch(`/api/maps/${detailMap.id}/dnc`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dnc_id: dncId }),
    });
    loadDnc(detailMap.id);
  };

  const importDncCsv = async (file: File) => {
    setImportMsg('');
    const text = await file.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { alert('CSV appears to be empty.'); return; }

    // Match columns by header name: Map Number, Block Number, Address, Date / Last Visit
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const col = (match: (h: string) => boolean) => headers.findIndex(match);
    const mapCol = col(h => h.includes('map'));
    const blockCol = col(h => h.includes('block'));
    const addrCol = col(h => h.includes('address'));
    const dateCol = col(h => h.includes('date') || h.includes('visit'));
    if (mapCol === -1 || addrCol === -1) {
      alert('CSV must have "Map Number" and "Address" columns.');
      return;
    }

    const entries = lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.trim());
      return {
        map_number: cells[mapCol],
        block_number: blockCol !== -1 ? cells[blockCol] || null : null,
        address: cells[addrCol] || '',
        last_visit: dateCol !== -1 ? cells[dateCol] || null : null,
      };
    }).filter(e => e.address && e.map_number);
    if (!entries.length) { alert('No valid rows found in CSV.'); return; }

    setImportingDnc(true);
    const res = await fetch('/api/maps/dnc-import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    setImportingDnc(false);
    if (res.ok) {
      const r = await res.json();
      let summary = `Imported ${r.imported} DNC entr${r.imported === 1 ? 'y' : 'ies'}` +
        (r.updated ? `, updated ${r.updated} existing` : '') + '.';
      if (r.unmatched_maps?.length) summary += `\nNo map found for map number(s): ${r.unmatched_maps.join(', ')} — those rows were skipped.`;
      setImportMsg(summary);
      if (detailMap) loadDnc(detailMap.id);
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Import failed');
    }
  };

  const deleteMap = async (id: string) => {
    if (!confirm('Delete this map and all its DNC entries?')) return;
    await fetch(`/api/maps/${id}`, { method: 'DELETE' });
    setDetailMap(null);
    loadMaps();
  };

  const saveSettings = async () => {
    const res = await fetch('/api/congregation-admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settingsForm),
    });
    if (res.ok) { setMsg('Settings saved!'); setTimeout(() => setMsg(''), 3000); }
  };

  const addAdmin = async () => {
    const res = await fetch('/api/congregation-admin/admins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAdmin),
    });
    if (res.ok) { setNewAdmin({ email: '', password: '' }); loadAdmins(); }
    else { const d = await res.json(); alert(d.error); }
  };

  const deleteAdmin = async (id: string) => {
    await fetch('/api/congregation-admin/admins', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin_id: id }) });
    loadAdmins();
  };

  const logout = async () => {
    await fetch('/api/admin-auth/logout', { method: 'POST' });
    router.push('/admin-login');
  };

  if (loading) return <div style={S.center}><p>Loading…</p></div>;

  return (
    <>
      <Head><title>Congregation Admin — {congregation}</title></Head>
      <div style={S.page}>
        <div style={S.topBar}>
          <div>
            <div style={S.appLabel}>CONGREGATION ADMIN</div>
            <div style={S.congName}>{congregation}</div>
          </div>
          <button style={S.logoutBtn} onClick={logout}>Sign Out</button>
        </div>

        <div style={S.tabs}>
          {(['maps', 'settings', 'admins'] as const).map(t => (
            <button key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }} onClick={() => setTab(t)}>
              {t === 'maps' ? '🗺 Maps' : t === 'settings' ? '⚙️ Settings' : '👥 Admins'}
            </button>
          ))}
        </div>

        <div style={S.content}>
          {tab === 'maps' && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={S.addBtn} onClick={openAdd}>+ Add Map</button>
                <button style={{ ...S.addBtn, background: '#d97706' }} onClick={() => csvRef.current?.click()} disabled={importingDnc}>
                  {importingDnc ? 'Importing…' : '⬆ Import DNC CSV'}
                </button>
                <input
                  ref={csvRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) importDncCsv(f); e.target.value = ''; }}
                />
              </div>
              {importMsg && <div style={{ ...S.success, whiteSpace: 'pre-line' }}>{importMsg}</div>}
              {maps.length === 0
                ? <p style={S.empty}>No maps yet.</p>
                : (
                  <div style={S.grid}>
                    {maps.map(m => (
                      <div key={m.id} style={S.thumb} onClick={() => openDetail(m)}>
                        {m.image_url
                          ? <img src={m.image_url} alt={`Map ${m.map_number}`} style={S.thumbImg} />
                          : <div style={S.thumbPlaceholder}><span style={{ fontSize: 28 }}>🗺</span><span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>No image</span></div>
                        }
                        <div style={S.thumbLabel}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>Map {m.map_number}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{m.block_count} blocks</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </>
          )}

          {tab === 'settings' && settings && (
            <div style={{ ...S.card, flexDirection: 'column', alignItems: 'stretch' }}>
              <h3 style={{ margin: '0 0 16px' }}>Congregation Settings</h3>
              {msg && <div style={S.success}>{msg}</div>}
              <div style={S.field}>
                <label style={S.lbl}>PIN Code (used by all members to log in)</label>
                <input style={S.inp} value={settingsForm.pin_code} onChange={e => setSettingsForm({ ...settingsForm, pin_code: e.target.value })} />
              </div>
              <div style={S.field}>
                <label style={S.lbl}>Notification Email (receives auto-expiry session data)</label>
                <input style={S.inp} type="email" value={settingsForm.notification_email} onChange={e => setSettingsForm({ ...settingsForm, notification_email: e.target.value })} />
              </div>
              <button style={S.saveBtn} onClick={saveSettings}>Save Settings</button>
            </div>
          )}

          {tab === 'admins' && (
            <>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>Up to 3 admins. ({admins.length}/3)</p>
              {admins.map(a => (
                <div key={a.id} style={S.card}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{a.email}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Added {new Date(a.created_at).toLocaleDateString()}</div>
                  </div>
                  <button style={S.delBtn} onClick={() => deleteAdmin(a.id)}>Remove</button>
                </div>
              ))}
              {admins.length < 3 && (
                <div style={{ ...S.card, flexDirection: 'column', alignItems: 'stretch', marginTop: 8 }}>
                  <h4 style={{ margin: '0 0 12px' }}>Add Admin</h4>
                  <div style={S.field}><label style={S.lbl}>Email</label><input style={S.inp} type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} /></div>
                  <div style={S.field}><label style={S.lbl}>Password</label><input style={S.inp} type="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} /></div>
                  <button style={S.saveBtn} onClick={addAdmin} disabled={!newAdmin.email || !newAdmin.password}>Add Admin</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Map modal */}
      {addModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h3 style={{ margin: '0 0 16px' }}>Add New Map</h3>
            <div style={S.field}><label style={S.lbl}>Map Number</label><input style={S.inp} type="number" value={addForm.map_number} onChange={e => setAddForm({ ...addForm, map_number: e.target.value })} placeholder="e.g. 1" /></div>
            <div style={S.field}><label style={S.lbl}>Name (optional)</label><input style={S.inp} value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="e.g. Green Valley" /></div>
            <div style={S.field}><label style={S.lbl}>Number of Blocks</label><input style={S.inp} type="number" min="1" max="50" value={addForm.block_count} onChange={e => setAddForm({ ...addForm, block_count: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button style={S.cancelBtn} onClick={() => setAddModal(false)}>Cancel</button>
              <button style={S.confirmBtn} onClick={createMap} disabled={!addForm.map_number || !addForm.block_count}>Create Map</button>
            </div>
          </div>
        </div>
      )}

      {/* Map detail modal */}
      {detailMap && (
        <div style={S.overlay}>
          <div style={{ ...S.modal, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Map {detailMap.map_number}</h3>
              <button onClick={() => setDetailMap(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>

            {/* Map image */}
            <div style={{ marginBottom: 16 }}>
              {detailMap.image_url
                ? <img src={detailMap.image_url} alt="Map" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                : <div style={{ background: '#f3f4f6', borderRadius: 10, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>No image uploaded</div>
              }
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              <button style={{ ...S.saveBtn, marginTop: 8, background: uploadingImage ? '#a78bfa' : '#7c3aed' }} onClick={() => fileRef.current?.click()} disabled={uploadingImage}>
                {uploadingImage ? 'Uploading…' : detailMap.image_url ? '📷 Replace Image' : '📷 Upload Image'}
              </button>
            </div>

            {/* Map details */}
            <div style={S.field}><label style={S.lbl}>Map Number</label><input style={S.inp} type="number" value={detailForm.map_number} onChange={e => setDetailForm({ ...detailForm, map_number: e.target.value })} /></div>
            <div style={S.field}><label style={S.lbl}>Name (optional)</label><input style={S.inp} value={detailForm.name} onChange={e => setDetailForm({ ...detailForm, name: e.target.value })} placeholder="e.g. Green Valley" /></div>
            <div style={S.field}><label style={S.lbl}>Number of Blocks</label><input style={S.inp} type="number" min="1" max="50" value={detailForm.block_count} onChange={e => setDetailForm({ ...detailForm, block_count: e.target.value })} /></div>
            {msg && <div style={S.success}>{msg}</div>}
            <button style={{ ...S.saveBtn, marginBottom: 20 }} onClick={saveMapDetails} disabled={savingMap}>{savingMap ? 'Saving…' : 'Save Changes'}</button>

            {/* DNC section */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>Do Not Call Addresses ({dnc.length})</h4>
              {dnc.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>No DNC entries yet.</p>}
              {dnc.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, padding: '8px 12px', background: '#fef9f0', borderRadius: 8, border: '1px solid #fde68a' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{d.block_number != null ? `Block ${d.block_number} — ` : ''}{d.address}</div>
                    {(d.note || d.last_visit) && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {[d.note, d.last_visit ? `Last visit: ${d.last_visit}` : ''].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteDnc(d.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <input style={{ ...S.inp, marginBottom: 6 }} placeholder="Block number (optional, e.g. 2)" inputMode="numeric" value={dncForm.block} onChange={e => setDncForm({ ...dncForm, block: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && addDnc()} />
                <input style={{ ...S.inp, marginBottom: 6 }} placeholder="Address (e.g. 12 Smith St)" value={dncForm.address} onChange={e => setDncForm({ ...dncForm, address: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && addDnc()} />
                <input style={{ ...S.inp, marginBottom: 8 }} placeholder="Note (optional, e.g. Dog, Hostile)" value={dncForm.note} onChange={e => setDncForm({ ...dncForm, note: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && addDnc()} />
                <button style={{ ...S.saveBtn, background: addingDnc ? '#f59e0b' : '#d97706' }} onClick={addDnc} disabled={addingDnc || !dncForm.address.trim()}>
                  {addingDnc ? 'Adding…' : '+ Add DNC Entry'}
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 16 }}>
              <button style={{ ...S.cancelBtn, width: '100%', color: '#dc2626' }} onClick={() => deleteMap(detailMap.id)}>Delete This Map</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#7c3aed', color: '#fff' },
  appLabel: { fontSize: 11, opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' },
  congName: { fontSize: 20, fontWeight: 700 },
  logoutBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },
  tabs: { display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  tab: { flex: 1, padding: '12px', border: 'none', background: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#6b7280' },
  tabActive: { color: '#7c3aed', borderBottom: '2px solid #7c3aed' },
  content: { padding: '16px', maxWidth: 700, margin: '0 auto' },
  addBtn: { width: '100%', padding: '13px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 },
  thumb: { background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'box-shadow 0.15s' },
  thumbImg: { width: '100%', height: 110, objectFit: 'cover', display: 'block' },
  thumbPlaceholder: { width: '100%', height: 110, background: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  thumbLabel: { padding: '8px 10px 10px' },
  card: { background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e5e7eb', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 32 },
  delBtn: { background: '#fef2f2', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#dc2626', cursor: 'pointer' },
  field: { marginBottom: 14 },
  lbl: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  inp: { width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  saveBtn: { width: '100%', padding: '12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  success: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', color: '#166534', fontSize: 14, marginBottom: 14 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 500 },
  cancelBtn: { flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer' },
  confirmBtn: { flex: 2, padding: '12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
};
