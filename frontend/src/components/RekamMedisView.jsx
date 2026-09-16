import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';

export default function RekamMedisView({ onNavigateToExam }) {
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

  const handleSelectPatient = async (pasienId) => {
    setLoadingHistory(true);
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
    return `${age} tahun`;
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
            onClick={() => setSelectedPatient(null)}
          >
            <AppIcon name="arrowleft" /> Daftar Pasien
          </button>
        </div>

        {/* Card Identitas Pasien */}
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 'var(--fs-title)', fontWeight: 700 }}>{selectedPatient.nama}</div>
              <div style={{ color: 'var(--muted)', marginTop: 4 }}>
                No. MR <b>{selectedPatient.no_mr}</b> &middot; {selectedPatient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} &middot; {calculateAge(selectedPatient.tgl_lahir)} &middot; {selectedPatient.kelompok_nama || 'Umum'}
              </div>
              <div style={{ color: 'var(--muted)' }}>
                {formatDate(selectedPatient.tgl_lahir)} &middot; {selectedPatient.telepon || '-'}
                {selectedPatient.gol_darah && selectedPatient.gol_darah !== '-' && (
                  <span> &middot; Gol. Darah {selectedPatient.gol_darah}</span>
                )}
              </div>
              {selectedPatient.alamat && (
                <div style={{ color: 'var(--muted)', marginTop: 2 }}>{selectedPatient.alamat}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              {selectedPatient.alergi && (
                <span className="badge badge-red"><AppIcon name="alert" /> Alergi: {selectedPatient.alergi}</span>
              )}
            </div>
          </div>
        </div>

        {/* Riwayat Diagnosa Ringkas */}
        {patientDiagnoses.length > 0 && (
          <div className="card" style={{ marginTop: 14 }}>
            <h3 style={{ marginBottom: 10, fontSize: 15, fontWeight: 700 }}>Riwayat Diagnosa</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {patientDiagnoses.map((d, idx) => (
                <span key={idx} className="badge badge-blue">{d}</span>
              ))}
            </div>
          </div>
        )}

        {/* Daftar Kunjungan Pasien */}
        <div className="section-title" style={{ marginTop: 20 }}>
          Riwayat Kunjungan ({patientHistory.length})
        </div>

        <div className="table-wrap">
          <table className="datatable dt-noscroll" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>No. Kunjungan</th>
                <th>Poli</th>
                <th>Dokter</th>
                <th>Keluhan / Diagnosa</th>
                <th>Status</th>
                <th className="col-actions">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                    Memuat riwayat kunjungan...
                  </td>
                </tr>
              ) : patientHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                    Belum ada kunjungan tercatat untuk pasien ini.
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
                        {k.status}
                      </span>
                    </td>
                    <td className="cell-actions">
                      <div className="cell-actions-inner">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleOpenDetail(k.id)}
                        >
                          Lihat Detail
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
      label: 'NO. MR',
      render: (row) => <b>{row.no_mr}</b>,
    },
    {
      key: 'nama',
      label: 'NAMA PASIEN',
    },
    {
      key: 'jenis_kelamin',
      label: 'L/P',
      render: (row) => (row.jenis_kelamin === 'L' ? 'L' : 'P'),
    },
    {
      key: 'no_passport',
      label: 'NO. PASSPORT',
      render: (row) => row.no_passport || '-',
    },
    {
      key: 'alergi',
      label: 'ALERGI',
      render: (row) =>
        row.alergi ? <span className="badge badge-red">{row.alergi}</span> : '-',
    },
    {
      key: 'jml_kunjungan',
      label: 'JML KUNJUNGAN',
      render: (row) => Number(row.jml_kunjungan || 0),
    },
    {
      key: 'last_visit',
      label: 'KUNJUNGAN TERAKHIR',
      render: (row) => (row.last_visit ? formatDate(row.last_visit) : '-'),
    },
    {
      key: 'aksi',
      label: 'AKSI',
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
            <AppIcon name="rekam" /> Lihat
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="rekam-medis-view">
      <div className="page-toolbar">
        <div>
          <div className="pt-title">Rekam Medis Pasien</div>
          <div className="pt-sub">{pasienList.length} pasien</div>
        </div>
      </div>

      <div className="table-wrap">
        <DataTableWrapper
          columns={rekamMedisColumns}
          data={pasienList}
          defaultPageSize={25}
          emptyText="Belum ada data"
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
              Detail Rekam Medis (RME) &middot; {kj?.no_kunjungan || ''}
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
                Memuat data rekam medis...
              </div>
            ) : !rmeData ? (
              <div className="alert alert-warning">
                Data rekam medis belum tersedia untuk kunjungan ini.
              </div>
            ) : (
              <>
                {/* Identitas Kunjungan */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 'var(--fs-sub)', fontWeight: 700 }}>{kj.pasien_nama}</div>
                      <div style={{ color: 'var(--muted)' }}>
                        No. MR <b>{kj.no_mr}</b> &middot; {kj.pasien_jk === 'L' ? 'L' : 'P'} &middot; {calculateAge(kj.pasien_tgl_lahir)}
                      </div>
                      <div style={{ color: 'var(--muted)' }}>
                        {formatDate(kj.tgl_kunjungan)} &middot; {kj.poli_nama} &middot; {kj.dokter_nama || '-'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-blue">{kj.no_kunjungan}</span>
                      {kj.pasien_alergi && (
                        <div style={{ marginTop: 6 }}>
                          <span className="badge badge-red"><AppIcon name="alert" /> Alergi: {kj.pasien_alergi}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!rm ? (
                  <div className="alert alert-warning" style={{ marginTop: 14 }}>
                    Pemeriksaan dokter (SOAP) belum diinput pada kunjungan ini.
                  </div>
                ) : (
                  <>
                    {/* Vital Sign */}
                    <div className="card" style={{ marginTop: 14 }}>
                      <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>Tanda Vital (Vital Signs)</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, color: 'var(--muted)' }}>
                        <div>Tekanan Darah<br /><b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.tekanan_darah || '-'}</b></div>
                        <div>Suhu Badan<br /><b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.suhu ? `${rm.suhu} °C` : '-'}</b></div>
                        <div>Nadi<br /><b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.nadi ? `${rm.nadi} x/mnt` : '-'}</b></div>
                        <div>Berat Badan<br /><b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.berat_badan ? `${rm.berat_badan} kg` : '-'}</b></div>
                        <div>Tinggi Badan<br /><b style={{ color: 'var(--text)', fontSize: 16 }}>{rm.tinggi_badan ? `${rm.tinggi_badan} cm` : '-'}</b></div>
                      </div>
                    </div>

                    {/* SOAP */}
                    <div className="card" style={{ marginTop: 14 }}>
                      <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>Rekam Medis (SOAP)</h3>
                      <div className="form-row">
                        <div><b>S — Subjective (Keluhan / Anamnesa)</b><p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '4px 0 0' }}>{rm.subjective || '-'}</p></div>
                        <div><b>O — Objective (Pemeriksaan Fisik)</b><p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '4px 0 0' }}>{rm.objective || '-'}</p></div>
                      </div>
                      <div className="form-row" style={{ marginTop: 12 }}>
                        <div><b>A — Assessment (Analisa / Diagnosa Kerja)</b><p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '4px 0 0' }}>{rm.assessment || '-'}</p></div>
                        <div><b>P — Plan (Rencana Terapi / Edukasi)</b><p style={{ color: 'var(--muted)', whiteSpace: 'pre-line', margin: '4px 0 0' }}>{rm.plan || '-'}</p></div>
                      </div>
                      {rm.edukasi && (
                        <div style={{ marginTop: 12 }}>
                          <b>Edukasi Pasien</b>
                          <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>{rm.edukasi}</p>
                        </div>
                      )}
                    </div>

                    {/* Diagnosa & Tindakan Row */}
                    <div className="form-row" style={{ marginTop: 14 }}>
                      <div className="card">
                        <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>Diagnosa ICD-10</h3>
                        {diagnosa.length === 0 ? (
                          <p style={{ color: 'var(--muted)', margin: 0 }}>Tidak ada diagnosa tersimpan.</p>
                        ) : (
                          diagnosa.map((d, i) => (
                            <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                              <span className={`badge ${d.jenis === 'primer' ? 'badge-blue' : 'badge-gray'}`} style={{ marginRight: 6 }}>
                                {d.jenis || 'Diagnosa'}
                              </span>
                              {d.kode_icd10 && <code>{d.kode_icd10} </code>}
                              {d.diagnosa}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="card">
                        <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>Tindakan Medis</h3>
                        {tindakan.length === 0 ? (
                          <p style={{ color: 'var(--muted)', margin: 0 }}>Tidak ada tindakan medis.</p>
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
                        <h3 style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>Resep Obat</h3>
                        <table className="datatable" style={{ width: '100%', fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th>Nama Obat</th>
                              <th>Jumlah</th>
                              <th>Dosis</th>
                              <th>Aturan Pakai</th>
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
              <AppIcon name="print" /> Cetak Rekam Medis
            </button>
            <button
              type="button"
              className="btn btn-light"
              onClick={() => setDetailModalOpen(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }
}
