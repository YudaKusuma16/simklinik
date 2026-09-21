import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';

export default function MasterDataView({ initialGroup, initialSlug = null, onNavigateSlug = null }) {
  const [entities, setEntities] = useState({});
  const [loadingEntities, setLoadingEntities] = useState(true);

  const getDefaultSlug = (grp) => {
    switch (grp) {
      case 'Layanan & Tarif':
        return 'tindakan';
      case 'Medicine':
      case 'Farmasi':
        return 'obat';
      case 'Penjamin & Bank':
        return 'asuransi';
      case 'Billing':
      case 'Kode Pembatalan':
        return 'kode_pembatalan';
      case 'Pasien':
        return 'kelompok_pasien';
      default:
        return 'poli';
    }
  };

  const [activeGroup, setActiveGroup] = useState(initialGroup || 'SDM & Poli');
  const [activeSlug, setActiveSlug] = useState(() => initialSlug || getDefaultSlug(initialGroup || 'SDM & Poli'));

  const findMatchedSlug = (allEntities, targetGroup) => {
    const pref = getDefaultSlug(targetGroup);
    if (allEntities[pref]) return pref;

    const slugs = Object.keys(allEntities);
    if (!slugs.length) return null;
    return slugs.find((s) => {
      const g = allEntities[s].group;
      if (!g) return false;
      return g.toLowerCase() === targetGroup.toLowerCase() ||
        (targetGroup.includes('Farmasi') && (g.includes('Farmasi') || g.includes('Medicine') || g.includes('Obat'))) ||
        ((targetGroup.includes('Batal') || targetGroup === 'Billing') && g.includes('Billing')) ||
        (targetGroup === 'Pasien' && g.toLowerCase().includes('pasien'));
    }) || null;
  };

  useEffect(() => {
    if (initialSlug) {
      setActiveSlug(initialSlug);
      if (entities[initialSlug]) {
        setActiveGroup(entities[initialSlug].group);
      }
    } else if (initialGroup) {
      setActiveGroup(initialGroup);
      if (Object.keys(entities).length > 0) {
        const matchSlug = findMatchedSlug(entities, initialGroup);
        if (matchSlug) {
          setActiveSlug(matchSlug);
        }
      }
    }
  }, [initialGroup, initialSlug]);

  const [records, setRecords] = useState([]);
  const [lookups, setLookups] = useState({});
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Alerts
  const [alert, setAlert] = useState(null);

  const showAlert = (text, type = 'success') => {
    setAlert({ text, type });
    setTimeout(() => setAlert(null), 4000);
  };

  // 1. Fetch all master entities
  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      setLoadingEntities(true);
      const res = await api.get('/master/entities');
      if (res.success && res.data) {
        setEntities(res.data);
        const slugs = Object.keys(res.data);
        if (slugs.length > 0) {
          const currentTarget = activeSlug || initialSlug;
          let matchSlug = null;
          if (currentTarget && res.data[currentTarget]) {
            matchSlug = currentTarget;
          } else {
            const targetGroup = activeGroup || initialGroup || 'SDM & Poli';
            matchSlug = findMatchedSlug(res.data, targetGroup) ||
              slugs.find((s) => res.data[s].group === 'SDM & Poli') ||
              slugs[0];
          }

          setActiveSlug(matchSlug);
          if (res.data[matchSlug]) {
            setActiveGroup(res.data[matchSlug].group);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load entities:', err);
      showAlert('Gagal memuat daftar entitas master data.', 'danger');
    } finally {
      setLoadingEntities(false);
    }
  };

  // 2. Fetch records when activeSlug or searchQuery changes
  useEffect(() => {
    if (activeSlug) {
      loadRecords();
    }
  }, [activeSlug, searchQuery]);

  const loadRecords = async () => {
    try {
      setLoadingRecords(true);
      const endpoint = `/master/${activeSlug}${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`;
      const res = await api.get(endpoint);
      if (res.success) {
        setRecords(res.data || []);
        setLookups(res.lookups || {});
      }
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Group entities by group
  const groupedEntities = {};
  Object.values(entities).forEach((ent) => {
    if (!groupedEntities[ent.group]) {
      groupedEntities[ent.group] = [];
    }
    groupedEntities[ent.group].push(ent);
  });

  const groupNames = Object.keys(groupedEntities);
  const currentEntity = entities[activeSlug] || null;

  // Handle opening modal for CREATE
  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedId(null);
    setFormErrors([]);

    const initial = {};
    if (currentEntity && currentEntity.fields) {
      Object.entries(currentEntity.fields).forEach(([key, field]) => {
        initial[key] = field.default !== undefined ? field.default : '';
      });
    }
    setFormData(initial);
    setModalOpen(true);
  };

  // Handle opening modal for EDIT
  const handleOpenEdit = async (row) => {
    setIsEditing(true);
    setSelectedId(row.id);
    setFormErrors([]);

    try {
      const res = await api.get(`/master/${activeSlug}/${row.id}`);
      if (res.success && res.data) {
        setFormData(res.data);
        setModalOpen(true);
      }
    } catch (err) {
      showAlert('Gagal memuat detail data.', 'danger');
    }
  };

  // Handle saving form
  const handleSave = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);

    try {
      let res;
      if (isEditing) {
        res = await api.post(`/master/${activeSlug}/${selectedId}`, { ...formData, _method: 'PUT' });
      } else {
        res = await api.post(`/master/${activeSlug}`, formData);
      }

      if (res.success) {
        showAlert(res.message || 'Data berhasil disimpan!', 'success');
        setModalOpen(false);
        loadRecords();
        loadEntities();
      }
    } catch (err) {
      setFormErrors([err.message || 'Terjadi kesalahan saat menyimpan.']);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (row) => {
    const confirmName = row.nama || row.nama_bank || row.kode || `#${row.id}`;
    if (!window.confirm(`Yakin ingin menghapus ${confirmName}?`)) {
      return;
    }

    try {
      const res = await api.post(`/master/${activeSlug}/${row.id}`, { _method: 'DELETE' });
      if (res.success) {
        showAlert(res.message || 'Data berhasil dihapus.', 'success');
        loadRecords();
        loadEntities();
      }
    } catch (err) {
      showAlert(err.message || 'Data tidak dapat dihapus.', 'danger');
    }
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined || val === '') return '-';
    const num = Number(val);
    if (isNaN(num)) return val;
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const getEntityIcon = (slug) => {
    switch (slug) {
      case 'tindakan':
        return 'syringe';
      case 'konsultasi':
        return 'user';
      case 'lab_kategori':
      case 'lab_pemeriksaan':
        return 'flask';
      case 'rad_kategori':
      case 'rad_pemeriksaan':
        return 'scan';
      case 'diag_kategori':
      case 'diag_pemeriksaan':
        return 'monitor';
      case 'fisio_kategori':
      case 'fisio_pemeriksaan':
        return 'pelayanan';
      case 'spesialisasi':
        return 'award';
      case 'dokter':
        return 'user';
      case 'poli':
        return 'hospital';
      case 'jadwal_dokter':
        return 'calendar';
      case 'obat_kategori':
        return 'tag';
      case 'obat_satuan':
        return 'ruler';
      case 'supplier':
        return 'truck';
      case 'obat':
        return 'pills';
      case 'asuransi':
        return 'shield';
      case 'corporate':
        return 'building';
      case 'bank':
        return 'bank';
      case 'kode_pembatalan':
      case 'kode_pembatalan_reg':
        return 'close';
      case 'kelompok_pasien':
        return 'users';
      default:
        return 'master';
    }
  };

  if (loadingEntities && Object.keys(entities).length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
        Memuat Master Data SIM Klinik...
      </div>
    );
  }

  const listFields = currentEntity && currentEntity.fields
    ? Object.entries(currentEntity.fields).filter(([_, f]) => f.list)
    : [];

  const sortButtons = [];
  if (listFields.length > 0) {
    let colIndex = 1;
    listFields.forEach(([key, f]) => {
      if (['kode', 'nama', 'nama_bank', 'no_mr', 'no_rekening'].includes(key) || (sortButtons.length < 2 && ['text', 'readonly', 'fk'].includes(f.type))) {
        sortButtons.push({
          key,
          label: f.label,
          col: colIndex,
        });
      }
      colIndex++;
    });
  }

  return (
    <div>
      {/* Page Toolbar matching backend/legacy/modules/master/index.php */}
      <div className="page-toolbar">
        <div>
          <div className="pt-title">{currentEntity?.label || 'Master Data'}</div>
          <div className="pt-sub">Master Data &middot; {activeGroup === 'Billing' ? 'Kode Pembatalan' : activeGroup}</div>
        </div>
        <div className="pt-actions">
          <button type="button" className="btn" onClick={handleOpenCreate}>
            <AppIcon name="plus" /> Tambah {currentEntity?.singular || currentEntity?.label || 'Data'}
          </button>
        </div>
      </div>

      {/* Global Alert */}
      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ marginTop: 14 }}>
          {alert.text}
        </div>
      )}

      {/* Vertical Tabs & Table Split Panel (No horizontal panel-tabs matching legacy) */}
      <div className="master-split" style={{ marginTop: 18 }}>
        {/* Left Side: Vtabs for entities in group */}
        <nav className="vtabs">
          {(groupedEntities[activeGroup] || []).map((ent) => {
            const isEntActive = ent.slug === activeSlug;
            return (
              <a
                key={ent.slug}
                href={`#${ent.slug}`}
                className={`vtab ${isEntActive ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (ent.slug === activeSlug) return;
                  setActiveSlug(ent.slug);
                  setActiveGroup(ent.group || activeGroup);
                  setSearchQuery('');
                  if (onNavigateSlug) onNavigateSlug(ent.group || activeGroup, ent.slug);
                }}
              >
                <span className="vt-main">
                  <span className="vt-ico"><AppIcon name={ent.icon_name || getEntityIcon(ent.slug)} /></span>
                  <span>{ent.label}</span>
                </span>
                <span className="tab-count">{ent.count || 0}</span>
              </a>
            );
          })}
        </nav>

        {/* Right Side: Data Table */}
        <div className="table-wrap" style={{ flex: 1, minWidth: 0, margin: 0 }}>
          {loadingRecords ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
              Memuat data...
            </div>
          ) : (
            <DataTableWrapper
              columns={[
                {
                  key: '_no',
                  label: 'NO',
                  sortable: false,
                  thClassName: 'no-sort col-no',
                  className: 'col-no',
                  style: { width: 45 },
                  render: (_, index) => index,
                },
                ...listFields.map(([key, f]) => ({
                  key,
                  label: f.label.toUpperCase(),
                  sortable: true,
                  render: (row) => {
                    let displayVal = row[key];
                    if (f.type === 'fk') {
                      displayVal = row[key + '_nama'] || row[key] || '-';
                    } else if (f.type === 'money') {
                      displayVal = formatCurrency(displayVal);
                    } else if (f.type === 'enum' && key === 'status') {
                      return (
                        <span className={`badge ${displayVal === 'aktif' ? 'badge-green' : 'badge-gray'}`}>
                          {displayVal === 'aktif' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      );
                    } else if (f.type === 'readonly') {
                      return <code>{displayVal}</code>;
                    }
                    return displayVal !== null && displayVal !== undefined ? displayVal : '-';
                  },
                })),
                {
                  key: '_actions',
                  label: 'AKSI',
                  sortable: false,
                  thClassName: 'no-sort col-actions',
                  className: 'cell-actions',
                  render: (row) => (
                    <div className="cell-actions-inner">
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() => handleOpenEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-red"
                        onClick={() => handleDelete(row)}
                      >
                        Hapus
                      </button>
                    </div>
                  ),
                },
              ]}
              data={records}
              defaultPageSize={25}
              sortButtons={sortButtons}
              emptyText={`Belum ada data untuk ${currentEntity?.singular || 'entitas ini'}.`}
            />
          )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="modal-overlay open" style={{ display: 'flex' }}>
          <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <div className="modal-title">
                {isEditing ? `Edit ${currentEntity?.singular || 'Data'}` : `Tambah ${currentEntity?.singular || 'Data'}`}
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              {formErrors.length > 0 && (
                <div className="alert alert-danger">
                  {formErrors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {currentEntity && currentEntity.fields && Object.entries(currentEntity.fields).map(([key, field]) => {
                  if (field.type === 'readonly' && !isEditing) return null;

                  return (
                    <div className="form-group" key={key} style={{ marginBottom: 0 }}>
                      <label>
                        {field.label} {field.required && <span className="req">*</span>}
                      </label>

                      {field.type === 'enum' ? (
                        <select
                          className="form-control"
                          value={formData[key] || ''}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          required={field.required}
                        >
                          <option value="">-- Pilih {field.label} --</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'fk' ? (
                        <select
                          className="form-control"
                          value={formData[key] || ''}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          required={field.required}
                        >
                          <option value="">-- Pilih {field.label} --</option>
                          {(lookups[field.fk_table] || []).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.nama || item.label || item.kode || `#${item.id}`}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          className="form-control"
                          rows={3}
                          value={formData[key] || ''}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          required={field.required}
                        />
                      ) : (
                        <input
                          type={field.type === 'money' || field.type === 'number' ? 'number' : 'text'}
                          className="form-control"
                          value={formData[key] || ''}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          required={field.required}
                          readOnly={field.type === 'readonly'}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
