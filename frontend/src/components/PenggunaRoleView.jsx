import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';

export default function PenggunaRoleView({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [roles, setRoles] = useState([]);
  const [poliList, setPoliList] = useState([]);

  const [form, setForm] = useState({
    nama: '',
    username: '',
    email: '',
    telepon: '',
    role_id: '',
    poli_id: '',
    status: 'aktif',
    password: '',
  });

  const showAlert = (text, type = 'success') => {
    setAlert({ text, type });
    setTimeout(() => setAlert(null), 4000);
  };

  useEffect(() => {
    loadUsers();
    loadMeta();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      if (res && res.success) setUsers(res.data || []);
    } catch {
      showAlert('Gagal memuat data pengguna.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const res = await api.get('/users/meta');
      if (res && res.success) {
        setRoles(res.roles || []);
        setPoliList(res.poli_list || []);
      }
    } catch {
      // Ignore
    }
  };

  const openCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormErrors([]);
    setForm({ nama: '', username: '', email: '', telepon: '', role_id: '', poli_id: '', status: 'aktif', password: '' });
    setModalOpen(true);
  };

  const openEdit = async (user) => {
    setIsEditing(true);
    setEditingId(user.id);
    setFormErrors([]);
    setForm({
      nama: user.nama || '',
      username: user.username || '',
      email: user.email || '',
      telepon: user.telepon || '',
      role_id: String(user.role_id || ''),
      poli_id: String(user.poli_id || ''),
      status: user.status || 'aktif',
      password: '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);

    try {
      let res;
      if (isEditing) {
        res = await api.post(`/users/${editingId}`, { ...form, _method: 'PUT' });
      } else {
        res = await api.post('/users', form);
      }

      if (res && res.success) {
        showAlert(res.message || 'Data berhasil disimpan.', 'success');
        setModalOpen(false);
        loadUsers();
      } else {
        setFormErrors(res?.errors || [res?.message || 'Gagal menyimpan.']);
      }
    } catch (err) {
      setFormErrors([err.message || 'Terjadi kesalahan saat menyimpan.']);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Yakin ingin menghapus pengguna ${user.nama}?`)) return;

    try {
      const res = await api.post(`/users/${user.id}`, { _method: 'DELETE' });
      if (res && res.success) {
        showAlert(res.message || 'Pengguna dihapus.', 'success');
        loadUsers();
      } else {
        showAlert(res?.message || 'Gagal menghapus pengguna.', 'danger');
      }
    } catch (err) {
      showAlert(err.message || 'Gagal menghapus pengguna.', 'danger');
    }
  };

  const formatLastLogin = (val) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return val;
    }
  };

  const selectedRoleKode = roles.find(r => String(r.id) === String(form.role_id))?.kode || '';
  const isDokter = selectedRoleKode === 'dokter';

  const tableColumns = [
    {
      key: 'user_display',
      label: 'PENGGUNA',
      sortable: true,
      render: (row) => {
        const isSelf = currentUserId && row.id === currentUserId;
        return (
          <div className="cell-user">
            <span className="cell-avatar">{(row.nama || 'U').charAt(0).toUpperCase()}</span>
            <div>
              <div className="cu-name">
                {row.nama}
                {isSelf && <span className="badge badge-blue" style={{ marginLeft: 6 }}>Anda</span>}
              </div>
              <div className="cu-sub">@{row.username}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role_nama',
      label: 'ROLE',
      sortable: true,
      render: (row) => (
        <>
          <span className="badge badge-gray">{row.role_nama}</span>
          {row.role_kode === 'dokter' && row.poli_nama && (
            <small style={{ color: 'var(--muted)', marginLeft: 6 }}>{row.poli_nama}</small>
          )}
        </>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (row) => (
        <span className={`badge ${row.status === 'aktif' ? 'badge-green' : 'badge-red'}`}>
          {row.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    {
      key: 'last_login',
      label: 'LOGIN TERAKHIR',
      sortable: true,
      render: (row) => formatLastLogin(row.last_login),
    },
    {
      key: '_actions',
      label: 'AKSI',
      sortable: false,
      thClassName: 'no-sort col-actions',
      className: 'cell-actions',
      render: (row) => {
        const isSelf = currentUserId && row.id === currentUserId;
        return (
          <div className="cell-actions-inner">
            <button type="button" className="btn btn-sm btn-light" onClick={() => openEdit(row)}>Edit</button>
            {!isSelf && (
              <button type="button" className="btn btn-sm btn-red" onClick={() => handleDelete(row)}>Hapus</button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      {/* Page Toolbar matching legacy modules/pengaturan/users.php */}
      <div className="page-toolbar">
        <div>
          <div className="pt-title">
            <AppIcon name="users" style={{ marginRight: 8 }} /> Pengguna &amp; Role
          </div>
          <div className="pt-sub">{users.length} pengguna terdaftar dalam sistem</div>
        </div>
        <div className="pt-actions">
          <button type="button" className="btn" onClick={openCreate}>
            <AppIcon name="plus" /> Tambah Pengguna
          </button>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ marginTop: 14 }}>{alert.text}</div>
      )}

      <div className="table-wrap" style={{ marginTop: 18 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>Memuat data pengguna...</div>
        ) : (
          <DataTableWrapper
            columns={tableColumns}
            data={users}
            defaultPageSize={25}
            emptyText="Belum ada pengguna terdaftar."
            rowKey="id"
          />
        )}
      </div>

      {/* Modal Tambah / Edit Pengguna matching legacy user_form.php */}
      {modalOpen && (
        <div className="modal-overlay open" style={{ display: 'flex' }}>
          <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 680 }}>
            <div className="modal-head">
              <div className="modal-title">
                <AppIcon name="user" style={{ marginRight: 8 }} />
                {isEditing ? 'Edit Pengguna' : 'Tambah Pengguna'}
              </div>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)} aria-label="Tutup">&times;</button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              {formErrors.length > 0 && (
                <div className="alert alert-danger">
                  {formErrors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Nama Lengkap <span className="req">*</span></label>
                  <input type="text" className="form-control" value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Username <span className="req">*</span></label>
                  <input type="text" className="form-control" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="form-control" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>No. Telepon</label>
                  <input type="text" className="form-control" value={form.telepon} onChange={e => setForm(p => ({ ...p, telepon: e.target.value }))} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role <span className="req">*</span></label>
                  <select
                    className="form-control"
                    value={form.role_id}
                    onChange={e => setForm(p => ({ ...p, role_id: e.target.value, poli_id: '' }))}
                    required
                  >
                    <option value="">-- Pilih Role --</option>
                    {roles.map(r => (
                      <option key={r.id} value={String(r.id)}>{r.nama}</option>
                    ))}
                  </select>
                </div>
                {isDokter && (
                  <div className="form-group">
                    <label>Poli <span className="req">*</span></label>
                    <select
                      className="form-control"
                      value={form.poli_id}
                      onChange={e => setForm(p => ({ ...p, poli_id: e.target.value }))}
                      required
                    >
                      <option value="">-- Pilih Poli --</option>
                      {poliList.map(p => (
                        <option key={p.id} value={String(p.id)}>{p.nama}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-control" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    Password {isEditing ? <small style={{ color: 'var(--muted)', fontWeight: 400 }}>(kosongkan jika tidak diubah)</small> : <span className="req">*</span>}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    required={!isEditing}
                    minLength={isEditing ? undefined : 5}
                    placeholder={isEditing ? 'Kosongkan jika tidak diubah' : 'min. 5 karakter'}
                  />
                </div>
              </div>

              <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <button type="button" className="btn btn-light" onClick={() => setModalOpen(false)}>Batal</button>
                <button type="submit" className="btn" disabled={submitting}>
                  <AppIcon name="save" /> {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
