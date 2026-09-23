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

  const formatTglId = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
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
    window.open(`/legacy/modules/billing/cetak_invoice.php?kunjungan_id=${kunjunganId}`, '_blank');
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
          <div className="modal-box modal-lg" role="dialog" aria-modal="true" style={{ maxWidth: 840 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{trans('Rincian Tagihan Layanan', 'Service Billing Details')}</div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDetailModalOpen(false)}
                aria-label={trans('Tutup', 'Close')}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>{trans('Memuat rincian tagihan...', 'Loading billing details...')}</div>
              ) : !detailData ? (
                <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>{trans('Data tagihan tidak ditemukan.', 'Billing data not found.')}</div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {detailData.kunjungan?.pasien_nama || detailData.kunjungan?.pasien}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                        {trans('No. MR', 'MR No.')}: <b>{detailData.kunjungan?.no_mr}</b> &middot; {trans('Poli', 'Clinic')}: {detailData.kunjungan?.poli_nama || detailData.kunjungan?.poli} &middot; {trans('Dokter', 'Doctor')}: {detailData.kunjungan?.dokter_nama || '-'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-blue">No. {detailData.kunjungan?.no_kunjungan}</span>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>{trans('KATEGORI', 'CATEGORY')}</th>
                          <th>{trans('KODE', 'CODE')}</th>
                          <th>{trans('DESKRIPSI', 'DESCRIPTION')}</th>
                          <th style={{ width: 60, textAlign: 'center' }}>QTY</th>
                          <th style={{ textAlign: 'right' }}>{trans('TARIF', 'RATE')}</th>
                          <th style={{ textAlign: 'right' }}>SUBTOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailData.lines || []).map((l, i) => (
                          <tr key={i}>
                            <td><span className="badge badge-gray">{l.kategori}</span></td>
                            <td><code>{l.item_code || '-'}</code></td>
                            <td>{l.deskripsi}</td>
                            <td style={{ textAlign: 'center' }}>{l.qty}</td>
                            <td style={{ textAlign: 'right' }}>{formatRupiah(l.tarif)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRupiah(l.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ maxWidth: 360, marginLeft: 'auto', marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>Subtotal:</span>
                      <b>{formatRupiah(detailData.subtotal)}</b>
                    </div>
                    {detailData.diskon > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--danger)' }}>
                        <span>{trans('Diskon', 'Discount')}:</span>
                        <span>-{formatRupiah(detailData.diskon)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: '1.1rem', fontWeight: 700 }}>
                      <span>Total:</span>
                      <span>{formatRupiah(detailData.total)}</span>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-light" onClick={() => setDetailModalOpen(false)}>
                  {trans('Tutup', 'Close')}
                </button>
                {detailData && detailData.kunjungan?.id && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleCetakInvoice(detailData.kunjungan.id)}
                  >
                    <AppIcon name="print" /> {trans('Cetak Invoice', 'Print Invoice')}
                  </button>
                )}
              </div>
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
