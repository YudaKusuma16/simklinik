import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';
import { useI18n } from '../i18n';

export default function KunjunganView({ onNavigate, onNavigateToDaftar }) {
  const { t, isEn, trans, formatTgl } = useI18n();
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
    setBatalAlasan('');
    setBatalModalOpen(true);
  };

  const handleConfirmBatal = async (e) => {
    e.preventDefault();
    if (!kunjunganToBatal || !batalCodeId) return;

    setSubmittingBatal(true);
    try {
      const res = await api.post(`/kunjungan/${kunjunganToBatal.id}/batal`, {
        kode_pembatalan_id: batalCodeId,
        alasan: batalAlasan,
      });

      if (res && res.success) {
        setToastMessage(res.message || trans('Kunjungan berhasil dibatalkan.', 'Visit cancelled successfully.'));
        setBatalModalOpen(false);
        setKunjunganToBatal(null);
        fetchKunjungan();
      } else {
        alert(res.message || trans('Gagal membatalkan kunjungan.', 'Failed to cancel visit.'));
      }
    } catch (err) {
      alert(err.message || trans('Gagal membatalkan kunjungan.', 'Failed to cancel visit.'));
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
      alert(trans('Gagal memuat detail kunjungan: ', 'Failed to load visit details: ') + err.message);
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

  const statusLabel = (status) => {
    if (!status) return '-';
    const map = {
      menunggu: trans('Menunggu', 'Waiting'),
      periksa: trans('Periksa', 'Examining'),
      penunjang: trans('Penunjang', 'Support/Lab'),
      farmasi: trans('Farmasi', 'Pharmacy'),
      billing: trans('Billing', 'Billing'),
      pembayaran: trans('Pembayaran', 'Payment'),
      selesai: trans('Selesai', 'Completed'),
      batal: trans('Batal', 'Cancelled'),
    };
    return map[status.toLowerCase()] || status;
  };

  const filteredKunjungan = kunjunganList.filter((k) => {
    if (!filterType) return true;
    return k.jenis_registrasi === filterType;
  });

  const columns = [
    {
      key: 'no_antrian',
      label: t('kunjungan.queue'),
      render: (r) => (
        <b>
          {r.poli_kode || 'POLI'}-{String(r.no_antrian || 1).padStart(3, '0')}
        </b>
      ),
    },
    {
      key: 'no_kunjungan',
      label: t('kunjungan.visit_no'),
      render: (r) => r.no_kunjungan,
    },
    {
      key: 'no_mr',
      label: t('kunjungan.mr_no'),
      render: (r) => r.no_mr,
    },
    {
      key: 'pasien',
      label: t('kunjungan.patient'),
      render: (r) => r.pasien_nama || r.pasien,
    },
    {
      key: 'jenis_registrasi',
      label: t('kunjungan.reg_type'),
      render: (r) =>
        r.jenis_registrasi === 'rawat_inap' ? (
          <span className="badge badge-purple">{trans('Rawat Inap', 'Inpatient')}</span>
        ) : (
          <span className="badge badge-blue">{trans('Rawat Jalan', 'Outpatient')}</span>
        ),
    },
    {
      key: 'poli',
      label: t('kunjungan.poli'),
      render: (r) => r.poli_nama || r.poli,
    },
    {
      key: 'dokter',
      label: t('kunjungan.doctor'),
      render: (r) => r.dokter_nama || r.dokter || '-',
    },
    {
      key: 'jenis_penjamin',
      label: t('kunjungan.insurance'),
      render: (r) => (r.jenis_penjamin ? r.jenis_penjamin.toUpperCase() : 'UMUM'),
    },
    {
      key: 'status',
      label: t('kunjungan.status'),
      render: (r) => (
        <span className={`badge ${getStatusBadge(r.status)}`}>
          {statusLabel(r.status)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('kunjungan.action'),
      sortable: false,
      thClassName: 'col-actions',
      className: 'cell-actions',
      render: (r) => (
        <div className="cell-actions-inner">
          <button
            type="button"
            className="btn btn-sm btn-light btn-icon"
            onClick={() => handleViewDetail(r.id)}
            title={t('kunjungan.view_detail')}
          >
            <AppIcon name="eye" />
          </button>
          {r.status !== 'batal' && r.status !== 'selesai' && (
            <button
              type="button"
              className="btn btn-sm btn-red btn-icon"
              onClick={() => handleOpenBatal(r)}
              title={t('kunjungan.cancel_visit')}
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
          <div className="pt-title">{t('kunjungan.title')}</div>
          <div className="pt-sub">
            {formatTgl(selectedDate)} &middot; {kunjunganList.length} {trans('kunjungan', 'visits')}
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
            <AppIcon name="plus" /> {t('kunjungan.new_reg')}
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
            {t('kunjungan.loading')}
          </div>
        ) : (
          <DataTableWrapper
            columns={columns}
            data={filteredKunjungan}
            defaultPageSize={25}
            emptyText={t('kunjungan.empty')}
            customControls={
              <select
                className="dt-custom-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">{trans('Semua Registrasi', 'All Registrations')}</option>
                <option value="rawat_inap">{trans('Rawat Inap (Inpatient)', 'Inpatient')}</option>
                <option value="rawat_jalan">{trans('Rawat Jalan (Outpatient)', 'Outpatient')}</option>
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
              <div className="modal-title">{t('kunjungan.detail_title')}</div>
              <button type="button" className="modal-close" onClick={() => setDetailModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px', fontSize: 14 }}>
                <span style={{ color: 'var(--muted)' }}>{t('kunjungan.visit_no')}:</span>
                <b>{selectedDetailKunjungan.no_kunjungan}</b>

                <span style={{ color: 'var(--muted)' }}>{t('kunjungan.queue')}:</span>
                <b>
                  {selectedDetailKunjungan.poli_kode}-{String(selectedDetailKunjungan.no_antrian).padStart(3, '0')}
                </b>

                <span style={{ color: 'var(--muted)' }}>{t('kunjungan.patient')}:</span>
                <b>
                  {selectedDetailKunjungan.pasien_nama} ({selectedDetailKunjungan.no_mr})
                </b>

                <span style={{ color: 'var(--muted)' }}>{t('kunjungan.poli')}:</span>
                <span>{selectedDetailKunjungan.poli_nama}</span>

                <span style={{ color: 'var(--muted)' }}>{t('kunjungan.doctor')}:</span>
                <span>{selectedDetailKunjungan.dokter_nama || '-'}</span>

                <span style={{ color: 'var(--muted)' }}>{t('kunjungan.reg_type')}:</span>
                <span>{selectedDetailKunjungan.jenis_registrasi === 'rawat_inap' ? trans('Rawat Inap', 'Inpatient') : trans('Rawat Jalan', 'Outpatient')}</span>

                <span style={{ color: 'var(--muted)' }}>{t('kunjungan.insurance')}:</span>
                <span>{selectedDetailKunjungan.jenis_penjamin?.toUpperCase() || 'UMUM'}</span>

                <span style={{ color: 'var(--muted)' }}>{t('kunjungan.status')}:</span>
                <span className={`badge ${getStatusBadge(selectedDetailKunjungan.status)}`}>
                  {statusLabel(selectedDetailKunjungan.status)}
                </span>

                <span style={{ color: 'var(--muted)' }}>{trans('Keluhan Awal:', 'Initial Complaint:')}</span>
                <span>{selectedDetailKunjungan.keluhan_awal || '-'}</span>
              </div>
            </div>
            <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', padding: 16 }}>
              <button type="button" className="btn btn-sm btn-light" onClick={() => setDetailModalOpen(false)}>
                {t('common.close')}
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
              <div className="modal-title">{t('kunjungan.cancel_title')}</div>
              <button type="button" className="modal-close" onClick={() => setBatalModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleConfirmBatal} className="modal-body" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontSize: 14 }}>
                {trans('Apakah Anda yakin ingin membatalkan kunjungan', 'Are you sure you want to cancel the visit for')}{' '}
                <b>{kunjunganToBatal.pasien_nama || kunjunganToBatal.pasien}</b> ({kunjunganToBatal.no_kunjungan})?
              </p>
              <div className="form-group">
                <label>{t('kunjungan.cancel_reason')}</label>
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
                <label>{t('kunjungan.cancel_notes')}</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={batalAlasan}
                  onChange={(e) => setBatalAlasan(e.target.value)}
                  placeholder={trans('Keterangan pembatalan...', 'Reason or notes for cancellation...')}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  onClick={() => setBatalModalOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-sm btn-red" disabled={submittingBatal}>
                  {submittingBatal ? t('kunjungan.cancelling') : t('kunjungan.cancel_confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
