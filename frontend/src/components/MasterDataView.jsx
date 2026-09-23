import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';
import { useI18n } from '../i18n';

export default function MasterDataView({ initialGroup, initialSlug = null, onNavigateSlug = null }) {
  const { t, trans, formatTgl } = useI18n();
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

  const getEntityLabel = (slug, defaultLabel = '') => {
    const map = {
      poli: trans('Poli & Layanan', 'Clinics & Units'),
      dokter: trans('Dokter & Tenaga Medis', 'Doctors & Medical Staff'),
      spesialisasi: trans('Spesialisasi', 'Specializations'),
      jadwal_dokter: trans('Jadwal Dokter', 'Doctor Schedules'),
      tindakan: trans('Tindakan & Prosedur', 'Procedures & Treatments'),
      konsultasi: trans('Tarif Konsultasi', 'Consultation Tariffs'),
      lab_kategori: trans('Kategori Laboratorium', 'Lab Categories'),
      lab_pemeriksaan: trans('Pemeriksaan Laboratorium', 'Lab Tests'),
      rad_kategori: trans('Kategori Radiologi', 'Radiology Categories'),
      rad_pemeriksaan: trans('Pemeriksaan Radiologi', 'Radiology Examinations'),
      diag_kategori: trans('Kategori Diagnostik', 'Diagnostic Categories'),
      diag_pemeriksaan: trans('Pemeriksaan Diagnostik', 'Diagnostic Examinations'),
      fisio_kategori: trans('Kategori Fisioterapi', 'Physiotherapy Categories'),
      fisio_pemeriksaan: trans('Pemeriksaan Fisioterapi', 'Physiotherapy Services'),
      obat: trans('Obat & Alkes', 'Medicines & Supplies'),
      obat_kategori: trans('Kategori Obat', 'Medicine Categories'),
      obat_satuan: trans('Satuan Obat', 'Medicine Units'),
      supplier: trans('Pemasok / Supplier', 'Suppliers'),
      asuransi: trans('Asuransi & Penjamin', 'Insurance & Guarantors'),
      corporate: trans('Perusahaan Mitra', 'Corporate Partners'),
      bank: trans('Bank & Rekening', 'Banks & Accounts'),
      kode_pembatalan: trans('Kode Pembatalan Billing', 'Billing Cancellation Codes'),
      kode_pembatalan_reg: trans('Kode Pembatalan Registrasi', 'Registration Cancellation Codes'),
      kelompok_pasien: trans('Kelompok Pasien', 'Patient Groups'),
    };
    return map[slug] || defaultLabel;
  };

  const getGroupLabel = (grp) => {
    const map = {
      'SDM & Poli': trans('SDM & Poli', 'Staff & Clinics'),
      'Layanan & Tarif': trans('Layanan & Tarif', 'Services & Tariffs'),
      'Farmasi': trans('Farmasi', 'Pharmacy'),
      'Medicine': trans('Farmasi', 'Pharmacy'),
      'Penjamin & Bank': trans('Penjamin & Bank', 'Guarantors & Banks'),
      'Billing': trans('Kode Pembatalan', 'Cancellation Codes'),
      'Kode Pembatalan': trans('Kode Pembatalan', 'Cancellation Codes'),
      'Pasien': trans('Pasien', 'Patients'),
    };
    return map[grp] || grp;
  };

  const getFieldLabel = (key, defaultLabel = '') => {
    const map = {
      kode: trans('KODE', 'CODE'),
      nama: trans('NAMA', 'NAME'),
      keterangan: trans('KETERANGAN', 'DESCRIPTION'),
      status: trans('STATUS', 'STATUS'),
      alamat: trans('ALAMAT', 'ADDRESS'),
      telepon: trans('TELEPON', 'PHONE'),
      hp: trans('NO. HP', 'MOBILE PHONE'),
      email: trans('EMAIL', 'EMAIL'),
      tarif: trans('TARIF', 'TARIFF'),
      harga_beli: trans('HARGA BELI', 'PURCHASE PRICE'),
      harga_jual: trans('HARGA JUAL', 'SELLING PRICE'),
      stok: trans('STOK', 'STOCK'),
      stok_minimal: trans('STOK MIN', 'MIN STOCK'),
      stok_min: trans('STOK MIN', 'MIN STOCK'),
      satuan: trans('SATUAN', 'UNIT'),
      satuan_id: trans('SATUAN', 'UNIT'),
      kategori: trans('KATEGORI', 'CATEGORY'),
      kategori_id: trans('KATEGORI', 'CATEGORY'),
      spesialisasi: trans('SPESIALISASI', 'SPECIALIZATION'),
      poli: trans('POLI', 'CLINIC/UNIT'),
      poli_id: trans('POLI', 'CLINIC/UNIT'),
      dokter: trans('DOKTER', 'DOCTOR'),
      dokter_id: trans('DOKTER', 'DOCTOR'),
      no_mr: trans('NO. REKAM MEDIS', 'MR NO.'),
      no_rekening: trans('NO. REKENING', 'ACCOUNT NO.'),
      nama_bank: trans('NAMA BANK', 'BANK NAME'),
      atas_nama: trans('ATAS NAMA', 'ACCOUNT HOLDER'),
      diskon: trans('DISKON', 'DISCOUNT'),
      tipe: trans('TIPE', 'TYPE'),
      hari: trans('HARI', 'DAY'),
      jam_mulai: trans('JAM MULAI', 'START TIME'),
      jam_selesai: trans('JAM SELESAI', 'END TIME'),
      kuota: trans('KUOTA', 'QUOTA'),
      persentase: trans('PERSENTASE', 'PERCENTAGE'),
    };
    return map[key] || (defaultLabel ? defaultLabel.toUpperCase() : key.toUpperCase());
  };

  if (loadingEntities && Object.keys(entities).length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
        {trans('Memuat Master Data SIM Klinik...', 'Loading SIM Clinic Master Data...')}
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
          <div className="pt-title">{getEntityLabel(currentEntity?.slug, currentEntity?.label) || trans('Master Data', 'Master Data')}</div>
          <div className="pt-sub">{trans('Master Data', 'Master Data')} &middot; {getGroupLabel(activeGroup)}</div>
        </div>
        <div className="pt-actions">
          <button type="button" className="btn" onClick={handleOpenCreate}>
            <AppIcon name="plus" /> {trans('Tambah', 'Add')} {getEntityLabel(currentEntity?.slug, currentEntity?.singular || currentEntity?.label) || trans('Data', 'Data')}
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
                  <span>{getEntityLabel(ent.slug, ent.label)}</span>
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
              {trans('Memuat data...', 'Loading data...')}
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
                  label: getFieldLabel(key, f.label),
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
                          {displayVal === 'aktif' ? trans('Aktif', 'Active') : trans('Nonaktif', 'Inactive')}
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
                  label: trans('AKSI', 'ACTION'),
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
                        {trans('Edit', 'Edit')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-red"
                        onClick={() => handleDelete(row)}
                      >
                        {trans('Hapus', 'Delete')}
                      </button>
                    </div>
                  ),
                },
              ]}
              data={records}
              defaultPageSize={25}
              sortButtons={sortButtons}
              emptyText={trans('Belum ada data', 'No data available')}
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
                {isEditing ? `${trans('Edit', 'Edit')} ${currentEntity?.singular || trans('Data', 'Data')}` : `${trans('Tambah', 'Add')} ${currentEntity?.singular || trans('Data', 'Data')}`}
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setModalOpen(false)}
                aria-label={trans('Tutup', 'Close')}
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
                          <option value="">-- {trans('Pilih', 'Select')} {field.label} --</option>
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
                          <option value="">-- {trans('Pilih', 'Select')} {field.label} --</option>
                          {(() => {
                            const raw = lookups[field.fk_table] || lookups[key] || [];
                            if (Array.isArray(raw)) {
                              return raw.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.nama || item.label || item.kode || `#${item.id}`}
                                </option>
                              ));
                            }
                            if (raw && typeof raw === 'object') {
                              return Object.entries(raw).map(([id, val]) => (
                                <option key={id} value={id}>
                                  {typeof val === 'object' ? (val.nama || val.label || id) : val}
                                </option>
                              ));
                            }
                            return null;
                          })()}
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
                  {trans('Batal', 'Cancel')}
                </button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? trans('Menyimpan...', 'Saving...') : trans('Simpan Data', 'Save Data')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
