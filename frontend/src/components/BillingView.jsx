import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';
import BillingProsesView from './BillingProsesView';
import KeuanganBayarView from './KeuanganBayarView';
import { useI18n } from '../i18n';

export default function BillingView({ initialTab = 'billing', initialProsesId = null, initialBayarId = null, onNavigateSubView = null }) {
  const { t, isEn, trans, formatTgl, formatStatus } = useI18n();
  const [activeTab, setActiveTab] = useState(initialTab); // 'billing' | 'keuangan'
  const [activeProsesKunjunganId, setActiveProsesKunjunganId] = useState(initialProsesId);
  const [activeBayarKunjunganId, setActiveBayarKunjunganId] = useState(initialBayarId);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [billingList, setBillingList] = useState([]);
  const [summary, setSummary] = useState({ total_tagihan: 0, total_bayar: 0, piutang: 0 });
  const [loadingList, setLoadingList] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Modal Detail Tagihan (Read-Only)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Pembatalan
  const [batalModalOpen, setBatalModalOpen] = useState(false);
  const [batalKunjunganId, setBatalKunjunganId] = useState(null);
  const [batalLabel, setBatalLabel] = useState('');
  const [batalCodeId, setBatalCodeId] = useState('');
  const [batalCodes, setBatalCodes] = useState([]);
  const [alasanBatal, setAlasanBatal] = useState('');
  const [submittingBatal, setSubmittingBatal] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setActiveProsesKunjunganId(initialProsesId);
  }, [initialProsesId]);

  useEffect(() => {
    setActiveBayarKunjunganId(initialBayarId);
  }, [initialBayarId]);

  useEffect(() => {
    fetchBilling();
  }, [selectedDate, activeTab]);

  useEffect(() => {
    loadLookups();
  }, []);

  const loadLookups = async () => {
    try {
      const res = await api.get('/kunjungan/lookups');
      if (res && res.kode_pembatalan) {
        setBatalCodes(res.kode_pembatalan);
        if (res.kode_pembatalan.length > 0) {
          setBatalCodeId(res.kode_pembatalan[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading lookups:', err);
    }
  };

  const fetchBilling = async () => {
    setLoadingList(true);
    try {
      const res = await api.get(`/billing?tab=${activeTab}&tgl=${selectedDate}`);
      if (res && res.data) {
        setBillingList(res.data);
        if (res.summary) {
          setSummary(res.summary);
        } else {
          // Calculate summary locally if not returned by backend
          let tot = 0;
          let byr = 0;
          let piu = 0;
          res.data.forEach((r) => {
            const t = Number(r.billing_total ?? r.invoice_total ?? 0);
            const b = Number(r.invoice_terbayar ?? 0);
            tot += t;
            byr += b;
            piu += Math.max(0, t - b);
          });
          setSummary({ total_tagihan: tot, total_bayar: byr, piutang: piu });
        }
      }
    } catch (err) {
      console.error('Error fetching billing list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const formatRupiah = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  };

  const formatTglDmy = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatCategoryName = (kat) => {
    switch (kat?.toLowerCase()) {
      case 'tindakan':
      case 'medical_service':
      case 'medical service':
        return 'Medical Service';
      case 'konsultasi':
        return 'Konsultasi';
      case 'laboratorium':
      case 'lab':
        return 'Laboratorium';
      case 'radiologi':
      case 'rad':
        return 'Radiologi';
      case 'diagnostik':
      case 'diag':
        return 'Diagnostik';
      case 'fisioterapi':
      case 'fisio':
        return 'Fisioterapi';
      case 'farmasi':
      case 'obat':
        return 'Farmasi';
      case 'administrasi':
        return 'Administrasi';
      default:
        return kat ? kat.charAt(0).toUpperCase() + kat.slice(1) : '-';
    }
  };

  // Open Detail Modal
  const openDetailModal = async (kunjunganId) => {
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/billing/proses/${kunjunganId}`);
      if (res && res.success) {
        setDetailData(res);
      } else {
        showToast(res?.message || 'Gagal memuat detail tagihan.');
      }
    } catch (err) {
      console.error('Error loading billing detail:', err);
      showToast('Gagal memuat detail tagihan: ' + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Buka Cetak Invoice di Tab Baru
  const handleCetakInvoice = (kunjunganId) => {
    if (!kunjunganId) return;
    window.open(`/billing/cetak_invoice?id=${kunjunganId}`, '_blank');
  };


  // Open Batal Modal
  const openBatalModal = (kunjunganId, label) => {
    setBatalKunjunganId(kunjunganId);
    setBatalLabel(label);
    setAlasanBatal('');
    setBatalModalOpen(true);
  };

  const handleConfirmBatal = async () => {
    if (!batalKunjunganId || !batalCodeId) return;
    setSubmittingBatal(true);
    try {
      const res = await api.post(`/kunjungan/${batalKunjunganId}/batal`, {
        kode_pembatalan_id: batalCodeId,
        alasan_batal: alasanBatal,
      });

      if (res && res.success) {
        setBatalModalOpen(false);
        showToast('Tagihan kunjungan berhasil dibatalkan.');
        await fetchBilling();
      } else {
        showToast(res?.message || 'Gagal membatalkan tagihan.');
      }
    } catch (err) {
      showToast('Gagal membatalkan tagihan: ' + err.message);
    } finally {
      setSubmittingBatal(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'selesai' || status === 'lunas') return 'badge-green';
    if (status === 'pembayaran' || status === 'sebagian') return 'badge-blue';
    if (status === 'billing' || status === 'menunggu') return 'badge-orange';
    if (status === 'belum_bayar') return 'badge-red';
    return 'badge-gray';
  };

  const getStatusLabel = (status) => {
    if (status === 'billing' || status === 'menunggu') return 'Billing';
    if (status === 'pembayaran') return trans('Pembayaran', 'Payment');
    if (status === 'selesai') return trans('Selesai', 'Completed');
    if (status === 'lunas') return trans('Lunas', 'Paid in Full');
    if (status === 'belum_bayar') return trans('Belum Bayar', 'Unpaid');
    if (status === 'sebagian') return trans('Sebagian', 'Partially Paid');
    return formatStatus ? formatStatus(status) : status;
  };

  const getPenjaminLabel = (penjamin) => {
    switch (penjamin) {
      case 'umum': return trans('Umum', 'Self-pay');
      case 'asuransi': return trans('Asuransi Swasta', 'Private Insurance');
      case 'corporate': return 'Corporate';
      case 'ar': return 'AR';
      default: return penjamin || 'Umum';
    }
  };

  // If in Proses Billing View (full page matching proses.php)
  if (activeProsesKunjunganId) {
    return (
      <BillingProsesView
        kunjunganId={activeProsesKunjunganId}
        onBack={(msg) => {
          setActiveProsesKunjunganId(null);
          if (onNavigateSubView) onNavigateSubView(null);
          if (msg) showToast(msg);
          fetchBilling();
        }}
        onNavigateToKeuangan={() => {
          setActiveProsesKunjunganId(null);
          setActiveTab('keuangan');
          if (onNavigateSubView) onNavigateSubView('keuangan', null);
        }}
      />
    );
  }

  // If in Keuangan Bayar View (full page matching bayar.php)
  if (activeBayarKunjunganId) {
    return (
      <KeuanganBayarView
        kunjunganId={activeBayarKunjunganId}
        onBack={(msg) => {
          setActiveBayarKunjunganId(null);
          if (onNavigateSubView) onNavigateSubView(null);
          if (msg) showToast(msg);
          fetchBilling();
        }}
        onCetakInvoice={(id) => handleCetakInvoice(id)}
      />
    );
  }

  return (
    <div>
      {toastMessage && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <AppIcon name="check" /> {toastMessage}
        </div>
      )}

      {/* PAGE TOOLBAR persis legacy */}
      <div className="page-toolbar">
        <div>
          <div className="pt-title">
            {activeTab === 'keuangan' ? trans('Keuangan', 'Finance') : 'Billing'}
          </div>
          <div className="pt-sub">
            {formatTgl(selectedDate)} &middot; {billingList.length} {trans('tagihan', 'invoices')}
          </div>
        </div>
        <div className="pt-actions">
          <form className="toolbar-filter" onSubmit={(e) => e.preventDefault()}>
            <span className="ico"><AppIcon name="calendar" /></span>
            <input
              type="date"
              name="tgl"
              value={selectedDate}
              className="form-control"
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </form>
        </div>
      </div>

      {/* KEUANGAN TAB STAT CARDS persis modules/keuangan/index.php */}
      {activeTab === 'keuangan' && (
        <>
          <div className="cards" style={{ marginTop: 16 }}>
            <div className="card stat">
              <div>
                <div className="num">{formatRupiah(summary.total_tagihan)}</div>
                <div className="lbl">{trans('Total Tagihan', 'Total Invoiced')}</div>
              </div>
              <div className="ico bg-blue"><AppIcon name="billing" /></div>
            </div>
            <div className="card stat">
              <div>
                <div className="num">{formatRupiah(summary.total_bayar)}</div>
                <div className="lbl">{trans('Sudah Dibayar', 'Amount Paid')}</div>
              </div>
              <div className="ico bg-green"><AppIcon name="money" /></div>
            </div>
            <div className="card stat">
              <div>
                <div className="num">{formatRupiah(summary.piutang)}</div>
                <div className="lbl">{trans('Sisa Piutang', 'Outstanding Balance')}</div>
              </div>
              <div className="ico bg-red"><AppIcon name="keuangan" /></div>
            </div>
          </div>

          <div className="section-title">
            {trans('Daftar Tagihan', 'Invoice List')} &mdash; {formatTgl(selectedDate)}
          </div>
        </>
      )}

      {/* TABLE VIEW DENGAN DATATABLEWRAPPER */}
      <div className="table-wrap">
        <DataTableWrapper
          columns={activeTab === 'keuangan' ? [
            {
              key: 'no_antrian',
              label: trans('ANTREAN', 'QUEUE'),
              render: (r) => <b>{r.poli_kode || 'POL'}-{String(r.no_antrian || 0).padStart(3, '0')}</b>,
            },
            {
              key: 'no_invoice',
              label: trans('NO. INVOICE', 'INVOICE NO.'),
              render: (r) => r.no_invoice || '-',
            },
            {
              key: 'no_mr',
              label: trans('NO. MR', 'MR NO.'),
            },
            {
              key: 'pasien',
              label: trans('PASIEN', 'PATIENT'),
              render: (r) => r.pasien || r.pasien_nama,
            },
            {
              key: 'jenis_penjamin',
              label: trans('PENJAMIN', 'GUARANTOR'),
              render: (r) => (
                <span className="badge badge-gray">
                  {getPenjaminLabel(r.jenis_penjamin)}
                </span>
              ),
            },
            {
              key: 'tagihan',
              label: trans('TAGIHAN', 'INVOICE'),
              style: { textAlign: 'right' },
              tdStyle: { textAlign: 'right' },
              render: (r) => formatRupiah(r.billing_total ?? r.invoice_total ?? 0),
            },
            {
              key: 'piutang',
              label: trans('PIUTANG', 'RECEIVABLE'),
              style: { textAlign: 'right' },
              tdStyle: { textAlign: 'right' },
              render: (r) => {
                const sisa = r.sisa_pasien !== undefined
                  ? Number(r.sisa_pasien)
                  : Math.max(0, (r.invoice_total || r.billing_total || 0) - (r.invoice_terbayar || 0));
                return formatRupiah(sisa);
              },
            },
            {
              key: 'status',
              label: trans('STATUS', 'STATUS'),
              render: (r) => {
                const invSt = r.invoice_status || (r.kunjungan_status === 'selesai' ? 'lunas' : 'belum_bayar');
                const badgeClass = invSt === 'lunas' ? 'badge-green' : invSt === 'sebagian' ? 'badge-orange' : 'badge-red';
                return (
                  <span className={`badge ${badgeClass}`}>
                    {getStatusLabel(invSt)}
                  </span>
                );
              },
            },
            {
              key: 'aksi',
              label: trans('AKSI', 'ACTION'),
              sortable: false,
              thClassName: 'col-actions',
              className: 'cell-actions',
              render: (r) => {
                const isLunas = r.invoice_status === 'lunas' || r.kunjungan_status === 'selesai';
                return (
                  <div className="cell-actions-inner">
                    {isLunas ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-light btn-icon"
                          onClick={() => handleCetakInvoice(r.id)}
                          title={trans('Cetak Invoice', 'Print Invoice')}
                        >
                          <AppIcon name="print" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light"
                          onClick={() => {
                            setActiveBayarKunjunganId(r.id);
                            if (onNavigateSubView) onNavigateSubView('bayar', r.id);
                          }}
                        >
                          {trans('Lihat', 'View')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setActiveBayarKunjunganId(r.id);
                          if (onNavigateSubView) onNavigateSubView('bayar', r.id);
                        }}
                      >
                        <AppIcon name="money" /> {trans('Bayar', 'Pay')}
                      </button>
                    )}
                  </div>
                );
              },
            },
          ] : [
            {
              key: 'no_antrian',
              label: trans('ANTREAN', 'QUEUE'),
              render: (r) => <b>{r.poli_kode || 'POL'}-{String(r.no_antrian || 0).padStart(3, '0')}</b>,
            },
            {
              key: 'no_kunjungan',
              label: trans('NO. KUNJUNGAN', 'VISIT NO.'),
            },
            {
              key: 'no_mr',
              label: trans('NO. MR', 'MR NO.'),
            },
            {
              key: 'pasien',
              label: trans('PASIEN', 'PATIENT'),
              render: (r) => r.pasien || r.pasien_nama,
            },
            {
              key: 'poli',
              label: trans('POLI', 'CLINIC'),
              render: (r) => r.poli || r.poli_nama,
            },
            {
              key: 'status',
              label: trans('STATUS', 'STATUS'),
              render: (r) => {
                const st = r.status || r.kunjungan_status;
                return <span className={`badge ${getStatusBadge(st)}`}>{getStatusLabel(st)}</span>;
              },
            },
            {
              key: 'billing_total',
              label: trans('TOTAL TAGIHAN', 'TOTAL INVOICE'),
              style: { textAlign: 'right' },
              tdStyle: { textAlign: 'right' },
              render: (r) =>
                r.billing_total !== null && r.billing_total !== undefined ? (
                  formatRupiah(r.billing_total)
                ) : (
                  <span style={{ color: 'var(--muted)' }}>{trans('Belum', 'Pending')}</span>
                ),
            },
            {
              key: 'aksi',
              label: trans('AKSI', 'ACTION'),
              sortable: false,
              thClassName: 'col-actions',
              className: 'cell-actions',
              render: (r) => {
                const st = r.status || r.kunjungan_status;
                return (
                  <div className="cell-actions-inner">
                    {st === 'billing' ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setActiveProsesKunjunganId(r.id);
                            if (onNavigateSubView) onNavigateSubView('proses', r.id);
                          }}
                        >
                          <AppIcon name="billing" /> {trans('Buat Billing', 'Create Billing')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => openBatalModal(r.id, `${r.pasien || r.pasien_nama} — ${r.no_kunjungan}`)}
                        >
                          <AppIcon name="close" /> {trans('Batal', 'Cancel')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-light btn-icon"
                          onClick={() => handleCetakInvoice(r.id)}
                          title={trans('Cetak Invoice', 'Print Invoice')}
                        >
                          <AppIcon name="print" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light"
                          onClick={() => openDetailModal(r.id)}
                        >
                          <AppIcon name="eye" /> {trans('Rincian', 'Details')}
                        </button>
                        {st === 'pembayaran' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => openBatalModal(r.id, `${r.pasien || r.pasien_nama} — ${r.no_kunjungan}`)}
                          >
                            <AppIcon name="close" /> {trans('Batal', 'Cancel')}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              },
            },
          ]}
          data={billingList}
          defaultPageSize={25}
          emptyText={trans('Belum ada data tagihan', 'No billing data available')}
          rowKey="id"
        />
      </div>

      {/* MODAL DETAIL TAGIHAN (READ-ONLY) */}
      {detailModalOpen && (
        <div className="modal-overlay open" style={{ display: 'flex' }} onClick={() => setDetailModalOpen(false)}>
          <div className="modal-box modal-lg" role="dialog" aria-modal="true" style={{ maxWidth: 880, borderRadius: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head" style={{ borderBottom: 'none', padding: '18px 24px 10px 24px' }}>
              <div className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                {trans('Detail Tagihan', 'Billing Details')}
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDetailModalOpen(false)}
                aria-label={trans('Tutup', 'Close')}
              >
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: '10px 24px 24px 24px' }}>
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                  {trans('Memuat rincian tagihan...', 'Loading billing details...')}
                </div>
              ) : !detailData ? (
                <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 30 }}>
                  {trans('Data tagihan tidak ditemukan.', 'Billing data not found.')}
                </div>
              ) : (
                <div>
                  {/* Blue Gradient Patient Banner Card matching Screenshot */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
                      borderRadius: '16px',
                      padding: '20px 24px',
                      color: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.25)',
                      marginBottom: '20px',
                    }}
                  >
                    {/* Left: Icon & Patient Information */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 12,
                          background: 'rgba(255, 255, 255, 0.18)',
                          border: '1px solid rgba(255, 255, 255, 0.28)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                          color: '#ffffff',
                          flexShrink: 0,
                        }}
                      >
                        <AppIcon name="idcard" />
                      </div>
                      <div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.2, marginBottom: 5 }}>
                          {detailData.kunjungan?.pasien_nama || detailData.kunjungan?.pasien || '-'}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            fontSize: '0.84rem',
                            color: 'rgba(255, 255, 255, 0.92)',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AppIcon name="user" style={{ fontSize: '0.88rem' }} />
                            <span>{trans('No. MR', 'MR No.')} <strong style={{ color: '#ffffff' }}>{detailData.kunjungan?.no_mr || '-'}</strong></span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AppIcon name="hospital" style={{ fontSize: '0.88rem' }} />
                            <span>{detailData.kunjungan?.poli_nama || detailData.kunjungan?.poli || '-'}</span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AppIcon name="pelayanan" style={{ fontSize: '0.88rem' }} />
                            <span>{detailData.kunjungan?.dokter_nama || '-'}</span>
                          </span>
                        </div>

                        {/* Detail Penjamin / Asuransi */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: detailData.kunjungan?.jenis_penjamin && detailData.kunjungan?.jenis_penjamin !== 'umum' ? '#ffffff' : 'rgba(255, 255, 255, 0.18)',
                              color: detailData.kunjungan?.jenis_penjamin && detailData.kunjungan?.jenis_penjamin !== 'umum' ? '#1d4ed8' : '#ffffff',
                              padding: '2px 10px',
                              borderRadius: 999,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              boxShadow: detailData.kunjungan?.jenis_penjamin && detailData.kunjungan?.jenis_penjamin !== 'umum' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                            }}
                          >
                            <AppIcon name="shield" style={{ fontSize: '0.82rem' }} />
                            <span>
                              {detailData.kunjungan?.jenis_penjamin === 'bpjs'
                                ? 'BPJS Kesehatan'
                                : detailData.kunjungan?.jenis_penjamin === 'asuransi'
                                ? `Asuransi: ${detailData.kunjungan?.asuransi_nama || 'Swasta'}`
                                : detailData.kunjungan?.jenis_penjamin === 'corporate'
                                ? `Corporate: ${detailData.kunjungan?.corporate_nama || 'Perusahaan'}`
                                : detailData.kunjungan?.jenis_penjamin === 'ar'
                                ? 'AR (Piutang)'
                                : trans('Umum (Pribadi)', 'General / Self-pay')}
                            </span>
                          </span>

                          {detailData.kunjungan?.no_jaminan && (
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.95)', background: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: 6 }}>
                              {trans('No. Jaminan/Polis', 'Guarantee/Policy No.')}: <strong style={{ color: '#ffffff' }}>{detailData.kunjungan.no_jaminan}</strong>
                            </span>
                          )}

                          {detailData.cover_penjamin > 0 && (
                            <span style={{ fontSize: '0.78rem', color: '#ffffff', background: 'rgba(34, 197, 94, 0.45)', border: '1px solid rgba(255,255,255,0.4)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                              {trans('Cover', 'Cover')}: {formatRupiah(detailData.cover_penjamin)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: No Kunjungan & Status Badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.18)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: 999,
                          padding: '3px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#ffffff',
                          letterSpacing: '0.3px',
                        }}
                      >
                        No. {detailData.kunjungan?.no_kunjungan}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <div
                          style={{
                            background: '#ffffff',
                            color: '#2563eb',
                            fontWeight: 700,
                            borderRadius: 999,
                            padding: '3px 14px',
                            fontSize: '0.76rem',
                            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.06)',
                          }}
                        >
                          {getStatusLabel(detailData.kunjungan?.status || 'pembayaran')}
                        </div>
                        <div
                          style={{
                            background: '#22c55e',
                            color: '#ffffff',
                            fontWeight: 700,
                            borderRadius: 999,
                            padding: '3px 14px',
                            fontSize: '0.76rem',
                            boxShadow: '0 2px 5px rgba(34, 197, 94, 0.3)',
                          }}
                        >
                          {detailData.billing?.status === 'final' || detailData.kunjungan?.status === 'selesai' ? 'Final' : 'Draft'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Title */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.98rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      marginBottom: '12px',
                    }}
                  >
                    <AppIcon name="ticket" style={{ color: '#2563eb' }} />
                    <span>{trans('Rincian Layanan', 'Service Details')}</span>
                  </div>

                  {/* Service Details Table */}
                  <div className="table-wrap" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            {trans('TANGGAL', 'DATE')}
                          </th>
                          <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            {trans('KATEGORI', 'CATEGORY')}
                          </th>
                          <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            {trans('KODE', 'CODE')}
                          </th>
                          <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            {trans('DESKRIPSI', 'DESCRIPTION')}
                          </th>
                          <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', width: 60, textAlign: 'center' }}>
                            QTY
                          </th>
                          <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                            {trans('TARIF', 'RATE')}
                          </th>
                          <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                            SUBTOTAL
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailData.lines || []).length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>
                              {trans('Belum ada rincian layanan.', 'No service details available.')}
                            </td>
                          </tr>
                        ) : (
                          (detailData.lines || []).map((l, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#475569' }}>
                                {formatTglDmy(l.tgl_layanan || detailData.kunjungan?.tgl_kunjungan)}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 12px',
                                    background: '#e2e8f0',
                                    color: '#475569',
                                    borderRadius: 999,
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {formatCategoryName(l.kategori)}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <code style={{ color: '#2563eb', background: 'none', fontWeight: 600, fontSize: '0.82rem' }}>
                                  {l.item_code || '-'}
                                </code>
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: '0.88rem', color: '#1e293b' }}>
                                {l.deskripsi}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.88rem', color: '#1e293b' }}>
                                {l.qty}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '0.88rem', color: '#475569' }}>
                                {formatRupiah(l.tarif)}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                {formatRupiah(l.subtotal)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Box */}
                  <div
                    style={{
                      maxWidth: 380,
                      marginLeft: 'auto',
                      marginTop: 18,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px 22px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.88rem', color: '#64748b' }}>
                      <span>{trans('Subtotal Layanan', 'Service Subtotal')}</span>
                      <b style={{ color: '#1e293b' }}>{formatRupiah(detailData.svc_subtotal ?? detailData.subtotal)}</b>
                    </div>
                    {detailData.administrasi > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.88rem', color: '#64748b' }}>
                        <span>
                          {trans('Biaya Administrasi', 'Administration Fee')}
                          {detailData.kunjungan?.jenis_registrasi === 'rawat_inap' ? ' (Rawat Inap)' : ''}
                        </span>
                        <b style={{ color: '#1e293b' }}>{formatRupiah(detailData.administrasi)}</b>
                      </div>
                    )}
                    {detailData.diskon > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.88rem', color: 'var(--red, #ef4444)' }}>
                        <span>{trans('Diskon', 'Discount')}</span>
                        <b>-{formatRupiah(detailData.diskon)}</b>
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 0 2px 0',
                        marginTop: 8,
                        borderTop: '1px solid #e2e8f0',
                      }}
                    >
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
                        {trans('TOTAL TAGIHAN', 'TOTAL INVOICE')}
                      </span>
                      <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1d4ed8' }}>
                        {formatRupiah(detailData.total)}
                      </span>
                    </div>

                    {detailData.cover_penjamin > 0 && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 2px 0', fontSize: '0.88rem', color: '#16a34a', borderTop: '1px dashed #cbd5e1', marginTop: 8 }}>
                          <span>{trans('Tanggungan Penjamin / Asuransi', 'Guarantor / Insurance Coverage')}</span>
                          <b>-{formatRupiah(detailData.cover_penjamin)}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '0.92rem' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{trans('Sisa Tagihan Pasien', 'Patient Balance')}</span>
                          <b style={{ color: '#2563eb', fontSize: '1.1rem' }}>{formatRupiah(Math.max(0, (detailData.total || 0) - detailData.cover_penjamin))}</b>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Modal Action Buttons Footer matching screenshot */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                    <button
                      type="button"
                      className="btn btn-light"
                      style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 600,
                        color: '#334155',
                      }}
                      onClick={() => setDetailModalOpen(false)}
                    >
                      <AppIcon name="close" style={{ fontSize: '0.85rem' }} />
                      {trans('Tutup', 'Close')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        padding: '8px 20px',
                        borderRadius: '8px',
                        background: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 600,
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                      }}
                      onClick={() => {
                        const kid = detailData.kunjungan?.id;
                        setDetailModalOpen(false);
                        if (kid) {
                          setActiveBayarKunjunganId(kid);
                          if (onNavigateSubView) {
                            onNavigateSubView('bayar', kid);
                          }
                        }
                      }}
                    >
                      <AppIcon name="money" style={{ fontSize: '1rem' }} />
                      {trans('Ke Pembayaran', 'Proceed to Payment')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEMBATALAN BILLING persis legacy modules/billing/index.php */}
      {batalModalOpen && (
        <div className="modal-overlay open" style={{ display: 'flex' }} onClick={() => setBatalModalOpen(false)}>
          <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{trans('Batalkan Billing', 'Cancel Billing')}</div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setBatalModalOpen(false)}
                aria-label={trans('Tutup', 'Close')}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 14px', color: 'var(--muted)' }}>
                {batalLabel}
              </p>
              <div className="form-group">
                <label>
                  {trans('Kode Pembatalan', 'Cancellation Code')} <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={batalCodeId}
                  onChange={(e) => setBatalCodeId(e.target.value)}
                  required
                >
                  <option value="">{trans('Pilih Alasan Pembatalan...', 'Select Cancellation Reason...')}</option>
                  {batalCodes.map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.kode} &mdash; {kb.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{trans('Catatan Tambahan', 'Additional Notes')}</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder={trans('Catatan alasan pembatalan (opsional)...', 'Reason notes (optional)...')}
                  value={alasanBatal}
                  onChange={(e) => setAlasanBatal(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-light" onClick={() => setBatalModalOpen(false)}>
                  {trans('Batal', 'Cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmBatal}
                  disabled={submittingBatal || !batalCodeId}
                >
                  <AppIcon name="close" /> {trans('Batalkan Billing', 'Cancel Billing')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
