import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';
import { useI18n } from '../i18n';

export default function RekamMedisView({ 
  initialPasienId = null, 
  initialKunjunganId = null, 
  onNavigatePatient = null, 
  onNavigateDetail = null, 
  onNavigateToExam = null 
}) {
  const { t, trans, formatTgl, formatStatus, formatGender } = useI18n();

  // State for Tier 1: Patient List
  const [pasienList, setPasienList] = useState([]);
  const [loadingPasien, setLoadingPasien] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // State for Tier 2: Selected Patient History
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);
  const [patientDiagnoses, setPatientDiagnoses] = useState([]);

  // State for Tier 3: Full Page Medical Record Detail
  const [activeDetailKunjunganId, setActiveDetailKunjunganId] = useState(() => initialKunjunganId);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [rmeData, setRmeData] = useState(null);

  useEffect(() => {
    fetchPasien();
  }, []);

  useEffect(() => {
    if (initialPasienId) {
      handleSelectPatient(initialPasienId, false);
    } else {
      setSelectedPatient(null);
    }
  }, [initialPasienId]);

  useEffect(() => {
    if (initialKunjunganId) {
      handleOpenDetail(initialKunjunganId, false);
    } else {
      setActiveDetailKunjunganId(null);
      setRmeData(null);
    }
  }, [initialKunjunganId]);

  const fetchPasien = async (query = searchQuery) => {
    setLoadingPasien(true);
    try {
      const q = encodeURIComponent(query.trim());
      const res = await api.get(`/pasien${q ? `?q=${q}` : ''}`);
      if (res && res.data) {
        setPasienList(res.data);
        setTotalCount(res.total || res.data.length);
      }
    } catch (err) {
      console.error('Error fetching pasien for RME:', err);
    } finally {
      setLoadingPasien(false);
    }
  };

  const handleSelectPatient = async (pasienId, notify = true) => {
    setLoadingHistory(true);
    if (notify && onNavigatePatient) {
      onNavigatePatient(pasienId);
    }
    try {
      const res = await api.get(`/pasien/${pasienId}`);
      if (res && res.success) {
        setSelectedPatient(res.data);
        setPatientHistory(res.riwayat_kunjungan || []);

        // Extract diagnoses from visits if available
        const diagMap = new Map();
        (res.riwayat_kunjungan || []).forEach(k => {
          if (k.diagnosa) {
            diagMap.set(k.diagnosa, k.diagnosa);
          }
        });
        setPatientDiagnoses(Array.from(diagMap.values()));
      }
    } catch (err) {
      console.error('Error loading patient history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenDetail = async (kunjunganId, notify = true) => {
    setActiveDetailKunjunganId(kunjunganId);
    setLoadingDetail(true);
    if (notify && onNavigateDetail) {
      onNavigateDetail(kunjunganId);
    }
    try {
      const res = await api.get(`/rekam-medis/${kunjunganId}`);
      if (res && res.success) {
        setRmeData(res);
        if (!selectedPatient && res.kunjungan?.pasien_id) {
          handleSelectPatient(res.kunjungan.pasien_id, false);
        }
      }
    } catch (err) {
      console.error('Error fetching detail RME:', err);
    } finally {
      setLoadingDetail(false);
    }
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
    return `${age} ${trans('tahun', 'years old')}`;
  };

  const badgeMap = {
    menunggu: 'badge-orange',
    periksa: 'badge-blue',
    penunjang: 'badge-blue',
    farmasi: 'badge-blue',
    billing: 'badge-blue',
    pembayaran: 'badge-orange',
    selesai: 'badge-green',
    batal: 'badge-red',
  };

  // =========================================================================
  // VIEW 3: Detail Rekam Medis (SOAP) Full Page (matching detail.php)
  // =========================================================================
  if (activeDetailKunjunganId) {
    const kj = rmeData?.kunjungan;
    const rm = rmeData?.rekam_medis;
    const diagnosa = rmeData?.diagnosa || [];
    const tindakan = rmeData?.tindakan || [];
    const lab = rmeData?.lab || [];
    const rad = rmeData?.radiologi || [];
    const resep = rmeData?.resep;

    return (
      <div className="rekam-medis-detail-view">
        {/* Top Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <button 
            type="button" 
            className="btn btn-light btn-sm"
            onClick={() => {
              setActiveDetailKunjunganId(null);
              setRmeData(null);
              if (onNavigateDetail) onNavigateDetail(null);
            }}
          >
            <AppIcon name="arrowleft" /> {trans('Riwayat Pasien', 'Patient History')}
          </button>
          <button 
            type="button" 
            className="btn btn-light btn-sm"
            onClick={() => window.print()}
          >
            <AppIcon name="print" /> {trans('Cetak', 'Print')}
          </button>
        </div>

        {loadingDetail ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            {trans('Memuat data rekam medis...', 'Loading medical record...')}
          </div>
        ) : !rmeData || !kj ? (
          <div className="alert alert-warning" style={{ marginTop: 14 }}>
            {trans('Data rekam medis belum tersedia untuk kunjungan ini.', 'Medical record is not available for this visit.')}
          </div>
        ) : (
          <>
            {/* Header Identitas Pasien & Kunjungan */}
            <div className="card" style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {kj.pasien_nama || kj.pasien || selectedPatient?.nama || '-'}
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: 4 }}>
                    {trans('No. MR', 'MR No.')} <b>{kj.no_mr || selectedPatient?.no_mr}</b> &middot; {formatGender(kj.pasien_jk || kj.jenis_kelamin || selectedPatient?.jenis_kelamin, true)} &middot; {calculateAge(kj.pasien_tgl_lahir || kj.tgl_lahir || selectedPatient?.tgl_lahir)}
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: 2 }}>
                    {formatDate(kj.tgl_kunjungan)} &middot; {kj.poli_nama || kj.poli || '-'} &middot; {kj.dokter_nama || kj.dokter || '-'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-blue">{kj.no_kunjungan}</span>
                  {(kj.pasien_alergi || kj.alergi || selectedPatient?.alergi) && (
                    <div style={{ marginTop: 6 }}>
                      <span className="badge badge-red">
                        <AppIcon name="alert" /> {trans('Alergi:', 'Allergy:')} {kj.pasien_alergi || kj.alergi || selectedPatient?.alergi}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!rm ? (
              <div className="alert alert-warning" style={{ marginTop: 14 }}>
                {trans('Pemeriksaan dokter (SOAP) belum diinput pada kunjungan ini.', 'Doctor exam (SOAP) has not been entered for this visit.')}
              </div>
            ) : (
              <>
                {/* 1. Tanda Vital */}
                <div className="card" style={{ marginTop: 14 }}>
                  <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>{trans('Tanda Vital', 'Vital Signs')}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, color: 'var(--muted)' }}>
                    <div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{trans('Tekanan Darah', 'Blood Pressure')}</div>
                      <b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.tekanan_darah || '-'}</b>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{trans('Suhu', 'Temperature')}</div>
                      <b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.suhu ? `${rm.suhu} °C` : '- °C'}</b>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{trans('Nadi', 'Pulse')}</div>
                      <b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.nadi ? `${rm.nadi} x/mnt` : '- x/mnt'}</b>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{trans('Berat', 'Weight')}</div>
                      <b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.berat_badan ? `${rm.berat_badan} kg` : '- kg'}</b>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{trans('Tinggi', 'Height')}</div>
                      <b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.tinggi_badan ? `${rm.tinggi_badan} cm` : '- cm'}</b>
                    </div>
                  </div>
                </div>

                {/* 2. Detail Rekam Medis (SOAP) */}
                <div className="card" style={{ marginTop: 14 }}>
                  <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>{trans('Detail Rekam Medis (SOAP)', 'Medical Record Detail (SOAP)')}</h3>
                  <div className="form-row">
                    <div>
                      <b>S — Subjective</b>
                      <p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '6px 0 0' }}>{rm.subjective || '-'}</p>
                    </div>
                    <div>
                      <b>O — Objective</b>
                      <p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '6px 0 0' }}>{rm.objective || '-'}</p>
                    </div>
                  </div>
                  <div className="form-row" style={{ marginTop: 14 }}>
                    <div>
                      <b>A — Assessment</b>
                      <p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '6px 0 0' }}>{rm.assessment || '-'}</p>
                    </div>
                    <div>
                      <b>P — Plan</b>
                      <p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '6px 0 0' }}>{rm.plan || '-'}</p>
                    </div>
                  </div>
                  {rm.edukasi && (
                    <div style={{ marginTop: 14 }}>
                      <b>{trans('Edukasi Pasien', 'Patient Education')}</b>
                      <p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>{rm.edukasi}</p>
                    </div>
                  )}
                </div>

                {/* 3 & 4. Diagnosa & Medical Service Row */}
                <div className="form-row" style={{ marginTop: 14 }}>
                  <div className="card">
                    <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>{trans('Diagnosa (ICD-10)', 'Diagnosis (ICD-10)')}</h3>
                    {diagnosa.length === 0 ? (
                      <p style={{ color: 'var(--muted)', margin: 0 }}>-</p>
                    ) : (
                      diagnosa.map((d, i) => (
                        <div key={i} style={{ padding: '8px 0', borderBottom: i < diagnosa.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <span className={`badge ${d.jenis === 'primer' ? 'badge-blue' : 'badge-gray'}`} style={{ marginRight: 8 }}>
                            {d.jenis === 'primer' ? trans('Primer', 'Primary') : (d.jenis === 'sekunder' ? trans('Sekunder', 'Secondary') : (d.jenis || trans('Diagnosa', 'Diagnosis')))}
                          </span>
                          {d.kode_icd10 && <code>{d.kode_icd10} </code>}
                          {d.diagnosa}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="card">
                    <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>{trans('Medical Service (ICD-9-CM)', 'Medical Service (ICD-9-CM)')}</h3>
                    {tindakan.length === 0 ? (
                      <p style={{ color: 'var(--muted)', margin: 0 }}>-</p>
                    ) : (
                      tindakan.map((t, i) => (
                        <div key={i} style={{ padding: '8px 0', borderBottom: i < tindakan.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{t.nama_tindakan || t.tindakan_nama}</span>
                          <span style={{ color: 'var(--muted)' }}>x{t.qty || 1}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4.5. Lab & Radiologi Row */}
                {(lab.length > 0 || rad.length > 0) && (
                  <div className="form-row" style={{ marginTop: 14 }}>
                    <div className="card">
                      <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>{trans('Hasil Lab', 'Lab Results')}</h3>
                      {lab.length === 0 ? (
                        <p style={{ color: 'var(--muted)', margin: 0 }}>-</p>
                      ) : (
                        <table style={{ width: '100%', fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', paddingBottom: 6 }}>{trans('Pemeriksaan', 'Examination')}</th>
                              <th style={{ textAlign: 'left', paddingBottom: 6 }}>{trans('Hasil', 'Result')}</th>
                              <th style={{ textAlign: 'left', paddingBottom: 6 }}>{trans('Nilai Rujukan', 'Reference Value')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lab.map((l, idx) => (
                              <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                                <td style={{ padding: '6px 0' }}>
                                  {l.nama} {Number(l.qty) > 1 && <span style={{ color: 'var(--muted)' }}>x{l.qty}</span>}
                                </td>
                                <td style={{ padding: '6px 0' }}><b>{l.hasil || '-'}</b></td>
                                <td style={{ padding: '6px 0', color: 'var(--muted)' }}>{l.nilai_rujukan || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div className="card">
                      <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>{trans('Hasil Radiologi', 'Radiology Results')}</h3>
                      {rad.length === 0 ? (
                        <p style={{ color: 'var(--muted)', margin: 0 }}>-</p>
                      ) : (
                        rad.map((r, idx) => (
                          <div key={idx} style={{ padding: '8px 0', borderBottom: idx < rad.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <b>{r.nama}</b> {Number(r.qty) > 1 && <span style={{ color: 'var(--muted)' }}>x{r.qty}</span>}
                            <div style={{ color: 'var(--muted)', marginTop: 2 }}>{r.hasil || '-'}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Resep Obat */}
                {resep && ((resep.items && resep.items.length > 0) || (Array.isArray(resep) && resep.length > 0)) && (
                  <div className="card" style={{ marginTop: 14 }}>
                    <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>{trans('Resep Obat', 'Prescription')}</h3>
                    <table className="datatable dt-noscroll" style={{ width: '100%', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th>{trans('Nama Obat', 'Medicine Name')}</th>
                          <th>Qty</th>
                          <th>{trans('Dosis', 'Dosage')}</th>
                          <th>{trans('Aturan Pakai', 'Instructions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(resep.items || resep).map((item, idx) => (
                          <tr key={idx}>
                            <td><b>{item.obat_nama || item.nama}</b></td>
                            <td>{item.qty} {item.satuan_nama || ''}</td>
                            <td>{item.dosis || '-'}</td>
                            <td>{item.aturan_pakai || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Patient Visit History (pasien.php)
  // =========================================================================
  if (selectedPatient) {
    return (
      <div className="rekam-medis-pasien">
        <div style={{ marginBottom: 14 }}>
          <button 
            type="button" 
            className="btn btn-light btn-sm"
            onClick={() => {
              setSelectedPatient(null);
              if (onNavigatePatient) onNavigatePatient(null);
            }}
          >
            <AppIcon name="arrowleft" /> {trans('Daftar Pasien', 'Patient List')}
          </button>
        </div>

        {/* Card Identitas Pasien */}
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 'var(--fs-title)', fontWeight: 700 }}>{selectedPatient.nama}</div>
              <div style={{ color: 'var(--muted)', marginTop: 4 }}>
                {trans('No. MR', 'MR No.')} <b>{selectedPatient.no_mr}</b> &middot; {selectedPatient.jenis_kelamin === 'L' ? trans('Laki-laki', 'Male') : trans('Perempuan', 'Female')} &middot; {calculateAge(selectedPatient.tgl_lahir)} &middot; {selectedPatient.kelompok_nama || trans('Umum', 'Self-pay')}
              </div>
              <div style={{ color: 'var(--muted)' }}>
                {formatDate(selectedPatient.tgl_lahir)} &middot; {selectedPatient.telepon || '-'}
                {selectedPatient.gol_darah && selectedPatient.gol_darah !== '-' && (
                  <span> &middot; {trans('Gol. Darah', 'Blood Type')} {selectedPatient.gol_darah}</span>
                )}
              </div>
              {selectedPatient.alamat && (
                <div style={{ color: 'var(--muted)', marginTop: 2 }}>{selectedPatient.alamat}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              {selectedPatient.alergi && (
                <span className="badge badge-red"><AppIcon name="alert" /> {trans('Alergi:', 'Allergy:')} {selectedPatient.alergi}</span>
              )}
            </div>
          </div>
        </div>

        {/* Riwayat Diagnosa Ringkas */}
        {patientDiagnoses.length > 0 && (
          <div className="card" style={{ marginTop: 14 }}>
            <h3 style={{ marginBottom: 10, fontSize: 15, fontWeight: 700 }}>{trans('Riwayat Diagnosa', 'Diagnosis History')}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {patientDiagnoses.map((d, idx) => (
                <span key={idx} className="badge badge-blue">{d}</span>
              ))}
            </div>
          </div>
        )}

        {/* Daftar Kunjungan Pasien */}
        <div className="section-title" style={{ marginTop: 20 }}>
          {trans('Riwayat Kunjungan', 'Visit History')} ({patientHistory.length})
        </div>

        <div className="table-wrap">
          <table className="datatable dt-noscroll" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>{trans('Tanggal', 'Date')}</th>
                <th>{trans('No. Kunjungan', 'Visit No.')}</th>
                <th>{trans('Poli', 'Clinic')}</th>
                <th>{trans('Dokter', 'Doctor')}</th>
                <th>{trans('Keluhan / Diagnosa', 'Chief Complaint / Diagnosis')}</th>
                <th>{trans('Status', 'Status')}</th>
                <th className="col-actions">{trans('Aksi', 'Action')}</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                    {trans('Memuat riwayat kunjungan...', 'Loading visit history...')}
                  </td>
                </tr>
              ) : patientHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                    {trans('Belum ada kunjungan tercatat untuk pasien ini.', 'No visits recorded for this patient.')}
                  </td>
                </tr>
              ) : (
                patientHistory.map((k) => (
                  <tr key={k.id}>
                    <td>{formatDate(k.tgl_kunjungan)}</td>
                    <td><b>{k.no_kunjungan}</b></td>
                    <td>{k.poli_nama || '-'}</td>
                    <td>{k.dokter_nama || '-'}</td>
                    <td>{k.diagnosa || k.keluhan_awal || '-'}</td>
                    <td>
                      <span className={`badge ${badgeMap[k.status] || 'badge-gray'}`}>
                        {formatStatus(k.status)}
                      </span>
                    </td>
                    <td className="cell-actions">
                      <div className="cell-actions-inner">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleOpenDetail(k.id)}
                        >
                          {trans('Lihat Detail', 'View Details')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: Patient List (index.php)
  // =========================================================================
  const rekamMedisColumns = [
    {
      key: 'no_mr',
      label: trans('NO. MR', 'MR NO.'),
      render: (row) => <b>{row.no_mr}</b>,
    },
    {
      key: 'nama',
      label: trans('NAMA PASIEN', 'PATIENT NAME'),
    },
    {
      key: 'jenis_kelamin',
      label: trans('L/P', 'GENDER'),
      render: (row) => formatGender(row.jenis_kelamin, true),
    },
    {
      key: 'no_passport',
      label: trans('NO. PASSPORT', 'PASSPORT NO.'),
      render: (row) => row.no_passport || '-',
    },
    {
      key: 'alergi',
      label: trans('ALERGI', 'ALLERGY'),
      render: (row) =>
        row.alergi ? <span className="badge badge-red">{row.alergi}</span> : '-',
    },
    {
      key: 'jml_kunjungan',
      label: trans('JML KUNJUNGAN', 'TOTAL VISITS'),
      render: (row) => Number(row.jml_kunjungan || 0),
    },
    {
      key: 'last_visit',
      label: trans('KUNJUNGAN TERAKHIR', 'LAST VISIT'),
      render: (row) => (row.last_visit ? formatDate(row.last_visit) : '-'),
    },
    {
      key: 'aksi',
      label: trans('AKSI', 'ACTION'),
      sortable: false,
      thClassName: 'col-actions',
      className: 'cell-actions',
      render: (row) => (
        <div className="cell-actions-inner">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleSelectPatient(row.id)}
          >
            <AppIcon name="rekam" /> {trans('Lihat', 'View')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="rekam-medis-view">
      <div className="page-toolbar">
        <div>
          <div className="pt-title">{trans('Rekam Medis Pasien', 'Electronic Medical Records (EMR)')}</div>
          <div className="pt-sub">{pasienList.length} {trans('pasien', 'patients')}</div>
        </div>
      </div>

      <div className="table-wrap">
        <DataTableWrapper
          columns={rekamMedisColumns}
          data={pasienList}
          defaultPageSize={25}
          emptyText={trans('Belum ada data', 'No data available')}
          rowKey="id"
        />
      </div>
    </div>
  );
}
