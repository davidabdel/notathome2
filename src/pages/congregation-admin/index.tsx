import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface MapRow { id: string; map_number: number; name: string | null; block_count: number; image_url: string | null; }
interface Settings { name: string; pin_code: string; notification_email: string | null; }

export default function CongregationAdmin() {
  const router = useRouter();
  const [congregation, setCongregation] = useState('');
  const [maps, setMaps] = useState<MapRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'maps' | 'settings' | 'admins'>('maps');
  const [addModal, setAddModal] = useState(false);
  const [editMap, setEditMap] = useState<MapRow | null>(null);
  const [form, setForm] = useState({ map_number: '', name: '', block_count: '1' });
  const [settingsForm, setSettingsForm] = useState({ pin_code: '', notification_email: '' });
  const [msg, setMsg] = useState('');
  const [admins, setAdmins] = useState<Array<{ id: string; email: string; created_at: string }>>([]);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '' });

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/admin-auth/me');
      if (!meRes.ok) { router.push('/admin-login'); return; }
      const me = await meRes.json();
      if (me.role !== 'congregation_admin') { router.push('/admin-login'); return; }
      setCongregation(me.congregation_name || '');
      loadMaps();
      loadSettings();
      loadAdmins();
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

  const saveMap = async () => {
    const body = { map_number: Number(form.map_number), name: form.name || null, block_count: Number(form.block_count) };
    const res = editMap
      ? await fetch(`/api/maps/${editMap.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/maps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { setAddModal(false); setEditMap(null); setForm({ map_number: '', name: '', block_count: '1' }); loadMaps(); }
  };

  const deleteMap = async (id: string) => {
    if (!confirm('Delete this map and all its DNC entries?')) return;
    await fetch(`/api/maps/${id}`, { method: 'DELETE' });
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

  if (loading) return <div style={styles.center}><p>Loading…</p></div>;

  return (
    <>
      <Head><title>Congregation Admin — {congregation}</title></Head>
      <div style={styles.page}>
        <div style={styles.topBar}>
          <div>
            <div style={styles.appName}>Congregation Admin</div>
            <div style={styles.congName}>{congregation}</div>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>Sign Out</button>
        </div>

        <div style={styles.tabs}>
          {(['maps', 'settings', 'admins'] as const).map(t => (
            <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>
              {t === 'maps' ? '🗺 Maps' : t === 'settings' ? '⚙️ Settings' : '👥 Admins'}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {tab === 'maps' && (
            <>
              <button style={styles.addBtn} onClick={() => { setEditMap(null); setForm({ map_number: '', name: '', block_count: '1' }); setAddModal(true); }}>
                + Add Map
              </button>
              {maps.length === 0
                ? <p style={styles.empty}>No maps yet. Add your first map above.</p>
                : maps.map(m => (
                  <div key={m.id} style={styles.card}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>Map {m.map_number}{m.name ? ` — ${m.name}` : ''}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{m.block_count} blocks</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={styles.editBtn} onClick={() => { setEditMap(m); setForm({ map_number: String(m.map_number), name: m.name || '', block_count: String(m.block_count) }); setAddModal(true); }}>Edit</button>
                      <button style={styles.delBtn} onClick={() => deleteMap(m.id)}>Delete</button>
                    </div>
                  </div>
                ))
              }
            </>
          )}

          {tab === 'settings' && settings && (
            <div style={{ ...styles.card, flexDirection: 'column', alignItems: 'stretch' }}>
              <h3 style={{ margin: '0 0 16px' }}>Congregation Settings</h3>
              {msg && <div style={styles.success}>{msg}</div>}
              <div style={styles.field}>
                <label style={styles.lbl}>PIN Code (used by all members to log in)</label>
                <input style={styles.inp} value={settingsForm.pin_code} onChange={e => setSettingsForm({ ...settingsForm, pin_code: e.target.value })} placeholder="Enter PIN" />
              </div>
              <div style={styles.field}>
                <label style={styles.lbl}>Notification Email (receives auto-expiry session data)</label>
                <input style={styles.inp} type="email" value={settingsForm.notification_email} onChange={e => setSettingsForm({ ...settingsForm, notification_email: e.target.value })} placeholder="email@example.com" />
              </div>
              <button style={styles.saveBtn} onClick={saveSettings}>Save Settings</button>
            </div>
          )}

          {tab === 'admins' && (
            <>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>Up to 3 admins per congregation. ({admins.length}/3 used)</p>
              {admins.map(a => (
                <div key={a.id} style={styles.card}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{a.email}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Added {new Date(a.created_at).toLocaleDateString()}</div>
                  </div>
                  <button style={styles.delBtn} onClick={() => deleteAdmin(a.id)}>Remove</button>
                </div>
              ))}
              {admins.length < 3 && (
                <div style={{ ...styles.card, flexDirection: 'column', alignItems: 'stretch' }}>
                  <h4 style={{ margin: '0 0 12px' }}>Add Admin</h4>
                  <div style={styles.field}>
                    <label style={styles.lbl}>Email</label>
                    <input style={styles.inp} type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.lbl}>Password</label>
                    <input style={styles.inp} type="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} />
                  </div>
                  <button style={styles.saveBtn} onClick={addAdmin} disabled={!newAdmin.email || !newAdmin.password}>Add Admin</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {addModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 16px' }}>{editMap ? 'Edit Map' : 'Add Map'}</h3>
            <div style={styles.field}>
              <label style={styles.lbl}>Map Number</label>
              <input style={styles.inp} type="number" value={form.map_number} onChange={e => setForm({ ...form, map_number: e.target.value })} placeholder="e.g. 1" />
            </div>
            <div style={styles.field}>
              <label style={styles.lbl}>Map Name (optional)</label>
              <input style={styles.inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Green Valley - Currawong St" />
            </div>
            <div style={styles.field}>
              <label style={styles.lbl}>Number of Blocks</label>
              <input style={styles.inp} type="number" min="1" max="20" value={form.block_count} onChange={e => setForm({ ...form, block_count: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button style={styles.cancelBtn} onClick={() => setAddModal(false)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={saveMap}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#7c3aed', color: '#fff' },
  appName: { fontSize: 12, opacity: 0.8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  congName: { fontSize: 18, fontWeight: 700 },
  logoutBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },
  tabs: { display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  tab: { flex: 1, padding: '12px', border: 'none', background: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#6b7280' },
  tabActive: { color: '#7c3aed', borderBottom: '2px solid #7c3aed' },
  content: { padding: '16px', maxWidth: 600, margin: '0 auto' },
  addBtn: { width: '100%', padding: '13px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 14 },
  card: { background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e5e7eb', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 32 },
  editBtn: { background: '#eff6ff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#2563eb', cursor: 'pointer' },
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
