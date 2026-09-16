import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';

export default function KunjunganView({ onNavigate, onNavigateToDaftar }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [kunjunganList, setKunjunganList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modal Detail Kunjungan
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailKunjungan, setSelectedDetailKunjungan] = useState(null);

  // Modal Batal Kunjungan
  const [batalModalOpen, setBatalModalOpen] = useState(false);
  const [kunjunganToBatal, setKunjunganToBatal] = useState(null);
  const [batalCodes, setBatalCodes] = useState([]);
  const [batalCodeId, setBatalCodeId] = useState('');
  const [batalAlasan, setBatalAlasan] = useState('');
  const [submittingBatal, setSubmittingBatal] = useState(false);

  useEffect(() => {
    fetchKunjungan();
  }, [selectedDate]);

  useEffect(() => {
    fetchBatalCodes();
  }, []);

  const fetchKunjungan = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/kunjungan?tgl=${selectedDate}`);
      if (res && res.data) {
        setKunjunganList(res.data);
      } else {
        setKunjunganList([]);
      }
    } catch (err) {
      console.error('Failed to fetch visits:', err);
      setKunjunganList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatalCodes = async () => {
    try {
      const res = await api.get('/kunjungan/lookups');
      if (res && res.kode_pembatalan) {
        setBatalCodes(res.kode_pembatalan);
        if (res.kode_pembatalan.length > 0) {
          setBatalCodeId(res.kode_pembatalan[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch cancellation codes:', err);
    }
  };

  const handleOpenBatal = (kunjungan) => {
    setKunjunganToBatal(kunjungan);
    setBatalModalOpen(true);
  };

  const handleConfirmBatal = async (e) => {
    e.preventDefault();
    if (!kunjunganToBatal) return;
    setSubmittingBatal(true);
    try {
      const res = await api.post(`/kunjungan/${kunjunganToBatal.id}/batal`, {
        kode_pembatalan_id: batalCodeId ? Number(batalCodeId) : null,
        alasan_batal: batalAlasan,
      });
      if (res && res.success) {
        setBatalModalOpen(false);
        setKunjunganToBatal(null);
        setBatalAlasan('');
        setToastMessage(res.message || 'Kunjungan berhasil dibatalkan.');
        fetchKunjungan();
        setTimeout(() => setToastMessage(''), 4000);
      }
    } catch (err) {
      alert(err.message || 'Gagal membatalkan kunjungan.');
    } finally {
      setSubmittingBatal(false);
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await api.get(`/kunjungan/${id}`);
      if (res && res.data) {
        setSelectedDetailKunjungan(res.data);
        setDetailModalOpen(true);
      }
    } catch (err) {
      alert('Gagal memuat detail kunjungan: ' + err.message);
    }
  };

  // Indonesian date formatter matching legacy tgl_id()
  const formatTglId = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const ts = new Date(dateStr);
      if (isNaN(ts.getTime())) return dateStr;
      const day = ts.getDate();
      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const month = monthNames[ts.getMonth() + 1];
      const year = ts.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'menunggu':
      case 'pembayaran':
        return 'badge-orange';
      case 'periksa':
      case 'penunjang':
      case 'farmasi':
      case 'billing':
        return 'badge-blue';
      case 'selesai':
        return 'badge-green';
      case 'batal':
        return 'badge-red';
      default:
        return 'badge-gray';
    }
  };

  const filteredKunjungan = kunjunganList.filter((k) => {
    if (!filterType) return true;
    return k.jenis_registrasi === filterType;
  });

  const columns = [
    {
      key: 'no_antrian',
      label: 'ANTREAN',
      render: (r) => (
        <b>
          {r.poli_kode || 'POLI'}-{String(r.no_antrian || 1).padStart(3, '0')}
        </b>
      ),
    },
    {
      key: 'no_kunjungan',
      label: 'NO. KUNJUNGAN',
      render: (r) => r.no_kunjungan,
    },
    {
      key: 'no_mr',
      label: 'NO. MR',
      render: (r) => r.no_mr,
    },
    {
      key: 'pasien',
      label: 'PASIEN',
      render: (r) => r.pasien_nama || r.pasien,
    },
    {
      key: 'jenis_registrasi',
      label: 'JENIS REGISTRASI',
      render: (r) =>
        r.jenis_registrasi === 'rawat_inap' ? (
          <span className="badge badge-purple">Rawat Inap (Inpatient)</span>
        ) : (
          <span className="badge badge-blue">Rawat Jalan (Outpatient)</span>
        ),
    },
    {
      key: 'poli',
      label: 'POLI',
      render: (r) => r.poli_nama || r.poli,
    },
    {
      key: 'dokter',
      label: 'DOKTER',
      render: (r) => r.dokter_nama || r.dokter || '-',
    },
    {
      key: 'jenis_penjamin',
      label: 'PENJAMIN',
      render: (r) => (r.jenis_penjamin ? r.jenis_penjamin.toUpperCase() : 'UMUM'),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (r) => (
        <span className={`badge ${getStatusBadge(r.status)}`}>
          {r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'AKSI',
      sortable: false,
      thClassName: 'col-actions',
      className: 'cell-actions',
      render: (r) => (
        <div className="cell-actions-inner">
          <button
            type="button"
            className="btn btn-sm btn-light btn-icon"
            onClick={() => handleViewDetail(r.id)}
            title="Lihat Detail"
          >
            <AppIcon name="eye" />
          </button>
          {r.status !== 'batal' && r.status !== 'selesai' && (
            <button
              type="button"
              className="btn btn-sm btn-red btn-icon"
              onClick={() => handleOpenBatal(r)}
              title="Batalkan Kunjungan"
            >
              <AppIcon name="close" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Page Toolbar matching backend/legacy/modules/registrasi/index.php */}
      <div className="page-toolbar">
        <div>
          <div className="pt-title">Registrasi Pasien</div>
          <div className="pt-sub">
            {formatTglId(selectedDate)} &middot; {kunjunganList.length} kunjungan
          </div>
        </div>
        <div className="pt-actions">
          <div className="toolbar-filter">
            <span className="ico">
              <AppIcon name="calendar" />
            </span>
            <input
              type="date"
              name="tgl"
              value={selectedDate}
              className="form-control"
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => onNavigateToDaftar ? onNavigateToDaftar() : onNavigate('registrasi_daftar')}
          >
            <AppIcon name="plus" /> Registrasi Baru
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="alert alert-success" style={{ marginTop: 14 }}>
          {toastMessage}
        </div>
      )}

      {/* Table Wrap with DataTableWrapper */}
      <div className="table-wrap" style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
            Memuat data kunjungan...
          </div>
        ) : (
          <DataTableWrapper
            columns={columns}
            data={filteredKunjungan}
            defaultPageSize={25}
            emptyText="Belum ada data kunjungan pada tanggal ini."
            customControls={
              <select
                className="dt-custom-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">Semua</option>
                <option value="rawat_inap">Rawat Inap (Inpatient)</option>
                <option value="rawat_jalan">Rawat Jalan (Outpatient)</option>
              </select>
            }
          />
        )}
      </div>

      {/* Modal Detail Kunjungan */}
      {detailModalOpen && selectedDetailKunjungan && (
        <div className="modal-overlay open" onClick={() => setDetailModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-head">
              <div className="modal-title">Detail Kunjungan Pasien</div>
              <button type="button" className="modal-close" onClick={() => setDetailModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px 16px', fontSize: 14 }}>
                <span style={{ color: 'var(--muted)' }}>No. Kunjungan:</span>
                <b>{selectedDetailKunjungan.no_kunjungan}</b>

                <span style={{ color: 'var(--muted)' }}>Antrean:</span>
                <b>
                  {selectedDetailKunjungan.poli_kode}-{String(selectedDetailKunjungan.no_antrian).padStart(3, '0')}
                </b>

                <span style={{ color: 'var(--muted)' }}>Pasien:</span>
                <b>
                  {selectedDetailKunjungan.pasien_nama} ({selectedDetailKunjungan.no_mr})
                </b>

                <span style={{ color: 'var(--muted)' }}>Poli / Unit:</span>
                <span>{selectedDetailKunjungan.poli_nama}</span>

                <span style={{ color: 'var(--muted)' }}>Dokter:</span>
                <span>{selectedDetailKunjungan.dokter_nama || '-'}</span>

                <span style={{ color: 'var(--muted)' }}>Jenis Registrasi:</span>
                <span>{selectedDetailKunjungan.jenis_registrasi === 'rawat_inap' ? 'Rawat Inap' : 'Rawat Jalan'}</span>

                <span style={{ color: 'var(--muted)' }}>Penjamin:</span>
                <span>{selectedDetailKunjungan.jenis_penjamin?.toUpperCase() || 'UMUM'}</span>

                <span style={{ color: 'var(--muted)' }}>Status:</span>
                <span className={`badge ${getStatusBadge(selectedDetailKunjungan.status)}`}>
                  {selectedDetailKunjungan.status}
                </span>

                <span style={{ color: 'var(--muted)' }}>Keluhan Awal:</span>
                <span>{selectedDetailKunjungan.keluhan_awal || '-'}</span>
              </div>
            </div>
            <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', padding: 16 }}>
              <button type="button" className="btn btn-sm btn-light" onClick={() => setDetailModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Batal Kunjungan */}
      {batalModalOpen && kunjunganToBatal && (
        <div className="modal-overlay open" onClick={() => setBatalModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <div className="modal-title">Batalkan Kunjungan</div>
              <button type="button" className="modal-close" onClick={() => setBatalModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleConfirmBatal} className="modal-body" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontSize: 14 }}>
                Apakah Anda yakin ingin membatalkan kunjungan{' '}
                <b>{kunjunganToBatal.pasien_nama || kunjunganToBatal.pasien}</b> ({kunjunganToBatal.no_kunjungan})?
              </p>
              <div className="form-group">
                <label>Alasan Pembatalan</label>
                <select
                  className="form-control"
                  value={batalCodeId}
                  onChange={(e) => setBatalCodeId(e.target.value)}
                  required
                >
                  {batalCodes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.kode} - {c.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Catatan Tambahan (Opsional)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={batalAlasan}
                  onChange={(e) => setBatalAlasan(e.target.value)}
                  placeholder="Keterangan pembatalan..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  onClick={() => setBatalModalOpen(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-sm btn-red" disabled={submittingBatal}>
                  {submittingBatal ? 'Memproses...' : 'Konfirmasi Batal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
