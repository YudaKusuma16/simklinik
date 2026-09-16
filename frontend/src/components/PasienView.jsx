import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';

export default function PasienView({ onRegisterVisit, initialOpenForm, onCloseInitialForm }) {
  const [pasienList, setPasienList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // View state: 'list' | 'form'
  const [viewMode, setViewMode] = useState('list');

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
    agama: 'Islam',
    status_kawin: 'Belum Kawin',
    pendidikan: 'SMA/SMK',
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

  // Fetch lookups & patient list on load
  useEffect(() => {
    fetchKelompok();
    fetchPasien();
    if (initialOpenForm) {
      openCreateModal();
      if (onCloseInitialForm) onCloseInitialForm();
    }
  }, [initialOpenForm]);

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
    const val = e.target.value;
    setSearchQuery(val);
    fetchPasien(val);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData(initialFormData);
    setFormErrors([]);
    setViewMode('form');
  };

  const openEditModal = async (p) => {
    setIsEditing(true);
    setFormErrors([]);
    try {
      const res = await api.get(`/pasien/${p.id}`);
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
        agama: data.agama || 'Islam',
        status_kawin: data.status_kawin || 'Belum Kawin',
        pendidikan: data.pendidikan || 'SMA/SMK',
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

  const openDetailModal = async (p) => {
    try {
      const res = await api.get(`/pasien/${p.id}`);
      setSelectedPasien(res.data);
      setRiwayatKunjungan(res.riwayat_kunjungan || []);
      setDetailModalOpen(true);
    } catch (err) {
      console.error('Error fetching detail:', err);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setFormSubmitting(true);

    try {
      if (isEditing) {
        await api.put(`/pasien/${formData.id}`, formData);
        showToast('Data pasien berhasil diperbarui.');
      } else {
        const res = await api.post('/pasien', formData);
        showToast(`Pasien berhasil didaftarkan dengan No. MR: ${res.no_mr}`);
      }
      setViewMode('list');
      fetchPasien();
    } catch (err) {
      if (err.errors) {
        const msgs = Object.values(err.errors).flat();
        setFormErrors(msgs);
      } else {
        setFormErrors([err.message || 'Gagal menyimpan data pasien.']);
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
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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
    return `${age} tahun`;
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
              <div className="pt-title">{isEditing ? 'Edit Pasien' : 'Pasien Baru'}</div>
              <div className="pt-sub">
                {isEditing ? (
                  <>No. MR: <b>{formData.no_mr}</b></>
                ) : (
                  'No. MR akan di-generate otomatis oleh sistem'
                )}
              </div>
            </div>
            <div className="pt-actions">
              <button
                type="button"
                className="btn-back"
                onClick={() => { setViewMode('list'); setFormErrors([]); }}
              >
                <AppIcon name="chevron" /> Kembali
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

          <form onSubmit={handleFormSubmit}>
            {/* Seksi 1: Identitas Pasien (acc-blue, icon user) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="step-head">
                <div className="step-num acc-blue"><AppIcon name="user" /></div>
                <div><div className="st-title">Identitas Pasien</div></div>
              </div>
              <div className="field-grid">
                <div className="form-group fg-full">
                  <label>Nama Lengkap Pasien <span className="req">*</span></label>
                  <input
                    type="text"
                    name="nama"
                    className="form-control"
                    required
                    autoFocus
                    placeholder="Contoh: Budi Santoso"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Nomor Induk Kependudukan (NIK)</label>
                  <input
                    type="text"
                    name="nik"
                    className="form-control"
                    maxLength="16"
                    inputMode="numeric"
                    placeholder="16 digit NIK KTP"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>No. Paspor / KITAS (WNA)</label>
                  <input
                    type="text"
                    name="no_passport"
                    className="form-control"
                    placeholder="Opsional jika ada"
                    value={formData.no_passport}
                    onChange={(e) => setFormData({ ...formData, no_passport: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Tempat Lahir</label>
                  <input
                    type="text"
                    name="tempat_lahir"
                    className="form-control"
                    placeholder="Kota kelahiran"
                    value={formData.tempat_lahir}
                    onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Tanggal Lahir</label>
                  <input
                    type="date"
                    name="tgl_lahir"
                    className="form-control"
                    value={formData.tgl_lahir}
                    onChange={(e) => setFormData({ ...formData, tgl_lahir: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Jenis Kelamin <span className="req">*</span></label>
                  <select
                    name="jenis_kelamin"
                    className="form-control"
                    required
                    value={formData.jenis_kelamin}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Golongan Darah</label>
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
                  <label>Agama</label>
                  <select
                    name="agama"
                    className="form-control"
                    value={formData.agama}
                    onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                  >
                    {['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya'].map((ag) => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status Perkawinan</label>
                  <select
                    name="status_kawin"
                    className="form-control"
                    value={formData.status_kawin}
                    onChange={(e) => setFormData({ ...formData, status_kawin: e.target.value })}
                  >
                    {['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'].map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Pendidikan Terakhir</label>
                  <select
                    name="pendidikan"
                    className="form-control"
                    value={formData.pendidikan}
                    onChange={(e) => setFormData({ ...formData, pendidikan: e.target.value })}
                  >
                    {['Tidak Sekolah', 'SD', 'SMP', 'SMA/SMK', 'D1/D2/D3', 'S1', 'S2', 'S3'].map((pd) => (
                      <option key={pd} value={pd}>{pd}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Kewarganegaraan</label>
                  <select
                    name="kewarganegaraan"
                    className="form-control"
                    value={formData.kewarganegaraan}
                    onChange={(e) => setFormData({ ...formData, kewarganegaraan: e.target.value })}
                  >
                    <option value="WNI">WNI (Warga Negara Indonesia)</option>
                    <option value="WNA">WNA (Warga Negara Asing)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Seksi 2: Alamat & Kontak (acc-green, icon mapPin) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="step-head">
                <div className="step-num acc-green"><AppIcon name="mapPin" /></div>
                <div><div className="st-title">Alamat & Kontak</div></div>
              </div>
              <div className="field-grid">
                <div className="form-group fg-full">
                  <label>Alamat Lengkap</label>
                  <textarea
                    name="alamat"
                    className="form-control"
                    rows="2"
                    placeholder="Nama jalan, nomor rumah, RT/RW"
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Kelurahan / Desa</label>
                  <input
                    type="text"
                    name="kelurahan"
                    className="form-control"
                    placeholder="Kelurahan / Desa"
                    value={formData.kelurahan}
                    onChange={(e) => setFormData({ ...formData, kelurahan: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Kecamatan</label>
                  <input
                    type="text"
                    name="kecamatan"
                    className="form-control"
                    placeholder="Kecamatan"
                    value={formData.kecamatan}
                    onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Kabupaten / Kota</label>
                  <input
                    type="text"
                    name="kota"
                    className="form-control"
                    placeholder="Kabupaten / Kota"
                    value={formData.kota}
                    onChange={(e) => setFormData({ ...formData, kota: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Provinsi</label>
                  <input
                    type="text"
                    name="provinsi"
                    className="form-control"
                    placeholder="Provinsi"
                    value={formData.provinsi}
                    onChange={(e) => setFormData({ ...formData, provinsi: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Kode Pos</label>
                  <input
                    type="text"
                    name="kode_pos"
                    className="form-control"
                    placeholder="Kode Pos"
                    value={formData.kode_pos}
                    onChange={(e) => setFormData({ ...formData, kode_pos: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>No. Telepon / HP</label>
                  <input
                    type="tel"
                    name="telepon"
                    className="form-control"
                    placeholder="Contoh: 08123456789"
                    value={formData.telepon}
                    onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="email@domain.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Seksi 3: Penjamin & Pekerjaan (acc-orange, icon shield) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="step-head">
                <div className="step-num acc-orange"><AppIcon name="shield" /></div>
                <div><div className="st-title">Penjamin & Pekerjaan</div></div>
              </div>
              <div className="field-grid">
                <div className="form-group">
                  <label>Penjamin / Kelompok Pasien</label>
                  <select
                    name="kelompok_id"
                    className="form-control"
                    value={formData.kelompok_id}
                    onChange={(e) => setFormData({ ...formData, kelompok_id: e.target.value })}
                  >
                    <option value="">Umum (Biaya Sendiri)</option>
                    {kelompokList.map((k) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>No. Kartu Asuransi / BPJS</label>
                  <input
                    type="text"
                    name="no_asuransi"
                    className="form-control"
                    placeholder="Nomor kartu penjamin"
                    value={formData.no_asuransi}
                    onChange={(e) => setFormData({ ...formData, no_asuransi: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Pekerjaan</label>
                  <input
                    type="text"
                    name="pekerjaan"
                    className="form-control"
                    placeholder="Pekerjaan saat ini"
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
                <div><div className="st-title">Kontak Darurat</div></div>
              </div>
              <div className="field-grid">
                <div className="form-group">
                  <label>Nama Kontak Darurat</label>
                  <input
                    type="text"
                    name="kontak_nama"
                    className="form-control"
                    placeholder="Nama kerabat / keluarga"
                    value={formData.kontak_nama}
                    onChange={(e) => setFormData({ ...formData, kontak_nama: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Hubungan</label>
                  <input
                    type="text"
                    name="kontak_hubungan"
                    className="form-control"
                    placeholder="misal: Suami/Istri/Orang Tua/Anak"
                    value={formData.kontak_hubungan}
                    onChange={(e) => setFormData({ ...formData, kontak_hubungan: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>No. Telepon Kontak Darurat</label>
                  <input
                    type="tel"
                    name="kontak_telepon"
                    className="form-control"
                    placeholder="Nomor kontak darurat"
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
                <div><div className="st-title">Informasi Medis</div></div>
              </div>
              <div className="field-grid">
                <div className="form-group fg-full">
                  <label>Riwayat Alergi</label>
                  <input
                    type="text"
                    name="alergi"
                    className="form-control"
                    placeholder="misal: Alergi Penisilin, Parasetamol, Seafood..."
                    value={formData.alergi}
                    onChange={(e) => setFormData({ ...formData, alergi: e.target.value })}
                  />
                </div>

                <div className="form-group fg-full">
                  <label>Riwayat Penyakit Terdahulu</label>
                  <textarea
                    name="riwayat_penyakit"
                    className="form-control"
                    rows="2"
                    placeholder="misal: Hipertensi, Asma, Diabetes Melitus..."
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
                onClick={() => { setViewMode('list'); setFormErrors([]); }}
                disabled={formSubmitting}
              >
                Batal
              </button>
              <button type="submit" className="btn" disabled={formSubmitting}>
                <AppIcon name="save" /> {formSubmitting ? 'Menyimpan...' : 'Simpan Data Pasien'}
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
              <div className="pt-title">Data Pasien</div>
              <div className="pt-sub">
                {totalCount} pasien terdaftar
              </div>
            </div>
            <div className="pt-actions">
              <button className="btn" onClick={openCreateModal}>
                <AppIcon name="plus" /> Pasien Baru
              </button>
            </div>
          </div>

          <div className="table-wrap">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                Memuat data pasien...
              </div>
            ) : (
              <DataTableWrapper
                columns={[
                  {
                    key: 'no_mr',
                    label: 'NO. MR',
                    render: (p) => <b>{p.no_mr}</b>,
                  },
                  {
                    key: 'nama',
                    label: 'NAMA',
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
                    label: 'L/P',
                    render: (p) => (p.jenis_kelamin === 'L' ? 'L' : 'P'),
                  },
                  {
                    key: 'tgl_lahir',
                    label: 'TGL LAHIR',
                    render: (p) => formatDate(p.tgl_lahir),
                  },
                  {
                    key: 'kelompok_nama',
                    label: 'KELOMPOK',
                    render: (p) => p.kelompok_nama || p.kelompok || '-',
                  },
                  {
                    key: 'actions',
                    label: 'AKSI',
                    sortable: false,
                    thClassName: 'no-sort col-actions col-actions-wide',
                    className: 'cell-actions cell-actions-wide',
                    render: (p) => (
                      <div className="cell-actions-inner">
                        <button
                          type="button"
                          className="btn btn-sm btn-light btn-icon"
                          title="Lihat Detail"
                          onClick={() => openDetailModal(p)}
                        >
                          <AppIcon name="eye" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light btn-icon"
                          title="Edit"
                          onClick={() => openEditModal(p)}
                        >
                          <AppIcon name="pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          title="Daftar Kunjungan"
                          onClick={() => {
                            if (onRegisterVisit) onRegisterVisit(p);
                          }}
                        >
                          Daftar Kunjungan
                        </button>
                      </div>
                    ),
                  },
                ]}
                data={pasienList}
                defaultPageSize={25}
                emptyText="Tidak ada data pasien yang terdaftar."
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
                Rekam Data Pasien: <b>{selectedPasien.nama}</b>
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
                      No. MR <b>{selectedPasien.no_mr}</b> &middot; {selectedPasien.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} &middot; {calculateAge(selectedPasien.tgl_lahir)} &middot; {selectedPasien.kelompok_nama || 'Umum'}
                    </div>
                    <div style={{ color: 'var(--muted)' }}>
                      {selectedPasien.tgl_lahir ? formatDate(selectedPasien.tgl_lahir) : '-'}
                      {selectedPasien.gol_darah && selectedPasien.gol_darah !== '-' && (
                        <span> &middot; Gol. Darah {selectedPasien.gol_darah}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {selectedPasien.alergi ? (
                      <span className="badge badge-red"><AppIcon name="alert" /> Alergi: {selectedPasien.alergi}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Seksi 1: Identitas Pasien */}
              <div className="detail-section">
                <div className="step-head">
                  <div className="step-num acc-blue"><AppIcon name="user" /></div>
                  <div><div className="st-title">Identitas Pasien</div></div>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="di-label">NIK</div>
                    <div className={`di-value ${!selectedPasien.nik ? 'empty' : ''}`}>{selectedPasien.nik || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">No. Passport / KITAS</div>
                    <div className={`di-value ${!selectedPasien.no_passport ? 'empty' : ''}`}>{selectedPasien.no_passport || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Tempat Lahir</div>
                    <div className={`di-value ${!selectedPasien.tempat_lahir ? 'empty' : ''}`}>{selectedPasien.tempat_lahir || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Tanggal Lahir</div>
                    <div className={`di-value ${!selectedPasien.tgl_lahir ? 'empty' : ''}`}>{selectedPasien.tgl_lahir ? formatDate(selectedPasien.tgl_lahir) : '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Jenis Kelamin</div>
                    <div className="di-value">{selectedPasien.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Golongan Darah</div>
                    <div className={`di-value ${!selectedPasien.gol_darah || selectedPasien.gol_darah === '-' ? 'empty' : ''}`}>{selectedPasien.gol_darah && selectedPasien.gol_darah !== '-' ? selectedPasien.gol_darah : '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Agama</div>
                    <div className={`di-value ${!selectedPasien.agama ? 'empty' : ''}`}>{selectedPasien.agama || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Status Perkawinan</div>
                    <div className={`di-value ${!selectedPasien.status_kawin ? 'empty' : ''}`}>{selectedPasien.status_kawin || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Pendidikan</div>
                    <div className={`di-value ${!selectedPasien.pendidikan ? 'empty' : ''}`}>{selectedPasien.pendidikan || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Kewarganegaraan</div>
                    <div className="di-value">{selectedPasien.kewarganegaraan || 'WNI'}</div>
                  </div>
                </div>
              </div>

              {/* Seksi 2: Alamat & Kontak */}
              <div className="detail-section">
                <div className="step-head">
                  <div className="step-num acc-green"><AppIcon name="mapPin" /></div>
                  <div><div className="st-title">Alamat & Kontak</div></div>
                </div>
                <div className="detail-grid">
                  <div className="detail-item dg-full">
                    <div className="di-label">Alamat Lengkap</div>
                    <div className={`di-value ${!selectedPasien.alamat ? 'empty' : ''}`}>{selectedPasien.alamat || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Kelurahan / Desa</div>
                    <div className={`di-value ${!selectedPasien.kelurahan ? 'empty' : ''}`}>{selectedPasien.kelurahan || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Kecamatan</div>
                    <div className={`di-value ${!selectedPasien.kecamatan ? 'empty' : ''}`}>{selectedPasien.kecamatan || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Kota / Kabupaten</div>
                    <div className={`di-value ${!selectedPasien.kota ? 'empty' : ''}`}>{selectedPasien.kota || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Provinsi</div>
                    <div className={`di-value ${!selectedPasien.provinsi ? 'empty' : ''}`}>{selectedPasien.provinsi || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Kode Pos</div>
                    <div className={`di-value ${!selectedPasien.kode_pos ? 'empty' : ''}`}>{selectedPasien.kode_pos || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">No. Telepon / HP</div>
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
                  <div><div className="st-title">Penjamin & Pekerjaan</div></div>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="di-label">Kelompok Penjamin</div>
                    <div className="di-value">{selectedPasien.kelompok_nama || 'Umum'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">No. Kartu / Asuransi</div>
                    <div className={`di-value ${!selectedPasien.no_asuransi ? 'empty' : ''}`}>{selectedPasien.no_asuransi || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Pekerjaan</div>
                    <div className={`di-value ${!selectedPasien.pekerjaan ? 'empty' : ''}`}>{selectedPasien.pekerjaan || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Seksi 4: Kontak Darurat */}
              <div className="detail-section">
                <div className="step-head">
                  <div className="step-num acc-purple"><AppIcon name="users" /></div>
                  <div><div className="st-title">Kontak Darurat</div></div>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="di-label">Nama Kontak Darurat</div>
                    <div className={`di-value ${!selectedPasien.kontak_nama ? 'empty' : ''}`}>{selectedPasien.kontak_nama || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">Hubungan</div>
                    <div className={`di-value ${!selectedPasien.kontak_hubungan ? 'empty' : ''}`}>{selectedPasien.kontak_hubungan || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="di-label">No. Telepon Darurat</div>
                    <div className={`di-value ${!selectedPasien.kontak_telepon ? 'empty' : ''}`}>{selectedPasien.kontak_telepon || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Seksi 5: Informasi Medis */}
              <div className="detail-section">
                <div className="step-head">
                  <div className="step-num acc-red"><AppIcon name="pills" /></div>
                  <div><div className="st-title">Informasi Medis</div></div>
                </div>
                <div className="detail-grid">
                  <div className="detail-item dg-full">
                    <div className="di-label">Riwayat Alergi</div>
                    <div className={`di-value ${!selectedPasien.alergi ? 'empty' : ''}`}>{selectedPasien.alergi || '—'}</div>
                  </div>
                  <div className="detail-item dg-full">
                    <div className="di-label">Riwayat Penyakit</div>
                    <div className={`di-value ${!selectedPasien.riwayat_penyakit ? 'empty' : ''}`}>{selectedPasien.riwayat_penyakit || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Riwayat Kunjungan */}
              <div style={{ marginTop: 20 }}>
                <div className="section-title">Riwayat Kunjungan ({riwayatKunjungan.length})</div>
                <div className="table-wrap">
                  <table className="datatable dt-noscroll" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>No. Kunjungan</th>
                        <th>Tanggal</th>
                        <th>Poli</th>
                        <th>Dokter</th>
                        <th>Keluhan</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riwayatKunjungan.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)', padding: '16px' }}>
                            Belum ada riwayat kunjungan.
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
                                {k.status}
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
                  Tutup
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => {
                    setDetailModalOpen(false);
                    openEditModal(selectedPasien);
                  }}
                >
                  <AppIcon name="pencil" /> Edit Pasien
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setDetailModalOpen(false);
                    if (onRegisterVisit) onRegisterVisit(selectedPasien);
                  }}
                >
                  <AppIcon name="plus" /> Daftar Kunjungan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
