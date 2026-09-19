import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';

export default function RegistrasiDaftarView({ initialPasien, onNavigate }) {
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
      setErrors(['Pasien belum dipilih.']);
      return;
    }
    if (!formData.poli_id) {
      setErrors(['Poli tujuan wajib dipilih.']);
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
        setSuccessMsg(res.message || 'Pendaftaran kunjungan berhasil disimpan.');
        setTimeout(() => {
          onNavigate('billing');
        }, 1200);
      }
    } catch (err) {
      setErrors([err.message || 'Gagal menyimpan pendaftaran kunjungan.']);
    } finally {
      setSaving(false);
    }
  };

  const filteredDokter = lookups.dokter.filter((d) => {
    if (!formData.poli_id) return true;
    return !d.poli_id || Number(d.poli_id) === Number(formData.poli_id);
  });

  const formatRupiah = (num) => {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  };

  return (
    <div>
      {/* Page Toolbar matching backend/legacy/modules/registrasi/daftar.php */}
      <div className="page-toolbar">
        <div>
          <div className="pt-title">Pendaftaran Kunjungan</div>
          <div className="pt-sub">Pilih pasien, lalu lengkapi tujuan poli & penjamin</div>
        </div>
        <div className="pt-actions">
          <button
            type="button"
            className="btn-back"
            onClick={() => onNavigate('kunjungan')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <AppIcon name="chevron" /> Kembali ke Daftar
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
            <div className="st-title">Pilih Pasien</div>
            <div className="st-sub">Cari pasien lama atau daftar baru</div>
          </div>
        </div>

        {selectedPasien ? (
          <div className="patient-box">
            <div className="pname">
              <span className="av">{(selectedPasien.nama || 'P').charAt(0).toUpperCase()}</span>
              {selectedPasien.nama}
            </div>
            <div className="patient-meta">
              No. MR: <b>{selectedPasien.no_mr}</b>
              <br />
              {selectedPasien.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} &middot; {selectedPasien.tgl_lahir || '-'}
              {selectedPasien.nik && <> &middot; NIK: <b>{selectedPasien.nik}</b></>}
              {selectedPasien.alergi && (
                <>
                  <br />
                  <span className="badge badge-red">Alergi: {selectedPasien.alergi}</span>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-light"
              style={{ marginTop: 12 }}
              onClick={() => setSelectedPasien(null)}
            >
              <AppIcon name="search" /> Ganti Pasien
            </button>
          </div>
        ) : (
          <div>
            <form onSubmit={handleSearchPasien} className="search-inline">
              <input
                type="text"
                className="form-control"
                placeholder="Ketik nama, No. MR, atau NIK untuk mencari..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button className="btn" type="submit" disabled={searching}>
                <AppIcon name="search" />
              </button>
            </form>

            {searching ? (
              <p className="result-empty">Mencari pasien...</p>
            ) : hasSearched && searchResults.length === 0 ? (
              <div className="result-empty">
                <p>Pasien tidak ditemukan.</p>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onNavigate('pasien_form')}
                >
                  <AppIcon name="plus" /> Tambah Pasien Baru
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
              <p className="result-empty">Ketik nama, No. MR, atau NIK untuk mencari pasien lama.</p>
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
              <div className="st-title">Poli, Dokter & Penjamin</div>
              <div className="st-sub">Detail kunjungan pasien</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tanggal Kunjungan</label>
              <input
                type="date"
                name="tgl_kunjungan"
                className="form-control"
                value={formData.tgl_kunjungan}
                onChange={(e) => setFormData({ ...formData, tgl_kunjungan: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Poli Tujuan *</label>
              <select
                name="poli_id"
                className="form-control"
                required
                value={formData.poli_id}
                onChange={(e) => setFormData({ ...formData, poli_id: e.target.value })}
              >
                <option value="">--- Pilih Poli ---</option>
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
              <label>Dokter</label>
              <select
                name="dokter_id"
                className="form-control"
                value={formData.dokter_id}
                onChange={(e) => setFormData({ ...formData, dokter_id: e.target.value })}
              >
                <option value="">--- Pilih Dokter (opsional) ---</option>
                {filteredDokter.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nama}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Jenis Registrasi</label>
              <select
                name="jenis_registrasi"
                className="form-control"
                value={formData.jenis_registrasi}
                onChange={(e) => setFormData({ ...formData, jenis_registrasi: e.target.value })}
              >
                <option value="rawat_jalan">Rawat Jalan (Outpatient)</option>
                <option value="rawat_inap">Rawat Inap</option>
              </select>
            </div>
          </div>

          {formData.jenis_registrasi === 'rawat_inap' && (
            <div className="form-row">
              <div className="form-group">
                <label>Lama Rawat (Hari)</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={formData.lama_rawat}
                  onChange={(e) => setFormData({ ...formData, lama_rawat: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Tanggal Rencana Keluar</label>
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
              <label>Jenis Penjamin</label>
              <select
                name="jenis_penjamin"
                className="form-control"
                value={formData.jenis_penjamin}
                onChange={(e) => setFormData({ ...formData, jenis_penjamin: e.target.value })}
              >
                <option value="umum">Umum (Pribadi)</option>
                <option value="bpjs">BPJS Kesehatan</option>
                <option value="asuransi">Asuransi Swasta</option>
                <option value="corporate">Corporate / Perusahaan</option>
              </select>
            </div>
            {formData.jenis_penjamin === 'asuransi' && (
              <div className="form-group">
                <label>Asuransi Penjamin</label>
                <select
                  className="form-control"
                  value={formData.asuransi_id}
                  onChange={(e) => setFormData({ ...formData, asuransi_id: e.target.value })}
                >
                  <option value="">--- Pilih Asuransi ---</option>
                  {lookups.asuransi.map((a) => (
                    <option key={a.id} value={a.id}>{a.nama}</option>
                  ))}
                </select>
              </div>
            )}
            {formData.jenis_penjamin === 'corporate' && (
              <div className="form-group">
                <label>Perusahaan / Corporate</label>
                <select
                  className="form-control"
                  value={formData.corporate_id}
                  onChange={(e) => setFormData({ ...formData, corporate_id: e.target.value })}
                >
                  <option value="">--- Pilih Perusahaan ---</option>
                  {lookups.corporate.map((c) => (
                    <option key={c.id} value={c.id}>{c.nama}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: 6 }}>
            <label>Keluhan Utama / Catatan Awal</label>
            <textarea
              name="keluhan_awal"
              className="form-control"
              rows="2"
              placeholder="Contoh: Demam, pusing, batuk sejak 2 hari yang lalu"
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
              <h3 style={{ margin: 0, fontSize: 16 }}>Medical Service</h3>
              <button type="button" className="btn btn-sm" onClick={addTindakan}>
                <AppIcon name="plus" /> Tambah Medical Service
              </button>
            </div>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Medical Service</th>
                  <th style={{ width: 100, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {tindakanRows.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                      Belum ada tindakan yang dipilih.
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
                          title="Hapus"
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
              <h3 style={{ margin: 0, fontSize: 16 }}>Konsultasi</h3>
              <button type="button" className="btn btn-sm" onClick={addKonsultasi}>
                <AppIcon name="plus" /> Tambah Konsultasi
              </button>
            </div>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Konsultasi</th>
                  <th style={{ width: 100, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {konsultasiRows.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                      Belum ada konsultasi yang dipilih.
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
                          title="Hapus"
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
              <h3 style={{ margin: 0, fontSize: 16 }}>Permintaan Lab</h3>
              <button type="button" className="btn btn-sm" onClick={addLab}>
                <AppIcon name="plus" /> Tambah Lab
              </button>
            </div>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Pemeriksaan Lab</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: 160 }}>Hasil / Catatan</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {labRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                      Belum ada permintaan lab.
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
                          placeholder="Hasil..."
                          value={row.hasil}
                          onChange={(e) => {
                            const h = e.target.value;
                            setLabRows(prev => prev.map((item, i) => i === idx ? { ...item, hasil: h } : item));
                          }}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn btn-sm btn-red" onClick={() => removeLab(idx)}>
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
              <h3 style={{ margin: 0, fontSize: 16 }}>Permintaan Radiologi</h3>
              <button type="button" className="btn btn-sm" onClick={addRad}>
                <AppIcon name="plus" /> Tambah Radiologi
              </button>
            </div>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Pemeriksaan Radiologi</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: 160 }}>Hasil / Catatan</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {radRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                      Belum ada permintaan radiologi.
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
                          placeholder="Hasil..."
                          value={row.hasil}
                          onChange={(e) => {
                            const h = e.target.value;
                            setRadRows(prev => prev.map((item, i) => i === idx ? { ...item, hasil: h } : item));
                          }}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn btn-sm btn-red" onClick={() => removeRad(idx)}>
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

        {/* STEP 5: Resep Obat (Farmasi) */}
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Resep Obat (Farmasi)</h3>
            <button type="button" className="btn btn-sm" onClick={addObat}>
              <AppIcon name="plus" /> Tambah Obat
            </button>
          </div>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Nama Obat</th>
                <th style={{ width: 80, textAlign: 'center' }}>Qty</th>
                <th style={{ width: 140 }}>Dosis</th>
                <th style={{ width: 180 }}>Aturan Pakai</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {obatRows.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px' }}>
                    Belum ada obat yang diresepkan.
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
                            {o.nama} (Stok: {o.stok || 0}) — {formatRupiah(o.harga_jual || o.harga_beli)}
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
                        placeholder="Contoh: 500mg"
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
                        placeholder="Contoh: 3x1 sesudah makan"
                        value={row.aturan_pakai}
                        onChange={(e) => {
                          const val = e.target.value;
                          setObatRows(prev => prev.map((item, i) => i === idx ? { ...item, aturan_pakai: val } : item));
                        }}
                      />
                    </td>
                    <td>
                      <button type="button" className="btn btn-sm btn-red" onClick={() => removeObat(idx)}>
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
            Batal
          </button>
          <button type="submit" className="btn" disabled={saving}>
            <AppIcon name="plus" /> {saving ? 'Menyimpan...' : 'Simpan Pendaftaran Kunjungan'}
          </button>
        </div>
      </form>
    </div>
  );
}
