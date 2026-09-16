import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';

export default function BillingView({ initialTab = 'billing' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'billing' | 'keuangan'
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [billingList, setBillingList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Modal Proses Billing / Kasir Bayar
  const [prosesModalOpen, setProsesModalOpen] = useState(false);
  const [activeKunjunganId, setActiveKunjunganId] = useState(null);
  const [prosesData, setProsesData] = useState(null);
  const [loadingProses, setLoadingProses] = useState(false);

  // Form input kasir
  const [diskon, setDiskon] = useState(0);
  const [administrasi, setAdministrasi] = useState(10000);
  const [metodeBayar, setMetodeBayar] = useState('cash');
  const [bankId, setBankId] = useState('');
  const [jumlahUang, setJumlahUang] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Modal Detail Tagihan (Read-Only)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Cetak Invoice / Struk
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Modal Pembatalan
  const [batalModalOpen, setBatalModalOpen] = useState(false);
  const [batalKunjunganId, setBatalKunjunganId] = useState(null);
  const [batalLabel, setBatalLabel] = useState('');
  const [alasanBatal, setAlasanBatal] = useState('');
  const [submittingBatal, setSubmittingBatal] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetchBilling();
  }, [selectedDate]);

  const fetchBilling = async () => {
    setLoadingList(true);
    try {
      const res = await api.get(`/billing?tgl=${selectedDate}`);
      if (res && res.data) {
        setBillingList(res.data);
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
    if (num === null || num === undefined) return 'Rp 0';
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

  // Open Proses / Bayar Modal
  const openProsesModal = async (kunjunganId) => {
    setActiveKunjunganId(kunjunganId);
    setProsesModalOpen(true);
    setLoadingProses(true);
    try {
      const res = await api.get(`/billing/proses/${kunjunganId}`);
      if (res && res.success) {
        setProsesData(res);
        setDiskon(res.diskon || 0);

        const adminLine = res.lines?.find((l) => l.kategori === 'administrasi');
        setAdministrasi(adminLine ? adminLine.subtotal : (res.kunjungan?.jenis_registrasi === 'rawat_inap' ? 25000 : 10000));

        if (res.banks && res.banks.length > 0) {
          setBankId(res.banks[0].id);
        }
        setJumlahUang(String(res.total || 0));
      }
    } catch (err) {
      console.error('Error loading billing proses:', err);
      showToast('Gagal memuat rincian tagihan: ' + err.message);
    } finally {
      setLoadingProses(false);
    }
  };

  // Open Detail Modal
  const openDetailModal = async (kunjunganId) => {
    setActiveKunjunganId(kunjunganId);
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/billing/proses/${kunjunganId}`);
      if (res && res.success) {
        setDetailData(res);
      }
    } catch (err) {
      console.error('Error loading billing detail:', err);
      showToast('Gagal memuat detail tagihan: ' + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open Invoice / Struk Modal
  const openInvoiceModal = async (kunjunganId) => {
    setInvoiceModalOpen(true);
    setLoadingInvoice(true);
    try {
      const res = await api.get(`/billing/invoice/${kunjunganId}`);
      if (res && res.success) {
        setInvoiceData(res);
      }
    } catch (err) {
      console.error('Error fetching invoice:', err);
      showToast('Gagal memuat invoice: ' + err.message);
    } finally {
      setLoadingInvoice(false);
    }
  };

  // Open Batal Modal
  const openBatalModal = (kunjunganId, label) => {
    setBatalKunjunganId(kunjunganId);
    setBatalLabel(label);
    setAlasanBatal('');
    setBatalModalOpen(true);
  };

  const handleProsesDanBayar = async (isLunas) => {
    if (!activeKunjunganId || !prosesData) return;
    setSubmittingPayment(true);
    try {
      const billRes = await api.post(`/billing/simpan/${activeKunjunganId}`, {
        aksi: 'finalisasi',
        diskon: parseFloat(diskon) || 0,
        administrasi: parseFloat(administrasi) || 0,
      });

      if (!billRes.success) {
        throw new Error(billRes.message || 'Gagal finalisasi billing.');
      }

      if (isLunas) {
        const totalBayar = parseFloat(billRes.total);
        const bayarRes = await api.post(`/billing/bayar/${activeKunjunganId}`, {
          metode: metodeBayar,
          bank_id: metodeBayar === 'transfer' ? parseInt(bankId, 10) : null,
          jumlah: totalBayar,
          keterangan: 'Pembayaran kasir',
        });

        if (!bayarRes.success) {
          throw new Error(bayarRes.message || 'Gagal memproses pembayaran.');
        }
        showToast(bayarRes.message || 'Pembayaran berhasil disimpan!');
      } else {
        showToast(billRes.message || 'Tagihan berhasil difinalisasi!');
      }

      setProsesModalOpen(false);
      fetchBilling();
      openInvoiceModal(activeKunjunganId);
    } catch (err) {
      showToast(err.message || 'Gagal memproses pembayaran.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleBatalBilling = async (e) => {
    e.preventDefault();
    if (!batalKunjunganId) return;
    setSubmittingBatal(true);
    try {
      const res = await api.post(`/kunjungan/${batalKunjunganId}/batal`, {
        alasan_batal: alasanBatal,
      });
      if (res.success) {
        showToast('Tagihan berhasil dibatalkan.');
        setBatalModalOpen(false);
        fetchBilling();
      } else {
        showToast(res.message || 'Gagal membatalkan tagihan.');
      }
    } catch (err) {
      showToast(err.message || 'Gagal membatalkan tagihan.');
    } finally {
      setSubmittingBatal(false);
    }
  };

  // Live calculation for modal
  const calculateLiveTotal = () => {
    if (!prosesData) return 0;
    const linesWithoutAdmin = (prosesData.lines || []).filter((l) => l.kategori !== 'administrasi');
    const svcSubtotal = linesWithoutAdmin.reduce((sum, l) => sum + Number(l.subtotal || 0), 0);
    const totalRaw = Math.max(0, svcSubtotal + (parseFloat(administrasi) || 0) - (parseFloat(diskon) || 0));
    return Math.ceil(totalRaw / 500) * 500;
  };

  const liveTotal = calculateLiveTotal();
  const bayarAmount = parseFloat(jumlahUang) || 0;
  const kembalian = Math.max(0, bayarAmount - liveTotal);

  // Financial summary calculations for Keuangan tab
  let totalTagihanSum = 0;
  let totalBayarSum = 0;
  let totalPiutangSum = 0;

  billingList.forEach((b) => {
    const tagihan = Number(b.invoice_total ?? b.billing_total ?? 0);
    const terbayar = Number(b.invoice_terbayar ?? 0);
    const sisa = Math.max(0, tagihan - terbayar);
    totalTagihanSum += tagihan;
    totalBayarSum += terbayar;
    totalPiutangSum += sisa;
  });

  const getStatusBadge = (status) => {
    if (status === 'selesai' || status === 'lunas') return 'badge-green';
    if (status === 'pembayaran' || status === 'sebagian') return 'badge-orange';
    if (status === 'billing' || status === 'belum_bayar') return 'badge-blue';
    return 'badge-gray';
  };

  const getStatusLabel = (status) => {
    if (status === 'billing') return 'Billing';
    if (status === 'pembayaran') return 'Pembayaran';
    if (status === 'selesai') return 'Selesai';
    if (status === 'lunas') return 'Lunas';
    if (status === 'belum_bayar') return 'Belum Bayar';
    if (status === 'sebagian') return 'Sebagian';
    return status;
  };

  return (
    <div>
      {toastMessage && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <AppIcon name="check" /> {toastMessage}
        </div>
      )}

      {/* PAGE TOOLBAR */}
      <div className="page-toolbar">
        <div>
          <div className="pt-title">
            {activeTab === 'keuangan' ? 'Keuangan' : 'Billing'}
          </div>
          <div className="pt-sub">
            {formatTglId(selectedDate)} &middot; {billingList.length} tagihan
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

      {/* KEUANGAN TAB STAT CARDS */}
      {activeTab === 'keuangan' && (
        <>
          <div className="cards" style={{ marginTop: 16 }}>
            <div className="card stat">
              <div>
                <div className="num">{formatRupiah(totalTagihanSum)}</div>
                <div className="lbl">Total Tagihan</div>
              </div>
              <div className="ico bg-blue"><AppIcon name="billing" /></div>
            </div>
            <div className="card stat">
              <div>
                <div className="num">{formatRupiah(totalBayarSum)}</div>
                <div className="lbl">Sudah Dibayar</div>
              </div>
              <div className="ico bg-green"><AppIcon name="money" /></div>
            </div>
            <div className="card stat">
              <div>
                <div className="num">{formatRupiah(totalPiutangSum)}</div>
                <div className="lbl">Sisa Piutang</div>
              </div>
              <div className="ico bg-red"><AppIcon name="keuangan" /></div>
            </div>
          </div>

          <div className="section-title">
            Daftar Tagihan &mdash; {formatTglId(selectedDate)}
          </div>
        </>
      )}

      {/* TABLE VIEW DENGAN DATATABLEWRAPPER */}
      <div className="table-wrap">
        <DataTableWrapper
          columns={activeTab === 'keuangan' ? [
            {
              key: 'no_antrian',
              label: 'ANTRIAN',
              render: (r) => <b>{r.poli_kode || 'POL'}-{String(r.no_antrian || 0).padStart(3, '0')}</b>,
            },
            {
              key: 'no_invoice',
              label: 'NO. INVOICE',
              render: (r) => r.no_invoice || '-',
            },
            {
              key: 'no_mr',
              label: 'NO. MR',
            },
            {
              key: 'pasien',
              label: 'PASIEN',
              render: (r) => r.pasien || r.pasien_nama,
            },
            {
              key: 'jenis_penjamin',
              label: 'PENJAMIN',
              render: (r) => (
                <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>
                  {r.jenis_penjamin || 'Umum'}
                </span>
              ),
            },
            {
              key: 'tagihan',
              label: 'TAGIHAN',
              style: { textAlign: 'right' },
              tdStyle: { textAlign: 'right' },
              render: (r) => formatRupiah(r.invoice_total ?? r.billing_total ?? 0),
            },
            {
              key: 'piutang',
              label: 'PIUTANG',
              style: { textAlign: 'right' },
              tdStyle: { textAlign: 'right' },
              render: (r) => {
                const tagihan = Number(r.invoice_total ?? r.billing_total ?? 0);
                const terbayar = Number(r.invoice_terbayar ?? 0);
                return formatRupiah(Math.max(0, tagihan - terbayar));
              },
            },
            {
              key: 'status',
              label: 'STATUS',
              render: (r) => {
                const invSt = r.invoice_status || (r.kunjungan_status === 'selesai' ? 'lunas' : 'belum_bayar');
                return (
                  <span className={`badge ${getStatusBadge(invSt)}`}>
                    {getStatusLabel(invSt)}
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
              render: (r) => (
                <div className="cell-actions-inner">
                  {r.invoice_status === 'lunas' || r.kunjungan_status === 'selesai' ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-light btn-icon"
                        onClick={() => openInvoiceModal(r.id)}
                        title="Cetak Struk"
                      >
                        <AppIcon name="print" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() => openDetailModal(r.id)}
                      >
                        <AppIcon name="eye" /> Lihat
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => openProsesModal(r.id)}
                    >
                      <AppIcon name="money" /> Bayar
                    </button>
                  )}
                </div>
              ),
            },
          ] : [
            {
              key: 'no_antrian',
              label: 'ANTRIAN',
              render: (r) => <b>{r.poli_kode || 'POL'}-{String(r.no_antrian || 0).padStart(3, '0')}</b>,
            },
            {
              key: 'no_kunjungan',
              label: 'NO. KUNJUNGAN',
            },
            {
              key: 'no_mr',
              label: 'NO. MR',
            },
            {
              key: 'pasien',
              label: 'PASIEN',
              render: (r) => r.pasien || r.pasien_nama,
            },
            {
              key: 'poli',
              label: 'POLI',
              render: (r) => r.poli || r.poli_nama,
            },
            {
              key: 'status',
              label: 'STATUS',
              render: (r) => {
                const st = r.status || r.kunjungan_status;
                const badge = { billing: 'badge-orange', pembayaran: 'badge-blue', selesai: 'badge-green' };
                return <span className={`badge ${badge[st] || 'badge-gray'}`}>{getStatusLabel(st)}</span>;
              },
            },
            {
              key: 'billing_total',
              label: 'TOTAL TAGIHAN',
              style: { textAlign: 'right' },
              tdStyle: { textAlign: 'right' },
              render: (r) =>
                r.billing_total !== null && r.billing_total !== undefined ? (
                  formatRupiah(r.billing_total)
                ) : (
                  <span style={{ color: 'var(--muted)' }}>Belum</span>
                ),
            },
            {
              key: 'aksi',
              label: 'AKSI',
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
                          onClick={() => openProsesModal(r.id)}
                        >
                          <AppIcon name="billing" /> Buat Billing
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => openBatalModal(r.id, `${r.pasien || r.pasien_nama} — ${r.no_kunjungan}`)}
                        >
                          <AppIcon name="close" /> Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-light"
                          onClick={() => openInvoiceModal(r.id)}
                          title="Cetak Invoice"
                        >
                          <AppIcon name="print" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light"
                          onClick={() => openDetailModal(r.id)}
                        >
                          <AppIcon name="eye" /> Lihat Detail
                        </button>
                        {st === 'pembayaran' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => openBatalModal(r.id, `${r.pasien || r.pasien_nama} — ${r.no_kunjungan}`)}
                          >
                            <AppIcon name="close" /> Batal
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
          emptyText="Belum ada data"
          rowKey="id"
        />
      </div>

      {/* MODAL PROSES KASIR & PEMBAYARAN */}
      {prosesModalOpen && (
        <div className="modal-overlay open" style={{ display: 'flex' }}>
          <div className="modal-box modal-lg" role="dialog" aria-modal="true" style={{ maxWidth: 840 }}>
            <div className="modal-head">
              <div className="modal-title">
                Proses Kasir & Pembayaran &mdash; {prosesData?.kunjungan?.no_kunjungan}
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setProsesModalOpen(false)}
                aria-label="Tutup"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {loadingProses ? (
                <div className="modal-loading">Memuat rincian tindakan dan biaya...</div>
              ) : !prosesData ? (
                <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>
                  Data tagihan tidak ditemukan.
                </div>
              ) : (
                <div>
                  {/* Hero Patient Info */}
                  <div className="bd-hero" style={{ marginBottom: 18 }}>
                    <div className="bd-hero-main">
                      <div className="bd-avatar">
                        <AppIcon name="user" />
                      </div>
                      <div>
                        <div className="bd-pasien">{prosesData.kunjungan?.pasien_nama}</div>
                        <div className="bd-meta">
                          <span>No. MR: <b>{prosesData.kunjungan?.no_mr}</b></span>
                          <span>Poli: <b>{prosesData.kunjungan?.poli_nama}</b></span>
                          <span>Penjamin: <b>{prosesData.kunjungan?.jenis_penjamin || 'Umum'}</b></span>
                        </div>
                      </div>
                    </div>
                    <div className="bd-hero-side">
                      <span className="bd-kunjungan">{prosesData.kunjungan?.no_kunjungan}</span>
                    </div>
                  </div>

                  {/* Breakdown Table */}
                  <div className="bd-section-title">
                    <AppIcon name="billing" /> Rincian Item Tagihan Layanan
                  </div>
                  <div className="bd-table-wrap">
                    <table className="bd-table">
                      <thead>
                        <tr>
                          <th>Item / Tindakan</th>
                          <th>Kategori</th>
                          <th style={{ textAlign: 'center' }}>Qty</th>
                          <th style={{ textAlign: 'right' }}>Tarif</th>
                          <th style={{ textAlign: 'right' }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(prosesData.lines || [])
                          .filter((l) => l.kategori !== 'administrasi')
                          .map((line, idx) => (
                            <tr key={idx}>
                              <td>
                                <b>{line.nama_item}</b>
                                {line.kode && (
                                  <span className="bd-code" style={{ marginLeft: 6 }}>
                                    {line.kode}
                                  </span>
                                )}
                              </td>
                              <td style={{ textTransform: 'capitalize' }}>{line.kategori}</td>
                              <td style={{ textAlign: 'center' }}>{line.qty}</td>
                              <td className="num">{formatRupiah(line.tarif)}</td>
                              <td className="num bold">{formatRupiah(line.subtotal)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations & Payment Form */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 20, marginTop: 20 }}>
                    {/* Left: Penyesuaian Biaya */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>Penyesuaian Biaya</div>
                      <div className="form-group">
                        <label>Biaya Administrasi</label>
                        <input
                          type="number"
                          className="form-control"
                          value={administrasi}
                          onChange={(e) => setAdministrasi(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Diskon / Potongan</label>
                        <input
                          type="number"
                          className="form-control"
                          value={diskon}
                          onChange={(e) => setDiskon(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Metode Pembayaran</label>
                        <select
                          className="form-control"
                          value={metodeBayar}
                          onChange={(e) => setMetodeBayar(e.target.value)}
                        >
                          <option value="cash">Tunai (Cash)</option>
                          <option value="transfer">Transfer Bank / EDC</option>
                          <option value="penjamin">Klaim Asuransi / BPJS</option>
                        </select>
                      </div>
                      {metodeBayar === 'transfer' && prosesData.banks && (
                        <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                          <label>Rekening Bank Tujuan</label>
                          <select
                            className="form-control"
                            value={bankId}
                            onChange={(e) => setBankId(e.target.value)}
                          >
                            {prosesData.banks.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.nama_bank} ({b.no_rekening}) - a.n. {b.atas_nama}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Right: Ringkasan Total & Nominal Uang */}
                    <div className="bd-summary" style={{ margin: 0, maxWidth: 'none' }}>
                      <div className="bd-sum-row">
                        <span>Total Rincian Layanan</span>
                        <b>
                          {formatRupiah(
                            (prosesData.lines || [])
                              .filter((l) => l.kategori !== 'administrasi')
                              .reduce((s, l) => s + Number(l.subtotal || 0), 0)
                          )}
                        </b>
                      </div>
                      <div className="bd-sum-row">
                        <span>Biaya Administrasi</span>
                        <b>+{formatRupiah(administrasi)}</b>
                      </div>
                      {parseFloat(diskon) > 0 && (
                        <div className="bd-sum-row disc">
                          <span>Diskon</span>
                          <b>-{formatRupiah(diskon)}</b>
                        </div>
                      )}
                      <div className="bd-sum-total">
                        <span>TOTAL TAGIHAN</span>
                        <span className="bd-total-val">{formatRupiah(liveTotal)}</span>
                      </div>

                      {metodeBayar === 'cash' && (
                        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                          <div className="form-group">
                            <label style={{ fontSize: 13 }}>Uang Diterima Pasien</label>
                            <input
                              type="number"
                              className="form-control"
                              value={jumlahUang}
                              onChange={(e) => setJumlahUang(e.target.value)}
                              placeholder="Nominal uang tunai..."
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, color: kembalian >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            <span>Kembalian:</span>
                            <span>{formatRupiah(kembalian)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => setProsesModalOpen(false)}
                      disabled={submittingPayment}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleProsesDanBayar(false)}
                      disabled={submittingPayment}
                    >
                      Simpan Billing Saja
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleProsesDanBayar(true)}
                      disabled={submittingPayment || (metodeBayar === 'cash' && bayarAmount < liveTotal)}
                    >
                      <AppIcon name="money" /> Terima Pembayaran (Lunas)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL TAGIHAN READ-ONLY */}
      {detailModalOpen && (
        <div className="modal-overlay open" style={{ display: 'flex' }}>
          <div className="modal-box modal-lg" role="dialog" aria-modal="true" style={{ maxWidth: 840 }}>
            <div className="modal-head">
              <div className="modal-title">Detail Rincian Tagihan Pasien</div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDetailModalOpen(false)}
                aria-label="Tutup"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {loadingDetail ? (
                <div className="modal-loading">Memuat detail tagihan...</div>
              ) : !detailData ? (
                <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>
                  Data tidak ditemukan.
                </div>
              ) : (
                <div className="bill-detail">
                  <div className="bd-hero">
                    <div className="bd-hero-main">
                      <div className="bd-avatar">
                        <AppIcon name="user" />
                      </div>
                      <div>
                        <div className="bd-pasien">{detailData.kunjungan?.pasien_nama}</div>
                        <div className="bd-meta">
                          <span>No. MR: <b>{detailData.kunjungan?.no_mr}</b></span>
                          <span>Poli: <b>{detailData.kunjungan?.poli_nama}</b></span>
                          <span>Penjamin: <b>{detailData.kunjungan?.jenis_penjamin || 'Umum'}</b></span>
                        </div>
                      </div>
                    </div>
                    <div className="bd-hero-side">
                      <span className="bd-kunjungan">{detailData.kunjungan?.no_kunjungan}</span>
                    </div>
                  </div>

                  <div className="bd-table-wrap">
                    <table className="bd-table">
                      <thead>
                        <tr>
                          <th>Item / Tindakan</th>
                          <th>Kategori</th>
                          <th style={{ textAlign: 'center' }}>Qty</th>
                          <th style={{ textAlign: 'right' }}>Tarif</th>
                          <th style={{ textAlign: 'right' }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailData.lines || []).map((line, idx) => (
                          <tr key={idx}>
                            <td>
                              <b>{line.nama_item}</b>
                              {line.kode && (
                                <span className="bd-code" style={{ marginLeft: 6 }}>
                                  {line.kode}
                                </span>
                              )}
                            </td>
                            <td style={{ textTransform: 'capitalize' }}>{line.kategori}</td>
                            <td style={{ textAlign: 'center' }}>{line.qty}</td>
                            <td className="num">{formatRupiah(line.tarif)}</td>
                            <td className="num bold">{formatRupiah(line.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bd-summary">
                    <div className="bd-sum-row">
                      <span>Subtotal Item</span>
                      <b>
                        {formatRupiah(
                          (detailData.lines || [])
                            .filter((l) => l.kategori !== 'administrasi')
                            .reduce((s, l) => s + Number(l.subtotal || 0), 0)
                        )}
                      </b>
                    </div>
                    <div className="bd-sum-row">
                      <span>Biaya Administrasi</span>
                      <b>
                        +{formatRupiah(
                          (detailData.lines || []).find((l) => l.kategori === 'administrasi')?.subtotal || 0
                        )}
                      </b>
                    </div>
                    {parseFloat(detailData.diskon || 0) > 0 && (
                      <div className="bd-sum-row disc">
                        <span>Diskon</span>
                        <b>-{formatRupiah(detailData.diskon)}</b>
                      </div>
                    )}
                    <div className="bd-sum-total">
                      <span>TOTAL TAGIHAN</span>
                      <span className="bd-total-val">{formatRupiah(detailData.total)}</span>
                    </div>
                  </div>

                  <div className="bd-actions">
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => openInvoiceModal(activeKunjunganId)}
                    >
                      <AppIcon name="print" /> Cetak Kwitansi
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CETAK INVOICE / KWITANSI */}
      {invoiceModalOpen && (
        <div className="modal-overlay open" style={{ display: 'flex' }}>
          <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 650 }}>
            <div className="modal-head">
              <div className="modal-title">Kwitansi Pembayaran Resmi</div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setInvoiceModalOpen(false)}
                aria-label="Tutup"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {loadingInvoice ? (
                <div className="modal-loading">Memuat data kwitansi...</div>
              ) : !invoiceData ? (
                <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>
                  Kwitansi belum diterbitkan.
                </div>
              ) : (
                <div style={{ background: '#fff', color: '#000', padding: '16px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '14px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', textTransform: 'uppercase' }}>Klinik Pratama Sehat Sejahtera</h2>
                    <div style={{ fontSize: '12px', color: '#555' }}>
                      Jl. Boulevard Gading Serpong, Tangerang &middot; Telp. (021) 555-0199
                    </div>
                    <h3 style={{ margin: '8px 0 0', fontSize: '15px', textDecoration: 'underline' }}>BUKTI PEMBAYARAN KASIR</h3>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{invoiceData.invoice?.no_invoice}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '13px', marginBottom: '14px' }}>
                    <div>
                      <div>No. MR: <b>{invoiceData.kunjungan?.no_mr}</b></div>
                      <div>Pasien: <b>{invoiceData.kunjungan?.pasien_nama}</b></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div>Tanggal: {formatTglId(invoiceData.invoice?.created_at?.split('T')[0] || selectedDate)}</div>
                      <div>Poli: {invoiceData.kunjungan?.poli_nama}</div>
                    </div>
                  </div>

                  <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse', marginBottom: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #333', borderTop: '1px solid #333' }}>
                        <th style={{ textAlign: 'left', padding: '4px 0' }}>Layanan / Obat</th>
                        <th style={{ textAlign: 'center', padding: '4px 0' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '4px 0' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoiceData.lines || []).map((l, i) => (
                        <tr key={i} style={{ borderBottom: '1px dotted #ccc' }}>
                          <td style={{ padding: '4px 0' }}>{l.nama_item}</td>
                          <td style={{ textAlign: 'center', padding: '4px 0' }}>{l.qty}</td>
                          <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatRupiah(l.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '14px', fontWeight: 'bold', marginBottom: '16px' }}>
                    <div style={{ width: '220px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <span>Total:</span>
                        <span>{formatRupiah(invoiceData.invoice?.total)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <span>Terbayar:</span>
                        <span>{formatRupiah(invoiceData.invoice?.terbayar)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                    Terima kasih atas kunjungan dan kepercayaan Anda. Semoga lekas sembuh.
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-light" onClick={() => setInvoiceModalOpen(false)}>
                  Tutup
                </button>
                <button type="button" className="btn" onClick={() => window.print()}>
                  <AppIcon name="print" /> Cetak Kwitansi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEMBATALAN BILLING */}
      {batalModalOpen && (
        <div className="modal-overlay open" style={{ display: 'flex' }}>
          <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <div className="modal-title">Pembatalan Billing / Kunjungan</div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setBatalModalOpen(false)}
                aria-label="Tutup"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleBatalBilling} className="modal-body">
              <p style={{ margin: '0 0 14px', color: 'var(--muted)' }}>
                {batalLabel}
              </p>
              <div className="form-group">
                <label>Alasan Pembatalan <span className="req">*</span></label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={alasanBatal}
                  onChange={(e) => setAlasanBatal(e.target.value)}
                  placeholder="Tuliskan alasan pembatalan..."
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setBatalModalOpen(false)}
                  disabled={submittingBatal}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={submittingBatal}
                >
                  <AppIcon name="close" /> Batalkan Billing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
