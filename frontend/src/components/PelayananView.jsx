import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';

export default function PelayananView({ initialKunjunganId, onExamCompleted }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [filterPoli, setFilterPoli] = useState('');
  const [antreanList, setAntreanList] = useState([]);
  const [loadingAntrean, setLoadingAntrean] = useState(true);

  // Active examination state
  const [activeKunjunganId, setActiveKunjunganId] = useState(initialKunjunganId || null);
  const [activeData, setActiveData] = useState(null);
  const [loadingExam, setLoadingExam] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Lookups (Tindakan, Obat, ICD10)
  const [lookups, setLookups] = useState({
    tindakan: [],
    obat: [],
    icd10: [],
  });

  // Examination Form States
  const [vitalData, setVitalData] = useState({
    tekanan_darah: '',
    suhu: '',
    nadi: '',
    berat_badan: '',
    tinggi_badan: '',
  });

  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    edukasi: '',
  });

  const [diagnosaList, setDiagnosaList] = useState([
    { kode_icd10: '', diagnosa: '', jenis: 'primer' }
  ]);

  const [tindakanList, setTindakanList] = useState([]);
  const [resepList, setResepList] = useState([]);
  const [resepCatatan, setResepCatatan] = useState('');

  // Load lookups & antrean
  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchAntrean();
  }, [selectedDate, filterPoli]);

  useEffect(() => {
    if (activeKunjunganId) {
      loadExamData(activeKunjunganId);
    } else {
      setActiveData(null);
    }
  }, [activeKunjunganId]);

  const fetchLookups = async () => {
    try {
      const res = await api.get('/pelayanan/lookups');
      if (res && res.success) {
        setLookups(res);
      }
    } catch (err) {
      console.error('Error fetching pelayanan lookups:', err);
    }
  };

  const fetchAntrean = async () => {
    setLoadingAntrean(true);
    try {
      let url = `/pelayanan/antrean?tgl=${selectedDate}`;
      if (filterPoli) url += `&poli_id=${filterPoli}`;
      const res = await api.get(url);
      if (res && res.data) {
        setAntreanList(res.data);
      }
    } catch (err) {
      console.error('Error fetching antrean pelayanan:', err);
    } finally {
      setLoadingAntrean(false);
    }
  };

  const loadExamData = async (kunjunganId) => {
    setLoadingExam(true);
    try {
      const res = await api.get(`/pelayanan/periksa/${kunjunganId}`);
      if (res && res.success) {
        setActiveData(res);

        // Populate Vital signs
        const rm = res.rekam_medis || {};
        setVitalData({
          tekanan_darah: rm.tekanan_darah || '',
          suhu: rm.suhu || '',
          nadi: rm.nadi || '',
          berat_badan: rm.berat_badan || '',
          tinggi_badan: rm.tinggi_badan || '',
        });

        // Populate SOAP
        setSoapData({
          subjective: rm.subjective || res.kunjungan.keluhan_awal || '',
          objective: rm.objective || '',
          assessment: rm.assessment || '',
          plan: rm.plan || '',
          edukasi: rm.edukasi || '',
        });

        // Populate Diagnosa
        if (res.diagnosa && res.diagnosa.length > 0) {
          setDiagnosaList(res.diagnosa.map(d => ({
            kode_icd10: d.kode_icd10 || '',
            diagnosa: d.diagnosa || '',
            jenis: d.jenis || 'primer',
          })));
        } else {
          setDiagnosaList([{ kode_icd10: '', diagnosa: '', jenis: 'primer' }]);
        }

        // Populate Tindakan
        if (res.tindakan && res.tindakan.length > 0) {
          setTindakanList(res.tindakan.map(t => ({
            tindakan_id: t.tindakan_id,
            qty: t.qty || 1,
            nama: t.nama_tindakan,
            tarif: t.tarif,
          })));
        } else {
          setTindakanList([]);
        }

        // Populate Resep
        if (res.resep && res.resep.items && res.resep.items.length > 0) {
          setResepList(res.resep.items.map(r => ({
            obat_id: r.obat_id,
            qty: r.qty || 1,
            dosis: r.dosis || '',
            aturan_pakai: r.aturan_pakai || '',
          })));
          setResepCatatan(res.resep.catatan || '');
        } else {
          setResepList([]);
          setResepCatatan('');
        }
      }
    } catch (err) {
      console.error('Error loading examination data:', err);
      showToast('Gagal memuat lembar periksa: ' + err.message);
    } finally {
      setLoadingExam(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // BMI Calculation
  const calculateBmi = () => {
    const bb = parseFloat(vitalData.berat_badan);
    const tb = parseFloat(vitalData.tinggi_badan) / 100;
    if (bb > 0 && tb > 0) {
      const bmi = (bb / (tb * tb)).toFixed(1);
      let ket = 'Normal';
      if (bmi < 18.5) ket = 'Kurang';
      else if (bmi >= 25 && bmi < 30) ket = 'Kelebihan';
      else if (bmi >= 30) ket = 'Obesitas';
      return `${bmi} (${ket})`;
    }
    return '-';
  };

  // Diagnosa row handlers
  const handleAddDiagnosa = () => {
    setDiagnosaList([...diagnosaList, { kode_icd10: '', diagnosa: '', jenis: 'sekunder' }]);
  };

  const handleRemoveDiagnosa = (idx) => {
    setDiagnosaList(diagnosaList.filter((_, i) => i !== idx));
  };

  const handleSelectCommonIcd = (idx, icd) => {
    const next = [...diagnosaList];
    next[idx].kode_icd10 = icd.kode;
    next[idx].diagnosa = icd.nama;
    setDiagnosaList(next);
  };

  // Tindakan row handlers
  const handleAddTindakan = (tindakanId) => {
    if (!tindakanId) return;
    const item = lookups.tindakan.find(t => t.id === parseInt(tindakanId, 10));
    if (!item) return;

    const exists = tindakanList.find(t => t.tindakan_id === item.id);
    if (exists) {
      setTindakanList(tindakanList.map(t => t.tindakan_id === item.id ? { ...t, qty: t.qty + 1 } : t));
    } else {
      const hj = parseFloat(item.harga_jual || 0);
      const base = parseFloat(item.tarif || 0);
      const tarif = hj > 0 ? hj : Math.round(base * 1.4);
      setTindakanList([...tindakanList, { tindakan_id: item.id, nama: item.nama, tarif, qty: 1 }]);
    }
  };

  const handleRemoveTindakan = (idx) => {
    setTindakanList(tindakanList.filter((_, i) => i !== idx));
  };

  // Resep row handlers
  const handleAddResep = (obatId) => {
    if (!obatId) return;
    const item = lookups.obat.find(o => o.id === parseInt(obatId, 10));
    if (!item) return;

    const exists = resepList.find(r => r.obat_id === item.id);
    if (exists) {
      setResepList(resepList.map(r => r.obat_id === item.id ? { ...r, qty: r.qty + 1 } : r));
    } else {
      setResepList([...resepList, {
        obat_id: item.id,
        nama: item.nama,
        satuan: item.satuan_nama || 'Pcs',
        stok: item.stok,
        qty: 10,
        dosis: '1 tab',
        aturan_pakai: '3 x 1 sehari sesudah makan'
      }]);
    }
  };

  const handleRemoveResep = (idx) => {
    setResepList(resepList.filter((_, i) => i !== idx));
  };

  // Submit Examination Form
  const handleSubmitExam = async (aksi) => {
    if (!activeKunjunganId) return;

    // Filter valid diagnoses
    const validDiag = diagnosaList.filter(d => d.diagnosa && d.diagnosa.trim() !== '');

    setSavingExam(true);
    try {
      const payload = {
        aksi,
        ...vitalData,
        ...soapData,
        diagnosa: validDiag,
        tindakan: tindakanList.map(t => ({ tindakan_id: t.tindakan_id, qty: t.qty })),
        resep: resepList.map(r => ({
          obat_id: r.obat_id,
          qty: r.qty,
          dosis: r.dosis,
          aturan_pakai: r.aturan_pakai,
        })),
        resep_catatan: resepCatatan,
      };

      const res = await api.post(`/pelayanan/periksa/${activeKunjunganId}`, payload);
      showToast(res.message);

      if (aksi === 'selesai') {
        setActiveKunjunganId(null);
        fetchAntrean();
        if (onExamCompleted) onExamCompleted();
      } else {
        loadExamData(activeKunjunganId);
      }
    } catch (err) {
      showToast('Gagal menyimpan pemeriksaan: ' + err.message);
    } finally {
      setSavingExam(false);
    }
  };

  const calculateAge = (dateStr) => {
    if (!dateStr) return '-';
    const birth = new Date(dateStr);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return `${age} th`;
  };

  // ===================== RENDER: ANTREAN LIST MODE =====================
  if (!activeKunjunganId) {
    return (
      <div className="pelayanan-antrean-view">
        {toastMessage && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            <AppIcon name="check" style={{ marginRight: 8 }} /> {toastMessage}
          </div>
        )}

        {/* Toolbar */}
        <div className="page-toolbar">
          <div>
            <div className="pt-title">Pelayanan Medis</div>
            <div className="pt-sub">
              {(() => {
                const d = new Date(selectedDate);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
              })()} &middot; {antreanList.length} antrian pemeriksaan
            </div>
          </div>
          <div className="pt-actions">
            <div className="toolbar-filter">
              <span className="ico"><AppIcon name="calendar" /></span>
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Main Queue Table */}
        <div className="table-wrap">
          <DataTableWrapper
            columns={[
              {
                key: 'no_antrian',
                label: 'ANTRIAN',
                render: (a) => <b>{a.poli_kode}-{String(a.no_antrian).padStart(3, '0')}</b>,
              },
              {
                key: 'no_mr',
                label: 'NO. MR',
                render: (a) => <b>{a.no_mr}</b>,
              },
              {
                key: 'pasien_nama',
                label: 'PASIEN',
                render: (a) => (
                  <>
                    <div style={{ fontWeight: 600 }}>{a.pasien_nama}</div>
                    <small style={{ color: 'var(--muted)' }}>
                      {a.pasien_jk === 'L' ? 'L' : 'P'} &middot; {calculateAge(a.pasien_tgl_lahir)}
                    </small>
                    {a.pasien_alergi && (
                      <span className="badge badge-red" style={{ marginLeft: 6 }}>
                        Alergi: {a.pasien_alergi}
                      </span>
                    )}
                  </>
                ),
              },
              {
                key: 'poli_nama',
                label: 'POLI',
                render: (a) => a.poli_nama,
              },
              {
                key: 'dokter_nama',
                label: 'DOKTER',
                render: (a) => a.dokter_nama || '-',
              },
              {
                key: 'keluhan_awal',
                label: 'KELUHAN',
                render: (a) => a.keluhan_awal || '-',
              },
              {
                key: 'status',
                label: 'STATUS',
                render: (a) => {
                  const badgeMap = {
                    menunggu: 'badge-orange',
                    periksa: 'badge-blue',
                    penunjang: 'badge-blue',
                    billing: 'badge-orange',
                    pembayaran: 'badge-blue',
                    selesai: 'badge-green',
                  };
                  return (
                    <span className={`badge ${badgeMap[a.status] || 'badge-gray'}`}>
                      {a.status === 'menunggu' ? 'Menunggu' : a.status === 'periksa' ? 'Periksa' : a.status}
                    </span>
                  );
                },
              },
              {
                key: 'aksi',
                label: 'AKSI',
                sortable: false,
                thClassName: 'col-actions',
                className: 'cell-actions',
                render: (a) => (
                  <div className="cell-actions-inner">
                    <button
                      type="button"
                      className={`btn btn-sm ${a.status === 'periksa' ? '' : 'btn-light'}`}
                      onClick={() => setActiveKunjunganId(a.id)}
                    >
                      {a.status === 'periksa' ? 'Lanjutkan Periksa' : 'Periksa'}
                    </button>
                  </div>
                ),
              },
            ]}
            data={antreanList}
            defaultPageSize={25}
            emptyText="Belum ada data"
            rowKey="id"
          />
        </div>
      </div>
    );
  }

  // ===================== RENDER: ACTIVE EXAMINATION MODE =====================
  if (loadingExam || !activeData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        Memuat lembar rekam medis pasien...
      </div>
    );
  }

  const { kunjungan: kj, riwayat_terdahulu: riwayat } = activeData;

  return (
    <div className="pelayanan-periksa-view">
      {toastMessage && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <AppIcon name="check" style={{ marginRight: 8 }} /> {toastMessage}
        </div>
      )}

      {/* Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <button className="btn btn-light btn-sm" onClick={() => setActiveKunjunganId(null)}>
          &larr; Kembali ke Antrean
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-light btn-sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Sembunyikan Riwayat' : `Riwayat Pasien (${riwayat.length})`}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={savingExam}
            onClick={() => handleSubmitExam('simpan')}
          >
            <AppIcon name="save" /> Simpan Draf
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={savingExam}
            onClick={() => handleSubmitExam('selesai')}
          >
            <AppIcon name="check" /> Selesai Pemeriksaan
          </button>
        </div>
      </div>

      {/* Patient Header Banner */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16, background: 'var(--surface-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {kj.pasien_nama}
              <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>
                No. MR: <b style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{kj.no_mr}</b> &middot; {kj.pasien_jk === 'L' ? 'Laki-laki' : 'Perempuan'} &middot; {calculateAge(kj.pasien_tgl_lahir)}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              Poli: <b>{kj.poli_nama}</b> &middot; Dokter: <b>{kj.dokter_nama || '-'}</b> &middot; No. Kunjungan: <span style={{ fontFamily: 'monospace' }}>{kj.no_kunjungan}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
              {kj.poli_kode}-{String(kj.no_antrian).padStart(3, '0')}
            </span>
            {kj.pasien_alergi && (
              <div style={{ marginTop: 4 }}>
                <span className="badge badge-red">
                  Alergi: {kj.pasien_alergi}
                </span>
              </div>
            )}
          </div>
        </div>
        {kj.keluhan_awal && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>Keluhan Awal Pasien:</span> <b>{kj.keluhan_awal}</b>
          </div>
        )}
      </div>

      {/* Riwayat Pasien Terdahulu Panel */}
      {showHistory && (
        <div className="card" style={{ padding: 16, marginBottom: 16, borderLeft: '4px solid var(--accent-purple, #8b5cf6)' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>Riwayat Kunjungan & Rekam Medis Terdahulu</h4>
          {riwayat.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Tidak ada catatan kunjungan terdahulu untuk pasien ini.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {riwayat.map((r, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>{r.tgl_kunjungan} &middot; {r.poli_nama}</span>
                    <span style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{r.no_kunjungan}</span>
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: 4 }}>
                    TD: <b>{r.tekanan_darah || '-'}</b> &middot; Suhu: <b>{r.suhu ? `${r.suhu} °C` : '-'}</b>
                  </div>
                  {r.assessment && (
                    <div style={{ marginTop: 2 }}>Diagnosa/Assesment: <i>{r.assessment}</i></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WORKSTATION GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>

        {/* PANEL 1: TANDA VITAL (VITAL SIGNS) */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, borderBottom: '2px solid var(--primary)', paddingBottom: 6, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppIcon name="activity" /> 1. Tanda-Tanda Vital (Vital Signs)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Tekanan Darah (mmHg)</label>
              <input
                type="text"
                className="form-control"
                placeholder="120/80"
                value={vitalData.tekanan_darah}
                onChange={(e) => setVitalData({ ...vitalData, tekanan_darah: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Suhu Tubuh (°C)</label>
              <input
                type="text"
                className="form-control"
                placeholder="36.5"
                value={vitalData.suhu}
                onChange={(e) => setVitalData({ ...vitalData, suhu: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Denyut Nadi (x/mnt)</label>
              <input
                type="text"
                className="form-control"
                placeholder="80"
                value={vitalData.nadi}
                onChange={(e) => setVitalData({ ...vitalData, nadi: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Berat Badan (kg)</label>
              <input
                type="text"
                className="form-control"
                placeholder="60"
                value={vitalData.berat_badan}
                onChange={(e) => setVitalData({ ...vitalData, berat_badan: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Tinggi Badan (cm)</label>
              <input
                type="text"
                className="form-control"
                placeholder="165"
                value={vitalData.tinggi_badan}
                onChange={(e) => setVitalData({ ...vitalData, tinggi_badan: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Indeks Massa Tubuh (BMI)</label>
              <input
                type="text"
                className="form-control"
                readOnly
                value={calculateBmi()}
                style={{ background: 'var(--surface-subtle)', fontWeight: 600 }}
              />
            </div>
          </div>
        </div>

        {/* PANEL 2: CATATAN REKAM MEDIS (SOAP) */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, borderBottom: '2px solid var(--accent-blue, #3b82f6)', paddingBottom: 6, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppIcon name="rekam" /> 2. Rekam Medis (SOAP)
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="form-group">
              <label><b>S</b> &mdash; Anamnesis / Keluhan Pasien (Subjective)</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Keluhan utama, riwayat penyakit sekarang..."
                value={soapData.subjective}
                onChange={(e) => setSoapData({ ...soapData, subjective: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label><b>O</b> &mdash; Pemeriksaan Fisik (Objective)</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Temuan fisik, auskultasi, palpasi, inspeksi..."
                value={soapData.objective}
                onChange={(e) => setSoapData({ ...soapData, objective: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label><b>A</b> &mdash; Analisis / Diagnosis Klinis (Assessment)</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Kesimpulan analisa klinis dokter..."
                value={soapData.assessment}
                onChange={(e) => setSoapData({ ...soapData, assessment: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label><b>P</b> &mdash; Rencana Terapi & Tatalaksana (Plan)</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Rencana pengobatan, tindakan, edukasi..."
                value={soapData.plan}
                onChange={(e) => setSoapData({ ...soapData, plan: e.target.value })}
              />
            </div>
          </div>
        </div>

      </div>

      {/* PANEL 3: DIAGNOSA ICD-10 & TINDAKAN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 16 }}>

        {/* Diagnosa ICD-10 */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--accent-orange, #f59e0b)', paddingBottom: 6, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              3. Diagnosa ICD-10
            </div>
            <button type="button" className="btn btn-sm btn-light" onClick={handleAddDiagnosa}>
              + Tambah Diagnosa
            </button>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {diagnosaList.map((d, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 90 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ICD-10"
                    value={d.kode_icd10}
                    onChange={(e) => {
                      const next = [...diagnosaList];
                      next[idx].kode_icd10 = e.target.value;
                      setDiagnosaList(next);
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nama diagnosa..."
                    value={d.diagnosa}
                    onChange={(e) => {
                      const next = [...diagnosaList];
                      next[idx].diagnosa = e.target.value;
                      setDiagnosaList(next);
                    }}
                  />
                </div>
                <div style={{ width: 100 }}>
                  <select
                    className="form-control"
                    value={d.jenis}
                    onChange={(e) => {
                      const next = [...diagnosaList];
                      next[idx].jenis = e.target.value;
                      setDiagnosaList(next);
                    }}
                  >
                    <option value="primer">Primer</option>
                    <option value="sekunder">Sekunder</option>
                  </select>
                </div>
                {diagnosaList.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger btn-icon"
                    onClick={() => handleRemoveDiagnosa(idx)}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Quick ICD-10 Suggestions */}
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>Pilihan Diagnosa Cepat: </span>
            {lookups.icd10.slice(0, 5).map((icd) => (
              <button
                key={icd.kode}
                type="button"
                className="badge badge-gray"
                style={{ cursor: 'pointer', margin: '2px 4px', border: 'none' }}
                onClick={() => handleSelectCommonIcd(diagnosaList.length - 1, icd)}
              >
                {icd.kode} ({icd.nama.split(' ')[0]})
              </button>
            ))}
          </div>
        </div>

        {/* Tindakan Medis */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, borderBottom: '2px solid var(--accent-green, #10b981)', paddingBottom: 6, marginBottom: 14 }}>
            4. Tindakan & Layanan Medis
          </div>

          <div style={{ marginBottom: 12 }}>
            <select
              className="form-control"
              onChange={(e) => {
                handleAddTindakan(e.target.value);
                e.target.value = '';
              }}
            >
              <option value="">+ Pilih Tindakan untuk Ditambahkan</option>
              {lookups.tindakan.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama} &mdash; Rp {Number(t.harga_jual || t.tarif * 1.4).toLocaleString('id-ID')}
                </option>
              ))}
            </select>
          </div>

          {tindakanList.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '16px' }}>
              Belum ada tindakan medis dipilih.
            </div>
          ) : (
            <table className="datatable" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Tindakan</th>
                  <th style={{ width: 60 }}>Qty</th>
                  <th>Tarif</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {tindakanList.map((t, idx) => (
                  <tr key={idx}>
                    <td><b>{t.nama}</b></td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        style={{ width: 55, padding: '2px 6px' }}
                        value={t.qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          const next = [...tindakanList];
                          next[idx].qty = val;
                          setTindakanList(next);
                        }}
                      />
                    </td>
                    <td>Rp {(t.tarif * t.qty).toLocaleString('id-ID')}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger btn-icon"
                        onClick={() => handleRemoveTindakan(idx)}
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* PANEL 4: E-RESEP (ELECTRONIC PRESCRIPTION) */}
      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, borderBottom: '2px solid var(--primary)', paddingBottom: 6, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppIcon name="pills" /> 5. Resep Elektronik (E-Prescription) &mdash; Diteruskan ke Farmasi
        </div>

        <div style={{ marginBottom: 14 }}>
          <select
            className="form-control"
            onChange={(e) => {
              handleAddResep(e.target.value);
              e.target.value = '';
            }}
          >
            <option value="">+ Pilih Obat untuk Ditambahkan ke Resep</option>
            {lookups.obat.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nama} (Stok: {o.stok} {o.satuan_nama || 'Pcs'}) &mdash; Rp {Number(o.harga_jual || o.harga_beli * 1.4).toLocaleString('id-ID')}
              </option>
            ))}
          </select>
        </div>

        {resepList.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '16px' }}>
            Belum ada resep obat. Pasien tidak diberikan obat resep (langsung ke kasir/billing setelah periksa).
          </div>
        ) : (
          <div className="table-wrap">
            <table className="datatable" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Nama Obat & Sediaan</th>
                  <th style={{ width: 80 }}>Jumlah</th>
                  <th>Dosis</th>
                  <th>Aturan Pakai</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {resepList.map((r, idx) => (
                  <tr key={idx}>
                    <td>
                      <b>{r.nama || (lookups.obat.find(o => o.id === r.obat_id)?.nama)}</b>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        style={{ width: 70 }}
                        value={r.qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          const next = [...resepList];
                          next[idx].qty = val;
                          setResepList(next);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Contoh: 500 mg"
                        value={r.dosis}
                        onChange={(e) => {
                          const next = [...resepList];
                          next[idx].dosis = e.target.value;
                          setResepList(next);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Contoh: 3 x 1 tablet sesudah makan"
                        value={r.aturan_pakai}
                        onChange={(e) => {
                          const next = [...resepList];
                          next[idx].aturan_pakai = e.target.value;
                          setResepList(next);
                        }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger btn-icon"
                        onClick={() => handleRemoveResep(idx)}
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="form-group" style={{ marginTop: 14 }}>
          <label>Catatan Tambahan untuk Petugas Farmasi / Pasien</label>
          <input
            type="text"
            className="form-control"
            placeholder="Contoh: Diminum jika demam, hindari makanan berlemak..."
            value={resepCatatan}
            onChange={(e) => setResepCatatan(e.target.value)}
          />
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          className="btn btn-light"
          onClick={() => setActiveKunjunganId(null)}
          disabled={savingExam}
        >
          Kembali
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => handleSubmitExam('simpan')}
          disabled={savingExam}
        >
          <AppIcon name="save" /> {savingExam ? 'Menyimpan...' : 'Simpan Draf Pemeriksaan'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => handleSubmitExam('selesai')}
          disabled={savingExam}
        >
          <AppIcon name="check" /> {savingExam ? 'Menyimpan...' : 'Selesai & Teruskan'}
        </button>
      </div>

    </div>
  );
}
