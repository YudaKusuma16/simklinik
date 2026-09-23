import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import { useI18n } from '../i18n';

export default function RegistrasiDaftarView({ initialPasien, onNavigate }) {
  const { t, isEn, trans, formatTgl } = useI18n();
  const [selectedPasien, setSelectedPasien] = useState(initialPasien || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Lookups
  const [lookups, setLookups] = useState({
    poli: [],
    dokter: [],
    asuransi: [],
    corporate: [],
    tindakan: [],
    konsultasi: [],
    lab: [],
    rad: [],
    diag: [],
    fisio: [],
    obat: [],
  });

  // Form fields
  const [formData, setFormData] = useState({
    tgl_kunjungan: new Date().toISOString().split('T')[0],
    poli_id: '',
    dokter_id: '',
    jenis_registrasi: 'rawat_jalan',
    lama_rawat: 1,
    tgl_keluar: '',
    jenis_penjamin: 'umum',
    asuransi_id: '',
    corporate_id: '',
    no_jaminan: '',
    keluhan_awal: '',
  });

  // Service rows
  const [tindakanRows, setTindakanRows] = useState([]);
  const [konsultasiRows, setKonsultasiRows] = useState([]);
  const [labRows, setLabRows] = useState([]);
  const [radRows, setRadRows] = useState([]);
  const [diagRows, setDiagRows] = useState([]);
  const [fisioRows, setFisioRows] = useState([]);
  const [obatRows, setObatRows] = useState([]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchLookups();
  }, []);

  const fetchLookups = async () => {
    try {
      const res = await api.get('/kunjungan/lookups');
      if (res && res.success) {
        setLookups({
          poli: res.poli || [],
          dokter: res.dokter || [],
          asuransi: res.asuransi || [],
          corporate: res.corporate || [],
          tindakan: res.tindakan || [],
          konsultasi: res.konsultasi || [],
          lab: res.lab || [],
          rad: res.rad || [],
          diag: res.diag || [],
          fisio: res.fisio || [],
          obat: res.obat || [],
        });
      }
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  };

  // Search patients
  const handleSearchPasien = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await api.get(`/pasien?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res && res.data) {
        setSearchResults(res.data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPasien = (p) => {
    setSelectedPasien(p);
    setSearchResults([]);
    setSearchQuery('');
    setHasSearched(false);
  };

  // Row operations
  const addTindakan = () => setTindakanRows(prev => [...prev, { tindakan_id: lookups.tindakan[0]?.id || '', qty: 1 }]);
  const removeTindakan = (idx) => setTindakanRows(prev => prev.filter((_, i) => i !== idx));

  const addKonsultasi = () => setKonsultasiRows(prev => [...prev, { konsultasi_id: lookups.konsultasi[0]?.id || '', qty: 1 }]);
  const removeKonsultasi = (idx) => setKonsultasiRows(prev => prev.filter((_, i) => i !== idx));

  const addLab = () => setLabRows(prev => [...prev, { lab_id: lookups.lab[0]?.id || '', qty: 1, hasil: '' }]);
  const removeLab = (idx) => setLabRows(prev => prev.filter((_, i) => i !== idx));

  const addRad = () => setRadRows(prev => [...prev, { rad_id: lookups.rad[0]?.id || '', qty: 1, hasil: '' }]);
  const removeRad = (idx) => setRadRows(prev => prev.filter((_, i) => i !== idx));

  const addDiag = () => setDiagRows(prev => [...prev, { diag_id: lookups.diag[0]?.id || '', qty: 1, hasil: '' }]);
  const removeDiag = (idx) => setDiagRows(prev => prev.filter((_, i) => i !== idx));

  const addFisio = () => setFisioRows(prev => [...prev, { fisio_id: lookups.fisio[0]?.id || '', qty: 1, hasil: '' }]);
  const removeFisio = (idx) => setFisioRows(prev => prev.filter((_, i) => i !== idx));

  const addObat = () => setObatRows(prev => [...prev, { obat_id: lookups.obat[0]?.id || '', qty: 1, dosis: '', aturan_pakai: '' }]);
  const removeObat = (idx) => setObatRows(prev => prev.filter((_, i) => i !== idx));

  // Submit visit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    if (!selectedPasien) {
      setErrors([trans('Pasien belum dipilih.', 'Patient has not been selected.')]);
      return;
    }
    if (!formData.poli_id) {
      setErrors([trans('Poli tujuan wajib dipilih.', 'Target clinic is required.')]);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        pasien_id: selectedPasien.id,
        poli_id: Number(formData.poli_id),
        dokter_id: formData.dokter_id ? Number(formData.dokter_id) : null,
        jenis_registrasi: formData.jenis_registrasi,
        tgl_kunjungan: formData.tgl_kunjungan,
        lama_rawat: formData.jenis_registrasi === 'rawat_inap' ? Number(formData.lama_rawat) : 1,
        tgl_keluar: formData.jenis_registrasi === 'rawat_inap' ? formData.tgl_keluar : null,
        jenis_penjamin: formData.jenis_penjamin,
        asuransi_id: formData.jenis_penjamin === 'asuransi' && formData.asuransi_id ? Number(formData.asuransi_id) : null,
        corporate_id: formData.jenis_penjamin === 'corporate' && formData.corporate_id ? Number(formData.corporate_id) : null,
        no_jaminan: formData.no_jaminan || null,
        keluhan_awal: formData.keluhan_awal || null,
        status: 'billing',
        tindakan: tindakanRows.filter(r => r.tindakan_id),
        konsultasi: konsultasiRows.filter(r => r.konsultasi_id),
        lab: labRows.filter(r => r.lab_id),
        rad: radRows.filter(r => r.rad_id),
        diag: diagRows.filter(r => r.diag_id),
        fisio: fisioRows.filter(r => r.fisio_id),
        obat: obatRows.filter(r => r.obat_id),
      };

      const res = await api.post('/kunjungan', payload);
      if (res && res.success) {
        setSuccessMsg(res.message || trans('Pendaftaran kunjungan berhasil disimpan.', 'Visit registration saved successfully.'));
        setTimeout(() => {
          onNavigate('billing');
        }, 1200);
      }
    } catch (err) {
      setErrors([err.message || trans('Gagal menyimpan pendaftaran kunjungan.', 'Failed to save visit registration.')]);
    } finally {
      setSaving(false);
    }
  };

  const filteredDokter = lookups.dokter.filter((d) => {
    if (!formData.poli_id) return [];
    return Number(d.poli_id) === Number(formData.poli_id);
  });

  const formatRupiah = (num) => {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  };

  return (
    <div>
      {/* Page Toolbar matching backend/legacy/modules/registrasi/daftar.php */}
      <div className="page-toolbar">
        <div>
          <div className="pt-title">{t('registrasi_daftar.title')}</div>
          <div className="pt-sub">{t('registrasi_daftar.sub')}</div>
        </div>
        <div className="pt-actions">
          <button
            type="button"
            className="btn-back"
            onClick={() => onNavigate('kunjungan')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <AppIcon name="chevron" /> {trans('Kembali ke Daftar', 'Back to List')}
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="alert alert-danger" style={{ marginTop: 14 }}>
          {errors.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ marginTop: 14 }}>
          {successMsg}
        </div>
      )}

      {/* STEP 1: Pilih Pasien */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="step-head">
          <div className="step-num">1</div>
          <div>
            <div className="st-title">{trans('Pilih Pasien', 'Select Patient')}</div>
            <div className="st-sub">{trans('Cari pasien lama atau daftar baru', 'Search existing patient or register new')}</div>
          </div>
        </div>

        {selectedPasien ? (
          <div className="patient-box">
            <div className="pname">
              <span className="av">{(selectedPasien.nama || 'P').charAt(0).toUpperCase()}</span>
              {selectedPasien.nama}
            </div>
            <div className="patient-meta">
              {t('common.mr_no')}: <b>{selectedPasien.no_mr}</b>
              <br />
              {selectedPasien.jenis_kelamin === 'L' ? trans('Laki-laki', 'Male') : trans('Perempuan', 'Female')} &middot; {formatTgl(selectedPasien.tgl_lahir) || '-'}
              {selectedPasien.nik && <> &middot; NIK: <b>{selectedPasien.nik}</b></>}
              {selectedPasien.alergi && (
                <>
                  <br />
                  <span className="badge badge-red">{trans('Alergi: ', 'Allergy: ')}{selectedPasien.alergi}</span>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-light"
              style={{ marginTop: 12 }}
              onClick={() => setSelectedPasien(null)}
            >
              <AppIcon name="search" /> {trans('Ganti Pasien', 'Change Patient')}
            </button>
          </div>
        ) : (
          <div>
            <form onSubmit={handleSearchPasien} className="search-inline">
              <input
                type="text"
                className="form-control"
                placeholder={trans('Ketik nama, No. MR, atau NIK untuk mencari...', 'Type name, MR No., or ID to search...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button className="btn" type="submit" disabled={searching}>
                <AppIcon name="search" />
              </button>
            </form>

            {searching ? (
              <p className="result-empty">{trans('Mencari pasien...', 'Searching patient...')}</p>
            ) : hasSearched && searchResults.length === 0 ? (
              <div className="result-empty">
                <p>{trans('Pasien tidak ditemukan.', 'Patient not found.')}</p>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onNavigate('pasien_form')}
                >
                  <AppIcon name="plus" /> {trans('Tambah Pasien Baru', 'Add New Patient')}
                </button>
              </div>
            ) : searchResults.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    className="result-item"
                    onClick={() => handleSelectPasien(p)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="av">{(p.nama || 'P').charAt(0).toUpperCase()}</span>
                    <span>
                      <span className="ri-name">{p.nama}</span>
                      <span className="ri-meta">
                        {p.no_mr} {p.nik ? `· NIK: ${p.nik}` : ''} · {p.telepon || '-'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="result-empty">{trans('Ketik nama, No. MR, atau NIK untuk mencari pasien lama.', 'Type name, MR No., or ID to search existing patient.')}</p>
            )}
          </div>
        )}
      </div>

      {/* FORM: Poli, Dokter & Layanan (Disabled visually if no patient) */}
      <form
        onSubmit={handleSubmit}
        style={{
          opacity: selectedPasien ? 1 : 0.45,
          pointerEvents: selectedPasien ? 'auto' : 'none',
          transition: 'opacity .2s',
        }}
      >
        {/* STEP 2: Poli, Dokter & Penjamin */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="step-head">
            <div className="step-num">2</div>
            <div>
              <div className="st-title">{trans('Poli, Dokter & Penjamin', 'Clinic, Doctor & Insurance')}</div>
              <div className="st-sub">{trans('Detail kunjungan pasien', 'Patient visit details')}</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{trans('Tanggal Kunjungan', 'Visit Date')}</label>
              <input
                type="date"
                name="tgl_kunjungan"
                className="form-control"
                value={formData.tgl_kunjungan}
                onChange={(e) => setFormData({ ...formData, tgl_kunjungan: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{trans('Poli / Unit Tujuan', 'Target Clinic / Poli')} <span style={{ color: 'var(--red)' }}>*</span></label>
              <select
                name="poli_id"
                className="form-control"
                required
                value={formData.poli_id}
                onChange={(e) => {
                  const newPoliId = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    poli_id: newPoliId,
                    dokter_id: '',
                  }));
                }}
              >
                <option value="">{trans('--- Pilih Poli ---', '--- Select Clinic ---')}</option>
                {lookups.poli.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{trans('Dokter', 'Doctor')}</label>
              <select
                name="dokter_id"
                className="form-control"
                value={formData.dokter_id}
                onChange={(e) => setFormData({ ...formData, dokter_id: e.target.value })}
                disabled={!formData.poli_id}
              >
                <option value="">
                  {!formData.poli_id
                    ? trans('--- Pilih Poli terlebih dahulu ---', '--- Select Clinic first ---')
                    : filteredDokter.length === 0
                    ? trans('--- Tidak ada dokter di poli ini ---', '--- No doctor available ---')
                    : trans('--- Pilih Dokter (opsional) ---', '--- Select Doctor (optional) ---')}
                </option>
                {filteredDokter.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nama}{d.spesialisasi_nama ? ` (${d.spesialisasi_nama})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{trans('Jenis Registrasi', 'Registration Type')}</label>
              <select
                name="jenis_registrasi"
                className="form-control"
                value={formData.jenis_registrasi}
                onChange={(e) => setFormData({ ...formData, jenis_registrasi: e.target.value })}
              >
                <option value="rawat_jalan">{trans('Rawat Jalan (Outpatient)', 'Outpatient')}</option>
                <option value="rawat_inap">{trans('Rawat Inap (Inpatient)', 'Inpatient')}</option>
              </select>
            </div>
          </div>

          {formData.jenis_registrasi === 'rawat_inap' && (
            <div className="form-row">
              <div className="form-group">
                <label>{trans('Lama Rawat (Hari)', 'Length of Stay (Days)')}</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={formData.lama_rawat}
                  onChange={(e) => setFormData({ ...formData, lama_rawat: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{trans('Tanggal Rencana Keluar', 'Estimated Discharge Date')}</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.tgl_keluar}
                  onChange={(e) => setFormData({ ...formData, tgl_keluar: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>{trans('Jenis Penjamin', 'Insurance Type')}</label>
              <select
                name="jenis_penjamin"
                className="form-control"
                value={formData.jenis_penjamin}
                onChange={(e) => setFormData({ ...formData, jenis_penjamin: e.target.value })}
              >
                <option value="umum">{trans('Umum (Pribadi)', 'General / Self-pay')}</option>
                <option value="bpjs">BPJS Kesehatan</option>
                <option value="asuransi">{trans('Asuransi Swasta', 'Private Insurance')}</option>
                <option value="corporate">{trans('Perusahaan / Corporate', 'Corporate')}</option>
              </select>
            </div>
            {formData.jenis_penjamin === 'asuransi' && (
              <div className="form-group">
                <label>{trans('Asuransi Penjamin', 'Insurance Provider')}</label>
                <select
                  className="form-control"
                  value={formData.asuransi_id}
                  onChange={(e) => setFormData({ ...formData, asuransi_id: e.target.value })}
                >
                  <option value="">{trans('--- Pilih Asuransi ---', '--- Select Insurance ---')}</option>
                  {lookups.asuransi.map((a) => (
                    <option key={a.id} value={a.id}>{a.nama}</option>
                  ))}
                </select>
              </div>
            )}
            {formData.jenis_penjamin === 'corporate' && (
              <div className="form-group">
                <label>{trans('Perusahaan / Corporate', 'Company / Corporate')}</label>
                <select
                  className="form-control"
                  value={formData.corporate_id}
                  onChange={(e) => setFormData({ ...formData, corporate_id: e.target.value })}
                >
                  <option value="">{trans('--- Pilih Perusahaan ---', '--- Select Company ---')}</option>
                  {lookups.corporate.map((c) => (
                    <option key={c.id} value={c.id}>{c.nama}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: 6 }}>
            <label>{trans('Keluhan Utama / Catatan Awal', 'Chief Complaint / Initial Notes')}</label>
            <textarea
              name="keluhan_awal"
              className="form-control"
              rows="2"
              placeholder={trans('Contoh: Demam, pusing, batuk sejak 2 hari yang lalu', 'e.g. Fever, headache, cough since 2 days ago')}
              value={formData.keluhan_awal}
              onChange={(e) => setFormData({ ...formData, keluhan_awal: e.target.value })}
            />
          </div>
        </div>

        {/* STEP 3: Medical Service & Konsultasi */}
        <div className="form-row" style={{ marginTop: 14 }}>
          {/* Medical Service */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{trans('Medical Service', 'Medical Service')}</h3>
              <button type="button" className="btn btn-sm" onClick={addTindakan}>
                <AppIcon name="plus" /> {trans('Tambah Medical Service', 'Add Medical Service')}
              </button>
            </div>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{trans('Medical Service', 'Medical Service')}</th>
                  <th style={{ width: 100, textAlign: 'center' }}>{trans('Qty', 'Qty')}</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {tindakanRows.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                      {trans('Belum ada tindakan yang dipilih.', 'No procedures selected.')}
                    </td>
                  </tr>
                ) : (
                  tindakanRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          className="form-control"
                          value={row.tindakan_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTindakanRows(prev => prev.map((item, i) => i === idx ? { ...item, tindakan_id: val } : item));
                          }}
                        >
                          {lookups.tindakan.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nama} — {formatRupiah(t.harga_jual || t.tarif)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          style={{ width: 75, textAlign: 'center', padding: '6px 4px', margin: '0 auto' }}
                          value={row.qty}
                          onChange={(e) => {
                            const q = Number(e.target.value);
                            setTindakanRows(prev => prev.map((item, i) => i === idx ? { ...item, qty: q } : item));
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-red"
                          onClick={() => removeTindakan(idx)}
                          title={trans('Hapus', 'Delete')}
                        >
                          <AppIcon name="close" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Konsultasi */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{trans('Konsultasi', 'Consultation')}</h3>
              <button type="button" className="btn btn-sm" onClick={addKonsultasi}>
                <AppIcon name="plus" /> {trans('Tambah Konsultasi', 'Add Consultation')}
              </button>
            </div>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{trans('Konsultasi', 'Consultation')}</th>
                  <th style={{ width: 100, textAlign: 'center' }}>{trans('Qty', 'Qty')}</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {konsultasiRows.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                      {trans('Belum ada konsultasi yang dipilih.', 'No consultations selected.')}
                    </td>
                  </tr>
                ) : (
                  konsultasiRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          className="form-control"
                          value={row.konsultasi_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            setKonsultasiRows(prev => prev.map((item, i) => i === idx ? { ...item, konsultasi_id: val } : item));
                          }}
                        >
                          {lookups.konsultasi.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.nama} — {formatRupiah(k.harga_jual || k.tarif)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          style={{ width: 75, textAlign: 'center', padding: '6px 4px', margin: '0 auto' }}
                          value={row.qty}
                          onChange={(e) => {
                            const q = Number(e.target.value);
                            setKonsultasiRows(prev => prev.map((item, i) => i === idx ? { ...item, qty: q } : item));
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-red"
                          onClick={() => removeKonsultasi(idx)}
                          title={trans('Hapus', 'Delete')}
                        >
                          <AppIcon name="close" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* STEP 4: Permintaan Lab & Radiologi */}
        <div className="form-row" style={{ marginTop: 14 }}>
          {/* Lab */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{trans('Permintaan Lab', 'Laboratory Request')}</h3>
              <button type="button" className="btn btn-sm" onClick={addLab}>
                <AppIcon name="plus" /> {trans('Tambah Lab', 'Add Lab')}
              </button>
            </div>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{trans('Pemeriksaan Lab', 'Lab Examination')}</th>
                  <th style={{ width: 60, textAlign: 'center' }}>{trans('Qty', 'Qty')}</th>
                  <th style={{ width: 160 }}>{trans('Hasil / Catatan', 'Result / Notes')}</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {labRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                      {trans('Belum ada permintaan lab.', 'No lab requests.')}
                    </td>
                  </tr>
                ) : (
                  labRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          className="form-control"
                          value={row.lab_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLabRows(prev => prev.map((item, i) => i === idx ? { ...item, lab_id: val } : item));
                          }}
                        >
                          {lookups.lab.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nama} {l.nilai_rujukan ? `(${l.nilai_rujukan})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          style={{ width: 50, textAlign: 'center', padding: '6px 2px' }}
                          value={row.qty}
                          onChange={(e) => {
                            const q = Number(e.target.value);
                            setLabRows(prev => prev.map((item, i) => i === idx ? { ...item, qty: q } : item));
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder={trans('Hasil...', 'Result...')}
                          value={row.hasil}
                          onChange={(e) => {
                            const h = e.target.value;
                            setLabRows(prev => prev.map((item, i) => i === idx ? { ...item, hasil: h } : item));
                          }}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn btn-sm btn-red" onClick={() => removeLab(idx)} title={trans('Hapus', 'Delete')}>
                          <AppIcon name="close" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Radiologi */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{trans('Permintaan Radiologi', 'Radiology Request')}</h3>
              <button type="button" className="btn btn-sm" onClick={addRad}>
                <AppIcon name="plus" /> {trans('Tambah Radiologi', 'Add Radiology')}
              </button>
            </div>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{trans('Pemeriksaan Radiologi', 'Radiology Examination')}</th>
                  <th style={{ width: 60, textAlign: 'center' }}>{trans('Qty', 'Qty')}</th>
                  <th style={{ width: 160 }}>{trans('Hasil / Catatan', 'Result / Notes')}</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {radRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                      {trans('Belum ada permintaan radiologi.', 'No radiology requests.')}
                    </td>
                  </tr>
                ) : (
                  radRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          className="form-control"
                          value={row.rad_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRadRows(prev => prev.map((item, i) => i === idx ? { ...item, rad_id: val } : item));
                          }}
                        >
                          {lookups.rad.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nama}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          style={{ width: 50, textAlign: 'center', padding: '6px 2px' }}
                          value={row.qty}
                          onChange={(e) => {
                            const q = Number(e.target.value);
                            setRadRows(prev => prev.map((item, i) => i === idx ? { ...item, qty: q } : item));
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder={trans('Hasil...', 'Result...')}
                          value={row.hasil}
                          onChange={(e) => {
                            const h = e.target.value;
                            setRadRows(prev => prev.map((item, i) => i === idx ? { ...item, hasil: h } : item));
                          }}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn btn-sm btn-red" onClick={() => removeRad(idx)} title={trans('Hapus', 'Delete')}>
                          <AppIcon name="close" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* STEP 5: Permintaan Diagnostik & Fisioterapi */}
        <div className="form-row" style={{ marginTop: 14 }}>
          {/* Diagnostik */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{trans('Permintaan Diagnostik', 'Diagnostic Request')}</h3>
              <button type="button" className="btn btn-sm" onClick={addDiag}>
                <AppIcon name="plus" /> {trans('Tambah Diagnostik', 'Add Diagnostic')}
              </button>
            </div>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{trans('Pemeriksaan Diagnostik', 'Diagnostic Examination')}</th>
                  <th style={{ width: 60, textAlign: 'center' }}>{trans('Qty', 'Qty')}</th>
                  <th style={{ width: 160 }}>{trans('Hasil / Catatan', 'Result / Notes')}</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {diagRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                      {trans('Belum ada permintaan diagnostik.', 'No diagnostic requests.')}
                    </td>
                  </tr>
                ) : (
                  diagRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          className="form-control"
                          value={row.diag_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDiagRows(prev => prev.map((item, i) => i === idx ? { ...item, diag_id: val } : item));
                          }}
                        >
                          {lookups.diag.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.nama} {d.harga_jual || d.tarif ? `— ${formatRupiah(d.harga_jual || d.tarif)}` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          style={{ width: 50, textAlign: 'center', padding: '6px 2px' }}
                          value={row.qty}
                          onChange={(e) => {
                            const q = Number(e.target.value);
                            setDiagRows(prev => prev.map((item, i) => i === idx ? { ...item, qty: q } : item));
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder={trans('Hasil / catatan...', 'Result / notes...')}
                          value={row.hasil}
                          onChange={(e) => {
                            const h = e.target.value;
                            setDiagRows(prev => prev.map((item, i) => i === idx ? { ...item, hasil: h } : item));
                          }}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn btn-sm btn-red" onClick={() => removeDiag(idx)} title={trans('Hapus', 'Delete')}>
                          <AppIcon name="close" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Fisioterapi */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{trans('Permintaan Fisioterapi', 'Physiotherapy Request')}</h3>
              <button type="button" className="btn btn-sm" onClick={addFisio}>
                <AppIcon name="plus" /> {trans('Tambah Fisioterapi', 'Add Physiotherapy')}
              </button>
            </div>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{trans('Pemeriksaan Fisioterapi', 'Physiotherapy Examination')}</th>
                  <th style={{ width: 60, textAlign: 'center' }}>{trans('Qty', 'Qty')}</th>
                  <th style={{ width: 160 }}>{trans('Hasil / Catatan', 'Result / Notes')}</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {fisioRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                      {trans('Belum ada permintaan fisioterapi.', 'No physiotherapy requests.')}
                    </td>
                  </tr>
                ) : (
                  fisioRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          className="form-control"
                          value={row.fisio_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFisioRows(prev => prev.map((item, i) => i === idx ? { ...item, fisio_id: val } : item));
                          }}
                        >
                          {lookups.fisio.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.nama} {f.harga_jual || f.tarif ? `— ${formatRupiah(f.harga_jual || f.tarif)}` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          style={{ width: 50, textAlign: 'center', padding: '6px 2px' }}
                          value={row.qty}
                          onChange={(e) => {
                            const q = Number(e.target.value);
                            setFisioRows(prev => prev.map((item, i) => i === idx ? { ...item, qty: q } : item));
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder={trans('Hasil / catatan...', 'Result / notes...')}
                          value={row.hasil}
                          onChange={(e) => {
                            const h = e.target.value;
                            setFisioRows(prev => prev.map((item, i) => i === idx ? { ...item, hasil: h } : item));
                          }}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn btn-sm btn-red" onClick={() => removeFisio(idx)} title={trans('Hapus', 'Delete')}>
                          <AppIcon name="close" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* STEP 6: Resep Obat (Farmasi) */}
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{trans('Resep Obat (Farmasi)', 'Medication Prescription (Pharmacy)')}</h3>
            <button type="button" className="btn btn-sm" onClick={addObat}>
              <AppIcon name="plus" /> {trans('Tambah Obat', 'Add Medication')}
            </button>
          </div>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>{trans('Nama Obat', 'Medicine Name')}</th>
                <th style={{ width: 80, textAlign: 'center' }}>{trans('Qty', 'Qty')}</th>
                <th style={{ width: 140 }}>{trans('Dosis', 'Dosage')}</th>
                <th style={{ width: 180 }}>{trans('Aturan Pakai', 'Directions / Usage')}</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {obatRows.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                    {trans('Belum ada obat yang diresepkan.', 'No medications prescribed.')}
                  </td>
                </tr>
              ) : (
                obatRows.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        className="form-control"
                        value={row.obat_id}
                        onChange={(e) => {
                          const val = e.target.value;
                          setObatRows(prev => prev.map((item, i) => i === idx ? { ...item, obat_id: val } : item));
                        }}
                      >
                        {lookups.obat.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.nama} ({trans('Stok', 'Stock')}: {o.stok || 0}) — {formatRupiah(o.harga_jual || o.harga_beli)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        style={{ width: 65, textAlign: 'center', margin: '0 auto' }}
                        value={row.qty}
                        onChange={(e) => {
                          const q = Number(e.target.value);
                          setObatRows(prev => prev.map((item, i) => i === idx ? { ...item, qty: q } : item));
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={trans('Contoh: 500mg', 'e.g. 500mg')}
                        value={row.dosis}
                        onChange={(e) => {
                          const val = e.target.value;
                          setObatRows(prev => prev.map((item, i) => i === idx ? { ...item, dosis: val } : item));
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={trans('Contoh: 3x1 sesudah makan', 'e.g. 3x1 after meals')}
                        value={row.aturan_pakai}
                        onChange={(e) => {
                          const val = e.target.value;
                          setObatRows(prev => prev.map((item, i) => i === idx ? { ...item, aturan_pakai: val } : item));
                        }}
                      />
                    </td>
                    <td>
                      <button type="button" className="btn btn-sm btn-red" onClick={() => removeObat(idx)} title={trans('Hapus', 'Delete')}>
                        <AppIcon name="close" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="form-actions" style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => onNavigate('kunjungan')}
          >
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn" disabled={saving}>
            <AppIcon name="plus" /> {saving ? trans('Menyimpan...', 'Saving...') : trans('Simpan Pendaftaran Kunjungan', 'Save Visit Registration')}
          </button>
        </div>
      </form>
    </div>
  );
}
