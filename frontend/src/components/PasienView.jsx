import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';
import { useI18n } from '../i18n';

export default function PasienView({
  onRegisterVisit,
  initialViewMode = 'list',
  initialEditId = null,
  initialOpenForm,
  onCloseInitialForm,
  onNavigateMode = null,
}) {
  const { t, isEn, trans, formatStatus, formatMaritalStatus, formatReligion } = useI18n();
  const [pasienList, setPasienList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // View state: 'list' | 'form'
  const [viewMode, setViewMode] = useState(initialViewMode === 'form' || initialOpenForm ? 'form' : 'list');

  // Modal detail state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPasien, setSelectedPasien] = useState(null);
  const [riwayatKunjungan, setRiwayatKunjungan] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  // Kelompok pasien lookup
  const [kelompokList, setKelompokList] = useState([]);

  // Form data state
  const initialFormData = {
    nama: '',
    nik: '',
    no_passport: '',
    tempat_lahir: '',
    tgl_lahir: '',
    jenis_kelamin: 'L',
    gol_darah: '-',
    agama: '',
    status_kawin: '',
    pendidikan: '',
    kewarganegaraan: 'WNI',
    pekerjaan: '',
    alamat: '',
    kelurahan: '',
    kecamatan: '',
    kota: '',
    provinsi: '',
    kode_pos: '',
    telepon: '',
    email: '',
    kelompok_id: '',
    no_asuransi: '',
    kontak_nama: '',
    kontak_hubungan: '',
    kontak_telepon: '',
    alergi: '',
    riwayat_penyakit: '',
  };

  const [formData, setFormData] = useState(initialFormData);

  // Wilayah Indonesia Autocomplete State
  const [wilayahList, setWilayahList] = useState([]);
  const [wilayahLoading, setWilayahLoading] = useState(false);
  const [wilayahDropdownOpen, setWilayahDropdownOpen] = useState(false);
  const [wilayahActiveIndex, setWilayahActiveIndex] = useState(-1);
  const wilayahRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wilayahRef.current && !wilayahRef.current.contains(e.target)) {
        setWilayahDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKelurahanChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, kelurahan: val }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length >= 1) {
      setWilayahLoading(true);
      setWilayahDropdownOpen(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const res = await api.get(`/wilayah/search?q=${encodeURIComponent(trimmed)}`);
          if (res && res.data) {
            setWilayahList(res.data);
          }
        } catch (err) {
          console.error('Error fetching wilayah:', err);
        } finally {
          setWilayahLoading(false);
        }
      }, 220);
    } else {
      setWilayahList([]);
      setWilayahDropdownOpen(false);
      setWilayahLoading(false);
    }
  };

  const handleSelectWilayah = (item) => {
    setFormData(prev => ({
      ...prev,
      kelurahan: item.kelurahan || '',
      kecamatan: item.kecamatan || '',
      kota: item.kota || '',
      provinsi: item.provinsi || '',
      kode_pos: item.kode_pos || '',
    }));
    setWilayahDropdownOpen(false);
    setWilayahActiveIndex(-1);
  };

  const handleWilayahKeyDown = (e) => {
    if (!wilayahDropdownOpen || wilayahList.length === 0) {
      if (e.key === 'ArrowDown' && formData.kelurahan) {
        setWilayahDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setWilayahActiveIndex(prev => (prev < wilayahList.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setWilayahActiveIndex(prev => (prev > 0 ? prev - 1 : wilayahList.length - 1));
    } else if (e.key === 'Enter') {
      if (wilayahActiveIndex >= 0 && wilayahList[wilayahActiveIndex]) {
        e.preventDefault();
        handleSelectWilayah(wilayahList[wilayahActiveIndex]);
      }
    } else if (e.key === 'Escape') {
      setWilayahDropdownOpen(false);
    }
  };

  // Fetch lookups & initial setup
  useEffect(() => {
    fetchKelompok();
  }, []);

  useEffect(() => {
    if (initialViewMode === 'form' || initialOpenForm) {
      if (initialEditId) {
        openEditModalById(initialEditId);
      } else {
        setIsEditing(false);
        setFormData(initialFormData);
        setFormErrors([]);
        setViewMode('form');
      }
      if (onCloseInitialForm) onCloseInitialForm();
    } else {
      setViewMode('list');
    }
  }, [initialViewMode, initialOpenForm, initialEditId]);

  // Debounce search query 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPasien(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchKelompok = async () => {
    try {
      const res = await api.get('/kunjungan/lookups');
      if (res && res.kelompok_pasien) {
        setKelompokList(res.kelompok_pasien);
      }
    } catch (err) {
      console.error('Error fetching lookups:', err);
    }
  };

  const fetchPasien = async (query = searchQuery) => {
    setLoading(true);
    try {
      const q = encodeURIComponent(query.trim());
      const res = await api.get(`/pasien${q ? `?q=${q}` : ''}`);
      if (res && res.data) {
        setPasienList(res.data);
        setTotalCount(res.total || res.data.length);
      }
    } catch (err) {
      console.error('Error fetching pasien:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData(initialFormData);
    setFormErrors([]);
    setViewMode('form');
    if (onNavigateMode) onNavigateMode('form');
  };

  const openEditModalById = async (id) => {
    setIsEditing(true);
    setFormErrors([]);
    try {
      const res = await api.get(`/pasien/${id}`);
      const data = res.data;
      setFormData({
        id: data.id,
        no_mr: data.no_mr || '',
        nama: data.nama || '',
        nik: data.nik || '',
        no_passport: data.no_passport || '',
        tempat_lahir: data.tempat_lahir || '',
        tgl_lahir: data.tgl_lahir || '',
        jenis_kelamin: data.jenis_kelamin || 'L',
        gol_darah: data.gol_darah || '-',
        agama: data.agama || '',
        status_kawin: data.status_kawin || '',
        pendidikan: data.pendidikan || '',
        kewarganegaraan: data.kewarganegaraan || 'WNI',
        pekerjaan: data.pekerjaan || '',
        alamat: data.alamat || '',
        kelurahan: data.kelurahan || '',
        kecamatan: data.kecamatan || '',
        kota: data.kota || '',
        provinsi: data.provinsi || '',
        kode_pos: data.kode_pos || '',
        telepon: data.telepon || '',
        email: data.email || '',
        kelompok_id: data.kelompok_id || '',
        no_asuransi: data.no_asuransi || '',
        kontak_nama: data.kontak_nama || '',
        kontak_hubungan: data.kontak_hubungan || '',
        kontak_telepon: data.kontak_telepon || '',
        alergi: data.alergi || '',
        riwayat_penyakit: data.riwayat_penyakit || '',
      });
      setViewMode('form');
    } catch (err) {
      console.error('Error fetching patient details:', err);
    }
  };

  const openEditModal = (p) => {
    openEditModalById(p.id);
    if (onNavigateMode) onNavigateMode('form', p.id);
  };

  const openDetailModal = async (p) => {
    try {
      const res = await api.get(`/pasien/${p.id}`);
      if (res && res.data) {
        setSelectedPasien(res.data);
        setRiwayatKunjungan(res.riwayat_kunjungan || []);
        setDetailModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching patient detail modal:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setFormSubmitting(true);

    try {
      if (isEditing) {
        await api.put(`/pasien/${formData.id}`, formData);
        showToast(trans('Data pasien berhasil diperbarui.', 'Patient data updated successfully.'));
      } else {
        const res = await api.post('/pasien', formData);
        showToast(trans(`Pasien berhasil didaftarkan dengan No. MR: ${res.no_mr}`, `Patient registered successfully with MR No: ${res.no_mr}`));
      }
      setViewMode('list');
      if (onNavigateMode) onNavigateMode('list');
      fetchPasien();
    } catch (err) {
      if (err.errors) {
        const msgs = Object.values(err.errors).flat();
        setFormErrors(msgs);
      } else {
        setFormErrors([err.message || trans('Gagal menyimpan data pasien.', 'Failed to save patient data.')]);
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isEn ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const calculateAge = (dateStr) => {
    if (!dateStr) return '-';
    const birth = new Date(dateStr);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return `${age} ${isEn ? 'years' : 'tahun'}`;
  };

  return (
    <div className="pasien-view">
      {/* Toast notification */}
      {toastMessage && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <AppIcon name="check" style={{ marginRight: 8 }} /> {toastMessage}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 1: FORMULIR PASIEN (FULL-PAGE VIEW MATCHING pasien_form.php)
          ========================================================================= */}
      {viewMode === 'form' ? (
        <div className="pasien-form-full">
          <div className="page-toolbar">
            <div>
              <div className="pt-title">{isEditing ? (isEn ? 'Edit Patient' : 'Edit Pasien') : (isEn ? 'New Patient' : 'Pasien Baru')}</div>
              <div className="pt-sub">
                {isEditing ? (
                  <>{t('common.mr_no')}: <b>{formData.no_mr}</b></>
                ) : (
                  isEn ? 'MR No. is generated automatically upon saving' : 'No. MR dibuat otomatis saat disimpan'
                )}
              </div>
            </div>
            <div className="pt-actions">
              <button
                type="button"
                className="btn-back"
                onClick={() => {
                  setViewMode('list');
                  setFormErrors([]);
                  if (onNavigateMode) onNavigateMode('list');
                }}
              >
                &larr; {t('common.back')}
              </button>
            </div>
          </div>

          {formErrors.length > 0 && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {formErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSave}>
            {/* Seksi 1: Identitas Pasien (acc-blue, icon user) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="step-head">
                <div className="step-num acc-blue"><AppIcon name="user" /></div>
                <div><div className="st-title">{trans('Identitas Pasien', 'Patient Identity')}</div></div>
              </div>
              <div className="field-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="form-group fg-full">
                  <label>{trans('Nama Lengkap', 'Full Name')} <span className="req">*</span></label>
                  <input
                    type="text"
                    name="nama"
                    className="form-control"
                    required
                    autoFocus
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>NIK</label>
                  <input
                    type="text"
                    name="nik"
                    className="form-control"
                    maxLength="16"
                    inputMode="numeric"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{trans('No. Passport/Kitas', 'Passport / KITAS No.')}</label>
                  <input
                    type="text"
                    name="no_passport"
                    className="form-control"
                    value={formData.no_passport}
                    onChange={(e) => setFormData({ ...formData, no_passport: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{trans('Tempat Lahir', 'Place of Birth')}</label>
                  <input
                    type="text"
                    name="tempat_lahir"
                    className="form-control"
                    value={formData.tempat_lahir}
                    onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{trans('Tgl Lahir', 'Date of Birth')}</label>
                  <input
                    type="date"
                    name="tgl_lahir"
                    className="form-control"
                    value={formData.tgl_lahir}
                    onChange={(e) => setFormData({ ...formData, tgl_lahir: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{trans('Jenis Kelamin', 'Gender')} <span className="req">*</span></label>
                  <select
                    name="jenis_kelamin"
                    className="form-control"
                    required
                    value={formData.jenis_kelamin}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                  >
                    <option value="L">{trans('Laki-laki', 'Male')}</option>
                    <option value="P">{trans('Perempuan', 'Female')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{trans('Gol. Darah', 'Blood Type')}</label>
                  <select
                    name="gol_darah"
                    className="form-control"
                    value={formData.gol_darah}
                    onChange={(e) => setFormData({ ...formData, gol_darah: e.target.value })}
                  >
                    {['-', 'A', 'A+', 'A-', 'B', 'B+', 'B-', 'AB', 'AB+', 'AB-', 'O', 'O+', 'O-'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{trans('Agama', 'Religion')}</label>
                  <select
                    name="agama"
                    className="form-control"
                    value={formData.agama}
                    onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                  >
                    <option value="">{trans('— Pilih —', '— Select —')}</option>
                    {[
                      { id: 'Islam', en: 'Islam' },
                      { id: 'Kristen', en: 'Protestant' },
                      { id: 'Katolik', en: 'Catholic' },
                      { id: 'Hindu', en: 'Hindu' },
                      { id: 'Buddha', en: 'Buddhist' },
                      { id: 'Konghucu', en: 'Confucian' },
                      { id: 'Lainnya', en: 'Other' },
                    ].map((ag) => (
                      <option key={ag.id} value={ag.id}>{trans(ag.id, ag.en)}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{trans('Status Perkawinan', 'Marital Status')}</label>
                  <select
                    name="status_kawin"
                    className="form-control"
                    value={formData.status_kawin}
                    onChange={(e) => setFormData({ ...formData, status_kawin: e.target.value })}
                  >
                    <option value="">{trans('— Pilih —', '— Select —')}</option>
                    {[
                      { id: 'Belum Kawin', en: 'Single' },
                      { id: 'Kawin', en: 'Married' },
                      { id: 'Cerai Hidup', en: 'Divorced' },
                      { id: 'Cerai Mati', en: 'Widowed' },
                    ].map((st) => (
                      <option key={st.id} value={st.id}>{trans(st.id, st.en)}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{trans('Pendidikan', 'Education')}</label>
                  <select
                    name="pendidikan"
                    className="form-control"
                    value={formData.pendidikan}
                    onChange={(e) => setFormData({ ...formData, pendidikan: e.target.value })}
                  >
                    <option value="">{trans('— Pilih —', '— Select —')}</option>
                    {[
                      { id: 'Tidak Sekolah', en: 'No Formal Education' },
                      { id: 'SD', en: 'Elementary' },
                      { id: 'SMP', en: 'Junior High' },
                      { id: 'SMA/SMK', en: 'Senior High' },
                      { id: 'D1/D2/D3', en: 'Diploma' },
                      { id: 'S1', en: 'Bachelor' },
                      { id: 'S2', en: 'Master' },
                      { id: 'S3', en: 'Doctorate' },
                    ].map((pd) => (
                      <option key={pd.id} value={pd.id}>{trans(pd.id, pd.en)}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{trans('Kewarganegaraan', 'Citizenship')}</label>
                  <select
                    name="kewarganegaraan"
                    className="form-control"
                    value={formData.kewarganegaraan}
                    onChange={(e) => setFormData({ ...formData, kewarganegaraan: e.target.value })}
                  >
                    <option value="WNI">WNI</option>
                    <option value="WNA">WNA</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Seksi 2: Alamat & Kontak (acc-green, icon mapPin) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="step-head">
                <div className="step-num acc-green"><AppIcon name="mapPin" /></div>
                <div><div className="st-title">{trans('Alamat & Kontak', 'Address & Contact')}</div></div>
              </div>

              {/* Grid Baris Alamat Lengkap & 5 Kolom Sejajar: Kelurahan, Kecamatan, Kota, Provinsi, Kode Pos */}
              <div className="field-grid address-grid-5">
                <div className="form-group fg-full">
                  <label>{trans('Alamat Lengkap', 'Full Address')}</label>
                  <textarea
                    name="alamat"
                    className="form-control"
                    rows="2"
                    value={formData.alamat}
                    placeholder={trans('Nama jalan, RT/RW, nomor rumah...', 'Street name, unit, etc.')}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  />
                </div>

                {/* 1. Kelurahan / Desa dengan Autocomplete */}
                <div className="form-group" ref={wilayahRef} style={{ position: 'relative' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{trans('Kelurahan/Desa', 'Subdistrict / Village')}</span>
                    {wilayahLoading && (
                      <span style={{ fontSize: 11, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span className="spinner-mini"></span> {trans('Mencari...', 'Searching...')}
                      </span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      name="kelurahan"
                      id="input-kelurahan-autofill"
                      className="form-control"
                      value={formData.kelurahan}
                      autoComplete="off"
                      placeholder={trans('Ketik nama kelurahan...', 'Type village name...')}
                      onChange={handleKelurahanChange}
                      onFocus={() => {
                        if (formData.kelurahan && wilayahList.length > 0) {
                          setWilayahDropdownOpen(true);
                        }
                      }}
                      onKeyDown={handleWilayahKeyDown}
                    />
                    {formData.kelurahan && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, kelurahan: '' }));
                          setWilayahList([]);
                          setWilayahDropdownOpen(false);
                        }}
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          fontSize: 13,
                          lineHeight: 1,
                          borderRadius: 4,
                        }}
                        title={trans('Hapus', 'Clear')}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown Hasil Pencarian Wilayah */}
                  {wilayahDropdownOpen && (
                    <div className="wilayah-dropdown-wrap">
                      {wilayahLoading && wilayahList.length === 0 && (
                        <div style={{ padding: '14px 12px', fontSize: 13, color: 'var(--muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <span className="spinner-mini"></span> {trans('Mencari wilayah di database...', 'Searching areas in database...')}
                        </div>
                      )}
                      {!wilayahLoading && wilayahList.length === 0 && (
                        <div style={{ padding: '14px 12px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                          {trans('Wilayah tidak ditemukan.', 'No matching area found.')}
                        </div>
                      )}
                      {wilayahList.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`wilayah-item ${wilayahActiveIndex === idx ? 'active' : ''}`}
                          onClick={() => handleSelectWilayah(item)}
                          onMouseEnter={() => setWilayahActiveIndex(idx)}
                        >
                          <div className="wilayah-item-main">
                            <span>{item.kelurahan}</span>
                            {item.kode_pos && (
                              <span className="wilayah-item-badge">{item.kode_pos}</span>
                            )}
                          </div>
                          <div className="wilayah-item-sub">
                            Kec. {item.kecamatan}, {item.kota}, {item.provinsi}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Kecamatan */}
                <div className="form-group">
                  <label>{trans('Kecamatan', 'District')}</label>
                  <input
                    type="text"
                    name="kecamatan"
                    className="form-control"
                    value={formData.kecamatan}
                    placeholder={trans('Kecamatan', 'District')}
                    onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                  />
                </div>

                {/* 3. Kota / Kabupaten */}
                <div className="form-group">
                  <label>{trans('Kota/Kabupaten', 'City / Regency')}</label>
                  <input
                    type="text"
                    name="kota"
                    className="form-control"
                    value={formData.kota}
                    placeholder={trans('Kota / Kabupaten', 'City / Regency')}
                    onChange={(e) => setFormData({ ...formData, kota: e.target.value })}
                  />
                </div>

                {/* 4. Provinsi */}
                <div className="form-group">
                  <label>{trans('Provinsi', 'Province')}</label>
                  <input
                    type="text"
                    name="provinsi"
                    className="form-control"
                    value={formData.provinsi}
                    placeholder={trans('Provinsi', 'Province')}
                    onChange={(e) => setFormData({ ...formData, provinsi: e.target.value })}
                  />
                </div>

                {/* 5. Kode Pos */}
                <div className="form-group">
                  <label>{trans('Kode Pos', 'Postal Code')}</label>
                  <input
                    type="text"
                    name="kode_pos"
                    className="form-control"
                    value={formData.kode_pos}
                    placeholder={trans('Kode Pos', 'Postal Code')}
                    onChange={(e) => setFormData({ ...formData, kode_pos: e.target.value })}
                  />
                </div>
              </div>

              {/* Baris Kontak: Telepon & Email */}
              <div className="field-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 10 }}>
                <div className="form-group">
                  <label>{trans('Telepon', 'Phone')}</label>
                  <input
                    type="tel"
                    name="telepon"
                    className="form-control"
                    value={formData.telepon}
                    placeholder="No. Telepon"
                    onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{trans('Email', 'Email')}</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    placeholder="Email"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Seksi 3: Penjamin & Pekerjaan (acc-orange, icon shield) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="step-head">
                <div className="step-num acc-orange"><AppIcon name="shield" /></div>
                <div><div className="st-title">{trans('Penjamin & Pekerjaan', 'Guarantor & Occupation')}</div></div>
              </div>
              <div className="field-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="form-group">
                  <label>{trans('Jaminan', 'Guarantor')}</label>
                  <select
                    name="kelompok_id"
                    className="form-control"
                    value={formData.kelompok_id}
                    onChange={(e) => setFormData({ ...formData, kelompok_id: e.target.value })}
                  >
                    <option value="">{trans('— Pilih —', '— Select —')}</option>
                    {kelompokList.map((k) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{trans('No. Asuransi', 'Insurance No.')}</label>
                  <input
                    type="text"
                    name="no_asuransi"
                    className="form-control"
                    value={formData.no_asuransi}
                    onChange={(e) => setFormData({ ...formData, no_asuransi: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{trans('Pekerjaan', 'Occupation')}</label>
                  <input
                    type="text"
                    name="pekerjaan"
                    className="form-control"
                    value={formData.pekerjaan}
                    onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Seksi 4: Kontak Darurat (acc-purple, icon users) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="step-head">
                <div className="step-num acc-purple"><AppIcon name="users" /></div>
                <div><div className="st-title">{trans('Kontak Darurat', 'Emergency Contact')}</div></div>
              </div>
              <div className="field-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="form-group">
                  <label>{trans('Nama Kontak Darurat', 'Emergency Contact Name')}</label>
                  <input
                    type="text"
                    name="kontak_nama"
                    className="form-control"
                    value={formData.kontak_nama}
                    onChange={(e) => setFormData({ ...formData, kontak_nama: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{trans('Hubungan', 'Relationship')}</label>
                  <input
                    type="text"
                    name="kontak_hubungan"
                    className="form-control"
                    placeholder={trans('cth: Suami/Istri/Anak', 'e.g. Spouse/Parent/Child')}
                    value={formData.kontak_hubungan}
                    onChange={(e) => setFormData({ ...formData, kontak_hubungan: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{trans('Telepon Kontak', 'Emergency Phone')}</label>
                  <input
                    type="tel"
                    name="kontak_telepon"
                    className="form-control"
                    value={formData.kontak_telepon}
                    onChange={(e) => setFormData({ ...formData, kontak_telepon: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Seksi 5: Informasi Medis (acc-red, icon pills) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="step-head">
                <div className="step-num acc-red"><AppIcon name="pills" /></div>
                <div><div className="st-title">{trans('Informasi Medis', 'Medical Information')}</div></div>
              </div>
              <div className="field-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="form-group fg-full">
                  <label>{trans('Riwayat Alergi', 'Allergy History')}</label>
                  <input
                    type="text"
                    name="alergi"
                    className="form-control"
                    placeholder={trans('cth: Penisilin, Seafood', 'e.g. Penicillin, Seafood')}
                    value={formData.alergi}
                    onChange={(e) => setFormData({ ...formData, alergi: e.target.value })}
                  />
                </div>

                <div className="form-group fg-full">
                  <label>{trans('Riwayat Penyakit', 'Disease History')}</label>
                  <textarea
                    name="riwayat_penyakit"
                    className="form-control"
                    rows="2"
                    placeholder={trans('cth: Hipertensi, Diabetes', 'e.g. Hypertension, Diabetes')}
                    value={formData.riwayat_penyakit}
                    onChange={(e) => setFormData({ ...formData, riwayat_penyakit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Sticky Form Actions Bar */}
            <div
              className="form-actions"
              style={{
                position: 'sticky',
                bottom: 0,
                background: 'var(--bg)',
                padding: '14px 0',
                borderTop: '1px solid var(--border)',
                zIndex: 10,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-light"
                onClick={() => {
                  setViewMode('list');
                  setFormErrors([]);
                  if (onNavigateMode) onNavigateMode('list');
                }}
                disabled={formSubmitting}
              >
                {trans('Batal', 'Cancel')}
              </button>
              <button type="submit" className="btn" disabled={formSubmitting}>
                <AppIcon name="save" /> {formSubmitting ? trans('Menyimpan...', 'Saving...') : trans('Simpan Pasien', 'Save Patient')}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* =========================================================================
            VIEW MODE 2: TABEL DATA PASIEN (LIST VIEW)
            ========================================================================= */
        <>
          <div className="page-toolbar">
            <div>
              <div className="pt-title">{t('menu.patient_data')}</div>
              <div className="pt-sub">
                {totalCount} {isEn ? 'registered patients' : 'pasien terdaftar'}
              </div>
            </div>
            <div className="pt-actions">
              <button className="btn" onClick={openCreateModal}>
                <AppIcon name="plus" /> {t('dashboard.new_patient')}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                {isEn ? 'Loading patient data...' : 'Memuat data pasien...'}
              </div>
            ) : (
              <DataTableWrapper
                columns={[
                  {
                    key: 'no_mr',
                    label: t('common.mr_no'),
                    render: (p) => <b>{p.no_mr}</b>,
                  },
                  {
                    key: 'nama',
                    label: t('common.name'),
                    render: (p) => (
                      <>
                        {p.nama}
                        {p.nik && (
                          <>
                            <br />
                            <small style={{ color: 'var(--muted)' }}>NIK: {p.nik}</small>
                          </>
                        )}
                      </>
                    ),
                  },
                  {
                    key: 'jenis_kelamin',
                    label: t('common.gender'),
                    render: (p) => (p.jenis_kelamin === 'L' ? (isEn ? 'M' : 'L') : (isEn ? 'F' : 'P')),
                  },
                  {
                    key: 'tgl_lahir',
                    label: t('common.birth_date'),
                    render: (p) => formatDate(p.tgl_lahir),
                  },
                  {
                    key: 'kelompok_nama',
                    label: t('common.group'),
                    render: (p) => p.kelompok_nama || p.kelompok || '-',
                  },
                  {
                    key: 'actions',
                    label: t('common.action'),
                    sortable: false,
                    thClassName: 'no-sort col-actions col-actions-wide',
                    className: 'cell-actions cell-actions-wide',
                    render: (p) => (
                      <div className="cell-actions-inner">
                        <button
                          type="button"
                          className="btn btn-sm btn-light btn-icon"
                          title={isEn ? 'View Detail' : 'Lihat Detail'}
                          onClick={() => openDetailModal(p)}
                        >
                          <AppIcon name="eye" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light btn-icon"
                          title={isEn ? 'Edit' : 'Edit'}
                          onClick={() => openEditModal(p)}
                        >
                          <AppIcon name="pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          title={isEn ? 'Register Visit' : 'Daftar Kunjungan'}
                          onClick={() => {
                            if (onRegisterVisit) onRegisterVisit(p);
                          }}
                        >
                          {isEn ? 'Register Visit' : 'Daftar Kunjungan'}
                        </button>
                      </div>
                    ),
                  },
                ]}
                data={pasienList}
                defaultPageSize={25}
                emptyText={isEn ? 'No registered patient data.' : 'Tidak ada data pasien yang terdaftar.'}
              />
            )}
          </div>
        </>
      )}

      {/* =========================================================================
          DETAIL MODAL
          ========================================================================= */}
      {detailModalOpen && selectedPasien && (
        <div className="modal-overlay open" role="dialog" aria-modal="true">
          <div className="modal-box modal-lg" style={{ maxWidth: 880 }}>
            <div className="modal-head">
              <div className="modal-title">
                {trans('Rekam Data Pasien:', 'Patient Record:')} <b>{selectedPasien.nama}</b>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDetailModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div className="card detail-id" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 'var(--fs-title)', fontWeight: 700 }}>{selectedPasien.nama}</div>
                    <div style={{ color: 'var(--muted)', marginTop: 4 }}>
                      {trans('No. MR', 'MR No.')} <b>{selectedPasien.no_mr}</b> &middot; {selectedPasien.jenis_kelamin === 'L' ? trans('Laki-laki', 'Male') : trans('Perempuan', 'Female')} &middot; {calculateAge(selectedPasien.tgl_lahir)} &middot; {selectedPasien.kelompok_nama || trans('Umum', 'General')}
                    </div>
                    <div style={{ color: 'var(--muted)' }}>
                      {selectedPasien.tgl_lahir ? formatDate(selectedPasien.tgl_lahir) : '-'}
                      {selectedPasien.gol_darah && selectedPasien.gol_darah !== '-' && (
                        <span> &middot; {trans('Gol. Darah', 'Blood Type')} {selectedPasien.gol_darah}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {selectedPasien.alergi ? (
                      <span className="badge badge-red"><AppIcon name="alert" /> {trans('Alergi:', 'Allergy:')} {selectedPasien.alergi}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Seksi 1: Identitas Pasien */}
              <div className="detail-section">
                <div className="step-head">
                  <div className="step-num acc-blue"><AppIcon name="user" /></div>
                  <div><div className="st-title">{trans('Identitas Pasien', 'Patient Identity')}</div></div>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="di-label">NIK</div>
                    <div className={`di-value ${!selectedPasien.nik ? 'empty' : ''}`}>{selectedPasien.nik || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('No. Passport / KITAS', 'Passport / KITAS No.')}</div>
                    <div className={`di-value ${!selectedPasien.no_passport ? 'empty' : ''}`}>{selectedPasien.no_passport || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Tempat Lahir', 'Place of Birth')}</div>
                    <div className={`di-value ${!selectedPasien.tempat_lahir ? 'empty' : ''}`}>{selectedPasien.tempat_lahir || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Tanggal Lahir', 'Date of Birth')}</div>
                    <div className={`di-value ${!selectedPasien.tgl_lahir ? 'empty' : ''}`}>{selectedPasien.tgl_lahir ? formatDate(selectedPasien.tgl_lahir) : '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Jenis Kelamin', 'Gender')}</div>
                    <div className="di-value">{selectedPasien.jenis_kelamin === 'L' ? trans('Laki-laki', 'Male') : trans('Perempuan', 'Female')}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Golongan Darah', 'Blood Type')}</div>
                    <div className={`di-value ${!selectedPasien.gol_darah || selectedPasien.gol_darah === '-' ? 'empty' : ''}`}>{selectedPasien.gol_darah && selectedPasien.gol_darah !== '-' ? selectedPasien.gol_darah : '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Agama', 'Religion')}</div>
                    <div className={`di-value ${!selectedPasien.agama ? 'empty' : ''}`}>{formatReligion(selectedPasien.agama)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Status Perkawinan', 'Marital Status')}</div>
                    <div className={`di-value ${!selectedPasien.status_kawin ? 'empty' : ''}`}>{formatMaritalStatus(selectedPasien.status_kawin)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Pendidikan', 'Education')}</div>
                    <div className={`di-value ${!selectedPasien.pendidikan ? 'empty' : ''}`}>{selectedPasien.pendidikan || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Kewarganegaraan', 'Citizenship')}</div>
                    <div className="di-value">{selectedPasien.kewarganegaraan === 'WNI' || !selectedPasien.kewarganegaraan ? trans('WNI', 'Indonesian') : selectedPasien.kewarganegaraan}</div>
                  </div>
                </div>
              </div>

              {/* Seksi 2: Alamat & Kontak */}
              <div className="detail-section">
                <div className="step-head">
                  <div className="step-num acc-green"><AppIcon name="mapPin" /></div>
                  <div><div className="st-title">{trans('Alamat & Kontak', 'Address & Contact')}</div></div>
                </div>
                <div className="detail-grid">
                  <div className="detail-item dg-full">
                    <div className="di-label">{trans('Alamat Lengkap', 'Full Address')}</div>
                    <div className={`di-value ${!selectedPasien.alamat ? 'empty' : ''}`}>{selectedPasien.alamat || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Kelurahan / Desa', 'Subdistrict / Village')}</div>
                    <div className={`di-value ${!selectedPasien.kelurahan ? 'empty' : ''}`}>{selectedPasien.kelurahan || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Kecamatan', 'District')}</div>
                    <div className={`di-value ${!selectedPasien.kecamatan ? 'empty' : ''}`}>{selectedPasien.kecamatan || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Kota / Kabupaten', 'City / Regency')}</div>
                    <div className={`di-value ${!selectedPasien.kota ? 'empty' : ''}`}>{selectedPasien.kota || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Provinsi', 'Province')}</div>
                    <div className={`di-value ${!selectedPasien.provinsi ? 'empty' : ''}`}>{selectedPasien.provinsi || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Kode Pos', 'Postal Code')}</div>
                    <div className={`di-value ${!selectedPasien.kode_pos ? 'empty' : ''}`}>{selectedPasien.kode_pos || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('No. Telepon / HP', 'Phone Number')}</div>
                    <div className={`di-value ${!selectedPasien.telepon ? 'empty' : ''}`}>{selectedPasien.telepon || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Email</div>
                    <div className={`di-value ${!selectedPasien.email ? 'empty' : ''}`}>{selectedPasien.email || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Seksi 3: Penjamin & Pekerjaan */}
              <div className="detail-section">
                <div className="step-head">
                  <div className="step-num acc-orange"><AppIcon name="shield" /></div>
                  <div><div className="st-title">{trans('Penjamin & Pekerjaan', 'Guarantor & Occupation')}</div></div>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="di-label">{trans('Kelompok Penjamin', 'Guarantor Group')}</div>
                    <div className="di-value">{selectedPasien.kelompok_nama || trans('Umum', 'General')}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('No. Kartu / Asuransi', 'Card / Insurance No.')}</div>
                    <div className={`di-value ${!selectedPasien.no_asuransi ? 'empty' : ''}`}>{selectedPasien.no_asuransi || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Pekerjaan', 'Occupation')}</div>
                    <div className={`di-value ${!selectedPasien.pekerjaan ? 'empty' : ''}`}>{selectedPasien.pekerjaan || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Seksi 4: Kontak Darurat */}
              <div className="detail-section">
                <div className="step-head">
                  <div className="step-num acc-purple"><AppIcon name="users" /></div>
                  <div><div className="st-title">{trans('Kontak Darurat', 'Emergency Contact')}</div></div>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="di-label">{trans('Nama Kontak Darurat', 'Emergency Contact Name')}</div>
                    <div className={`di-value ${!selectedPasien.kontak_nama ? 'empty' : ''}`}>{selectedPasien.kontak_nama || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('Hubungan', 'Relationship')}</div>
                    <div className={`di-value ${!selectedPasien.kontak_hubungan ? 'empty' : ''}`}>{selectedPasien.kontak_hubungan || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">{trans('No. Telepon Darurat', 'Emergency Phone')}</div>
                    <div className={`di-value ${!selectedPasien.kontak_telepon ? 'empty' : ''}`}>{selectedPasien.kontak_telepon || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Seksi 5: Informasi Medis */}
              <div className="detail-section">
                <div className="step-head">
                  <div className="step-num acc-red"><AppIcon name="pills" /></div>
                  <div><div className="st-title">{trans('Informasi Medis', 'Medical Information')}</div></div>
                </div>
                <div className="detail-grid">
                  <div className="detail-item dg-full">
                    <div className="di-label">{trans('Riwayat Alergi', 'Allergy History')}</div>
                    <div className={`di-value ${!selectedPasien.alergi ? 'empty' : ''}`}>{selectedPasien.alergi || '—'}</div>
                  </div>
                  <div className="detail-item dg-full">
                    <div className="di-label">{trans('Riwayat Penyakit', 'Disease History')}</div>
                    <div className={`di-value ${!selectedPasien.riwayat_penyakit ? 'empty' : ''}`}>{selectedPasien.riwayat_penyakit || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Riwayat Kunjungan */}
              <div style={{ marginTop: 20 }}>
                <div className="section-title">{trans('Riwayat Kunjungan', 'Visit History')} ({riwayatKunjungan.length})</div>
                <div className="table-wrap">
                  <table className="datatable dt-noscroll" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>{trans('No. Kunjungan', 'Visit No.')}</th>
                        <th>{trans('Tanggal', 'Date')}</th>
                        <th>{trans('Poli', 'Clinic')}</th>
                        <th>{trans('Dokter', 'Doctor')}</th>
                        <th>{trans('Keluhan', 'Complaint')}</th>
                        <th>{trans('Status', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riwayatKunjungan.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)', padding: '16px' }}>
                            {trans('Belum ada riwayat kunjungan.', 'No visit history recorded.')}
                          </td>
                        </tr>
                      ) : (
                        riwayatKunjungan.map((k) => (
                          <tr key={k.id}>
                            <td><b>{k.no_kunjungan || `#${k.id}`}</b></td>
                            <td>{formatDate(k.tgl_kunjungan)}</td>
                            <td>{k.poli_nama || '-'}</td>
                            <td>{k.dokter_nama || '-'}</td>
                            <td>{k.keluhan_utama || '-'}</td>
                            <td>
                              <span className={`badge badge-${k.status === 'selesai' ? 'green' : k.status === 'batal' ? 'red' : 'blue'}`}>
                                {formatStatus(k.status)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-light" onClick={() => setDetailModalOpen(false)}>
                  {trans('Tutup', 'Close')}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setDetailModalOpen(false);
                    openEditModal(selectedPasien);
                  }}
                >
                  <AppIcon name="pencil" /> {trans('Edit Pasien', 'Edit Patient')}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setDetailModalOpen(false);
                    if (onRegisterVisit) onRegisterVisit(selectedPasien);
                  }}
                >
                  <AppIcon name="plus" /> {trans('Daftar Kunjungan', 'Register Visit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
