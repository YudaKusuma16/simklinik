import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';
import { useI18n } from '../i18n';

export default function RekamMedisView({ onNavigateToExam, initialPasienId = null, onNavigatePatient = null }) {
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

  // State for Tier 3: SOAP Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
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

  const handleOpenDetail = async (kunjunganId) => {
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/rekam-medis/${kunjunganId}`);
      if (res && res.success) {
        setRmeData(res);
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

  // ==========================================
  // VIEW 2: Patient Visit History (pasien.php)
  // ==========================================
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

        {/* DETAIL MODAL (detail.php) */}
        {renderDetailModal()}
      </div>
    );
  }

  // ==========================================
  // VIEW 1: Patient List (index.php)
  // ==========================================
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

      {renderDetailModal()}
    </div>
  );

  // ==========================================
  // RENDER MODAL DETAIL (detail.php)
  // ==========================================
  function renderDetailModal() {
    if (!detailModalOpen) return null;

    const kj = rmeData?.kunjungan;
    const rm = rmeData?.rekam_medis;
    const diagnosa = rmeData?.diagnosa || [];
    const tindakan = rmeData?.tindakan || [];
    const resep = rmeData?.resep;

    return (
      <div className="modal-overlay open" role="dialog" aria-modal="true">
        <div className="modal-box modal-lg" style={{ maxWidth: 840 }}>
          <div className="modal-head">
            <div className="modal-title">
              {trans('Detail Rekam Medis (RME)', 'Medical Record Details (EMR)')} &middot; {kj?.no_kunjungan || ''}
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={() => setDetailModalOpen(false)}
            >
              &times;
            </button>
          </div>

          <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                {trans('Memuat data rekam medis...', 'Loading medical record...')}
              </div>
            ) : !rmeData ? (
              <div className="alert alert-warning">
                {trans('Data rekam medis belum tersedia untuk kunjungan ini.', 'Medical record is not yet available for this visit.')}
              </div>
            ) : (
              <>
                {/* Identitas Kunjungan */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 'var(--fs-sub)', fontWeight: 700 }}>{kj.pasien_nama}</div>
                      <div style={{ color: 'var(--muted)' }}>
                        {trans('No. MR', 'MR No.')} <b>{kj.no_mr}</b> &middot; {formatGender(kj.pasien_jk, true)} &middot; {calculateAge(kj.pasien_tgl_lahir)}
                      </div>
                      <div style={{ color: 'var(--muted)' }}>
                        {formatDate(kj.tgl_kunjungan)} &middot; {kj.poli_nama} &middot; {kj.dokter_nama || '-'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-blue">{kj.no_kunjungan}</span>
                      {kj.pasien_alergi && (
                        <div style={{ marginTop: 6 }}>
                          <span className="badge badge-red"><AppIcon name="alert" /> {trans('Alergi:', 'Allergy:')} {kj.pasien_alergi}</span>
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
                    {/* Vital Sign */}
                    <div className="card" style={{ marginTop: 14 }}>
                      <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>{trans('Tanda Vital (Vital Signs)', 'Vital Signs')}</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, color: 'var(--muted)' }}>
                        <div>{trans('Tekanan Darah', 'Blood Pressure')}<br /><b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.tekanan_darah || '-'}</b></div>
                        <div>{trans('Suhu Badan', 'Body Temperature')}<br /><b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.suhu ? `${rm.suhu} °C` : '-'}</b></div>
                        <div>{trans('Nadi', 'Pulse')}<br /><b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.nadi ? `${rm.nadi} x/mnt` : '-'}</b></div>
                        <div>{trans('Berat Badan', 'Weight')}<br /><b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.berat_badan ? `${rm.berat_badan} kg` : '-'}</b></div>
                        <div>{trans('Tinggi Badan', 'Height')}<br /><b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.tinggi_badan ? `${rm.tinggi_badan} cm` : '-'}</b></div>
                      </div>
                    </div>

                    {/* SOAP */}
                    <div className="card" style={{ marginTop: 14 }}>
                      <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>{trans('Rekam Medis (SOAP)', 'Medical Record (SOAP)')}</h3>
                      <div className="form-row">
                        <div><b>{trans('S — Subjective (Keluhan / Anamnesa)', 'S — Subjective (Complaints / Anamnesis)')}</b><p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '4px 0 0' }}>{rm.subjective || '-'}</p></div>
                        <div><b>{trans('O — Objective (Pemeriksaan Fisik)', 'O — Objective (Physical Exam)')}</b><p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '4px 0 0' }}>{rm.objective || '-'}</p></div>
                      </div>
                      <div className="form-row" style={{ marginTop: 12 }}>
                        <div><b>{trans('A — Assessment (Analisa / Diagnosa Kerja)', 'A — Assessment (Working Diagnosis)')}</b><p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '4px 0 0' }}>{rm.assessment || '-'}</p></div>
                        <div><b>{trans('P — Plan (Rencana Terapi / Edukasi)', 'P — Plan (Therapy / Education)')}</b><p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '4px 0 0' }}>{rm.plan || '-'}</p></div>
                      </div>
                      {rm.edukasi && (
                        <div style={{ marginTop: 12 }}>
                          <b>{trans('Edukasi Pasien', 'Patient Education')}</b>
                          <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>{rm.edukasi}</p>
                        </div>
                      )}
                    </div>

                    {/* Diagnosa & Tindakan Row */}
                    <div className="form-row" style={{ marginTop: 14 }}>
                      <div className="card">
                        <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>{trans('Diagnosa ICD-10', 'ICD-10 Diagnosis')}</h3>
                        {diagnosa.length === 0 ? (
                          <p style={{ color: 'var(--muted)', margin: 0 }}>{trans('Tidak ada diagnosa tersimpan.', 'No diagnosis saved.')}</p>
                        ) : (
                          diagnosa.map((d, i) => (
                            <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                              <span className={`badge ${d.jenis === 'primer' ? 'badge-blue' : 'badge-gray'}`} style={{ marginRight: 6 }}>
                                {d.jenis === 'primer' ? trans('Primer', 'Primary') : (d.jenis === 'sekunder' ? trans('Sekunder', 'Secondary') : (d.jenis || trans('Diagnosa', 'Diagnosis')))}
                              </span>
                              {d.kode_icd10 && <code>{d.kode_icd10} </code>}
                              {d.diagnosa}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="card">
                        <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>{trans('Tindakan Medis', 'Medical Procedures')}</h3>
                        {tindakan.length === 0 ? (
                          <p style={{ color: 'var(--muted)', margin: 0 }}>{trans('Tidak ada tindakan medis.', 'No procedures recorded.')}</p>
                        ) : (
                          tindakan.map((t, i) => (
                            <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{t.tindakan_nama}</span>
                              <b>{t.qty}x</b>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Resep Obat */}
                    {resep && resep.items && resep.items.length > 0 && (
                      <div className="card" style={{ marginTop: 14 }}>
                        <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>{trans('Resep Obat', 'Prescription')}</h3>
                        <table className="datatable" style={{ width: '100%', fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th>{trans('Nama Obat', 'Medicine Name')}</th>
                              <th>{trans('Jumlah', 'Qty')}</th>
                              <th>{trans('Dosis', 'Dosage')}</th>
                              <th>{trans('Aturan Pakai', 'Signa / Instructions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resep.items.map((item, idx) => (
                              <tr key={idx}>
                                <td><b>{item.obat_nama}</b></td>
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

          <div className="modal-foot" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn btn-light"
              onClick={() => window.print()}
            >
              <AppIcon name="print" /> {trans('Cetak Rekam Medis', 'Print Medical Record')}
            </button>
            <button
              type="button"
              className="btn btn-light"
              onClick={() => setDetailModalOpen(false)}
            >
              {trans('Tutup', 'Close')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
