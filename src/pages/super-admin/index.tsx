import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface Congregation {
  id: string; name: string; status: string; contact_email: string | null;
  notification_email: string | null; created_at: string;
  map_count: number; admin_count: number; active_sessions: number;
}
interface Request { id: string; name: string; contact_email: string; created_at: string; }
interface CongAdmin { id: string; email: string; }

export default function SuperAdmin() {
  const router = useRouter();
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [tab, setTab] = useState<'congregations' | 'requests'>('congregations');
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<Congregation | null>(null);
  const [approveModal, setApproveModal] = useState<Request | null>(null);
  const [form, setForm] = useState({ name: '', pin_code: '', contact_email: '' });
  const [editForm, setEditForm] = useState({ name: '', pin_code: '', status: 'active', contact_email: '', notification_email: '' });
  const [approvePIN, setApprovePIN] = useState('');
  const [search, setSearch] = useState('');
  const [resetModal, setResetModal] = useState<{ congregation: Congregation; admins: CongAdmin[] } | null>(null);
  const [resetTarget, setResetTarget] = useState<CongAdmin | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/admin-auth/me');
      if (!meRes.ok) { router.push('/admin-login'); return; }
      const me = await meRes.json();
      if (me.role !== 'super_admin') { router.push('/admin-login'); return; }
      loadAll();
      setLoading(false);
    };
    init();
  }, [router]);

  const loadAll = async () => {
    const [cRes, rRes] = await Promise.all([
      fetch('/api/super-admin/congregations'),
      fetch('/api/super-admin/requests'),
    ]);
    if (cRes.ok) setCongregations(await cRes.json());
    if (rRes.ok) setRequests(await rRes.json());
  };

  const addCongregation = async () => {
    const res = await fetch('/api/super-admin/congregations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (res.ok) { setAddModal(false); setForm({ name: '', pin_code: '', contact_email: '' }); loadAll(); }
    else { const d = await res.json(); alert(d.error); }
  };

  const updateCongregation = async () => {
    if (!editModal) return;
    await fetch(`/api/super-admin/congregations/${editModal.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
    });
    setEditModal(null);
    loadAll();
  };

  const deleteCongregation = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and ALL its data? This cannot be undone.`)) return;
    await fetch(`/api/super-admin/congregations/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const approveRequest = async () => {
    if (!approveModal) return;
    await fetch('/api/super-admin/requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: approveModal.id, action: 'approve', pin_code: approvePIN }),
    });
    setApproveModal(null);
    setApprovePIN('');
    loadAll();
  };

  const rejectRequest = async (id: string) => {
    await fetch('/api/super-admin/requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reject' }),
    });
    loadAll();
  };

  const openResetModal = async (c: Congregation) => {
    const res = await fetch(`/api/congregation-admin/admins?congregation_id=${c.id}`);
    const admins: CongAdmin[] = res.ok ? await res.json() : [];
    setResetModal({ congregation: c, admins });
    setResetTarget(null);
    setResetPassword('');
    setResetDone(false);
  };

  const doResetPassword = async () => {
    if (!resetTarget) return;
    const res = await fetch('/api/super-admin/reset-admin-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: resetTarget.id, password: resetPassword }),
    });
    if (res.ok) { setResetDone(true); setResetPassword(''); }
    else { const d = await res.json(); alert(d.error); }
  };

  const logout = async () => {
    await fetch('/api/admin-auth/logout', { method: 'POST' });
    router.push('/admin-login');
  };

  const filtered = congregations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div style={styles.center}><p>Loading…</p></div>;

  return (
    <>
      <Head><title>Super Admin — Not At Home</title></Head>
      <div style={styles.page}>
        <div style={styles.topBar}>
          <div>
            <div style={styles.badge}>SUPER ADMIN</div>
            <div style={styles.appName}>Not At Home</div>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>Sign Out</button>
        </div>

        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(tab === 'congregations' ? styles.tabActive : {}) }} onClick={() => setTab('congregations')}>
            🏛 Congregations ({congregations.length})
          </button>
          <button style={{ ...styles.tab, ...(tab === 'requests' ? styles.tabActive : {}) }} onClick={() => setTab('requests')}>
            📬 Requests {requests.length > 0 && <span style={styles.badge2}>{requests.length}</span>}
          </button>
        </div>

        <div style={styles.content}>
          {tab === 'congregations' && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input style={{ ...styles.inp, flex: 1 }} placeholder="Search congregations…" value={search} onChange={e => setSearch(e.target.value)} />
                <button style={styles.addBtn} onClick={() => setAddModal(true)}>+ Add</button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Congregation</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Maps</th>
                      <th style={styles.th}>Admins</th>
                      <th style={styles.th}>Active</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          {c.contact_email && <div style={{ fontSize: 12, color: '#9ca3af' }}>{c.contact_email}</div>}
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.statusBadge, background: c.status === 'active' ? '#f0fdf4' : '#fef2f2', color: c.status === 'active' ? '#166534' : '#dc2626' }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>{c.map_count}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>{c.admin_count}/3</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>{c.active_sessions > 0 ? <span style={{ color: '#10b981', fontWeight: 700 }}>{c.active_sessions}</span> : 0}</td>
                        <td style={styles.td}>
                          <button style={styles.editBtn} onClick={() => { setEditModal(c); setEditForm({ name: c.name, pin_code: '', status: c.status, contact_email: c.contact_email || '', notification_email: c.notification_email || '' }); }}>Edit</button>
                          <button style={{ ...styles.editBtn, color: '#2563eb', background: '#eff6ff', marginLeft: 6 }} onClick={() => openResetModal(c)}>Admins</button>
                          <button style={{ ...styles.editBtn, color: '#dc2626', background: '#fef2f2', marginLeft: 6 }} onClick={() => deleteCongregation(c.id, c.name)}>Del</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <p style={styles.empty}>No congregations found</p>}
              </div>
            </>
          )}

          {tab === 'requests' && (
            <>
              {requests.length === 0
                ? <p style={styles.empty}>No pending requests</p>
                : requests.map(r => (
                  <div key={r.id} style={styles.reqCard}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>{r.contact_email}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={styles.approveBtn} onClick={() => { setApproveModal(r); setApprovePIN(''); }}>Approve</button>
                      <button style={styles.rejectBtn} onClick={() => rejectRequest(r.id)}>Reject</button>
                    </div>
                  </div>
                ))
              }
            </>
          )}
        </div>
      </div>

      {addModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 16px' }}>Add Congregation</h3>
            <div style={styles.fieldG}><label style={styles.lbl}>Name</label><input style={styles.inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div style={styles.fieldG}><label style={styles.lbl}>PIN Code</label><input style={styles.inp} value={form.pin_code} onChange={e => setForm({ ...form, pin_code: e.target.value })} placeholder="e.g. 1234" /></div>
            <div style={styles.fieldG}><label style={styles.lbl}>Contact Email (optional)</label><input style={styles.inp} type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button style={styles.cancelBtn} onClick={() => setAddModal(false)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={addCongregation}>Add</button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 16px' }}>Edit — {editModal.name}</h3>
            <div style={styles.fieldG}><label style={styles.lbl}>Name</label><input style={styles.inp} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div style={styles.fieldG}><label style={styles.lbl}>New PIN Code (leave blank to keep)</label><input style={styles.inp} value={editForm.pin_code} onChange={e => setEditForm({ ...editForm, pin_code: e.target.value })} placeholder="Leave blank to keep current" /></div>
            <div style={styles.fieldG}><label style={styles.lbl}>Status</label>
              <select style={styles.inp} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div style={styles.fieldG}><label style={styles.lbl}>Contact Email</label><input style={styles.inp} type="email" value={editForm.contact_email} onChange={e => setEditForm({ ...editForm, contact_email: e.target.value })} /></div>
            <div style={styles.fieldG}><label style={styles.lbl}>Notification Email (auto-expiry)</label><input style={styles.inp} type="email" value={editForm.notification_email} onChange={e => setEditForm({ ...editForm, notification_email: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button style={styles.cancelBtn} onClick={() => setEditModal(null)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={updateCongregation}>Save</button>
            </div>
          </div>
        </div>
      )}

      {resetModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 4px' }}>Admins — {resetModal.congregation.name}</h3>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>Select an admin to reset their password.</p>
            {resetModal.admins.length === 0 && <p style={{ color: '#9ca3af', fontSize: 14 }}>No admins set up for this congregation.</p>}
            {resetModal.admins.map(a => (
              <button key={a.id} onClick={() => { setResetTarget(a); setResetDone(false); setResetPassword(''); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 8, borderRadius: 8, border: `1.5px solid ${resetTarget?.id === a.id ? '#2563eb' : '#e5e7eb'}`, background: resetTarget?.id === a.id ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 14 }}>
                {a.email}
              </button>
            ))}
            {resetTarget && (
              <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                {resetDone ? (
                  <p style={{ color: '#16a34a', fontWeight: 600 }}>✓ Password updated for {resetTarget.email}</p>
                ) : (
                  <>
                    <label style={styles.lbl}>New Password for {resetTarget.email}</label>
                    <input style={{ ...styles.inp, marginBottom: 12 }} type="password" placeholder="Min. 8 characters" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
                    <button style={{ ...styles.confirmBtn, background: '#2563eb', width: '100%', padding: '11px' }} onClick={doResetPassword} disabled={resetPassword.length < 8}>
                      Reset Password
                    </button>
                  </>
                )}
              </div>
            )}
            <button style={{ ...styles.cancelBtn, marginTop: 16, width: '100%' }} onClick={() => setResetModal(null)}>Close</button>
          </div>
        </div>
      )}

      {approveModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 8px' }}>Approve — {approveModal.name}</h3>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>Set the PIN code for this congregation:</p>
            <div style={styles.fieldG}><label style={styles.lbl}>PIN Code</label><input style={styles.inp} value={approvePIN} onChange={e => setApprovePIN(e.target.value)} placeholder="e.g. 1234" /></div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button style={styles.cancelBtn} onClick={() => setApproveModal(null)}>Cancel</button>
              <button style={{ ...styles.confirmBtn, background: '#10b981' }} onClick={approveRequest}>Approve & Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#111827', color: '#fff' },
  badge: { fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#fbbf24', marginBottom: 2 },
  appName: { fontSize: 18, fontWeight: 700 },
  logoutBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },
  tabs: { display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  tab: { flex: 1, padding: '13px', border: 'none', background: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#6b7280' },
  tabActive: { color: '#111827', borderBottom: '2px solid #111827' },
  badge2: { background: '#ef4444', color: '#fff', borderRadius: 12, padding: '1px 7px', fontSize: 11, marginLeft: 6, fontWeight: 700 },
  content: { padding: '16px', maxWidth: 900, margin: '0 auto' },
  inp: { width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  addBtn: { padding: '10px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden' },
  th: { padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '12px 14px', fontSize: 14, verticalAlign: 'middle' },
  statusBadge: { borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600 },
  editBtn: { background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 48 },
  reqCard: { background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e5e7eb', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 },
  approveBtn: { background: '#f0fdf4', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#166534', cursor: 'pointer' },
  rejectBtn: { background: '#fef2f2', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#dc2626', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto' },
  fieldG: { marginBottom: 14 },
  lbl: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  cancelBtn: { flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer' },
  confirmBtn: { flex: 2, padding: '12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
};
