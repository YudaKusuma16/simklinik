import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import { useI18n } from '../i18n';

export default function KeuanganBayarView({ kunjunganId, onBack }) {
  const { t, isEn, trans, formatTgl } = useI18n();
  const [loading, setLoading] = useState(true);
  const [kunjungan, setKunjungan] = useState(null);
  const [billing, setBilling] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [pembayaranList, setPembayaranList] = useState([]);
  const [banks, setBanks] = useState([]);

  // Form states
  const [metode, setMetode] = useState('cash');
  const [bankId, setBankId] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, [kunjunganId]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  };

  const formatRupiah = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  };

  const formatTglId = (dateStr, withTime = false) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const monthsId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const months = isEn ? monthsEn : monthsId;
      const datePart = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      if (!withTime) return datePart;
      const timePart = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `${datePart} ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  const getMetodeLabel = (m) => {
    switch (m) {
      case 'cash': return trans('Tunai (Cash)', 'Cash');
      case 'transfer': return trans('Transfer Bank', 'Bank Transfer');
      case 'qris': return 'QRIS';
      case 'edc': return trans('Mesin EDC / Kartu', 'EDC Machine / Card');
      case 'va': return 'Virtual Account (VA)';
      case 'ewallet': return 'E-Wallet';
      case 'penjamin': return trans('Tanggungan Penjamin', 'Guarantor Coverage');
      default: return m || trans('Tunai', 'Cash');
    }
  };

  const getPenjaminLabel = (p) => {
    switch (p) {
      case 'umum': return trans('Umum', 'General');
      case 'asuransi': return trans('Asuransi Swasta', 'Private Insurance');
      case 'bpjs': return 'BPJS Kesehatan';
      case 'corporate': return 'Corporate';
      case 'ar': return 'AR';
      default: return p || trans('Umum', 'General');
    }
  };

  const handleCetakStruk = (invId, isCopy = false) => {
    const targetId = invId || invoice?.id || kunjunganId;
    if (!targetId) return;
    const copyParam = isCopy ? '&copy=1' : '';
    window.open(`/legacy/modules/keuangan/struk.php?invoice_id=${targetId}${copyParam}`, '_blank');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/billing/proses/${kunjunganId}`);
      if (res && res.success) {
        setKunjungan(res.kunjungan);
        setBilling(res.billing);
        setInvoice(res.invoice);
        setPembayaranList(res.pembayaran || []);
        setBanks(res.banks || []);

        const pmts = res.pembayaran || [];
        const totalBill = Number(res.invoice?.total || res.billing?.total || res.total || 0);
        const realTerbayar = Number(res.invoice?.terbayar || 0);

        let hasPenjPmt = false;
        let penjPmtAmt = 0;
        pmts.forEach((p) => {
          if (p.metode === 'penjamin') {
            hasPenjPmt = true;
            penjPmtAmt += Number(p.jumlah || 0);
          }
        });

        let coverPenjVal = Number(res.billing?.cover_penjamin || 0);
        if (res.kunjungan?.jenis_penjamin !== 'umum' && coverPenjVal <= 0 && !hasPenjPmt) {
          coverPenjVal = totalBill;
        }

        const effCover = hasPenjPmt ? penjPmtAmt : (res.kunjungan?.jenis_penjamin !== 'umum' ? coverPenjVal : 0);
        const tanggunganPasien = Math.max(0, totalBill - effCover);
        const realPasienPaid = hasPenjPmt ? Math.max(0, realTerbayar - penjPmtAmt) : realTerbayar;
        const sisaPasien = Math.max(0, tanggunganPasien - realPasienPaid);

        if (!hasPenjPmt && effCover >= totalBill && res.kunjungan?.jenis_penjamin !== 'umum') {
          setMetode('penjamin');
          setJumlah(String(totalBill));
          const penjName = res.kunjungan?.asuransi_nama || res.kunjungan?.corporate_nama || (res.kunjungan?.jenis_penjamin || '').toUpperCase();
          setKeterangan(`Tanggungan ${penjName}`);
        } else {
          setMetode('cash');
          setJumlah(String(sisaPasien > 0 ? sisaPasien : ''));
          setKeterangan('');
        }

        if (res.banks && res.banks.length > 0) {
          setBankId(res.banks[0].id);
        }
      } else {
        showToast('danger', res?.message || 'Gagal memuat data pembayaran.');
      }
    } catch (err) {
      showToast('danger', err.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPembayaran = async (e) => {
    e.preventDefault();
    const jm = parseFloat(jumlah);
    if (!jm || jm <= 0) {
      showToast('danger', trans('Jumlah bayar harus lebih dari 0.', 'Payment amount must be greater than 0.'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/billing/bayar/${kunjunganId}`, {
        metode,
        bank_id: metode === 'transfer' ? parseInt(bankId, 10) : null,
        jumlah: jm,
        keterangan: keterangan.trim() || 'Pembayaran kasir',
      });

      if (res && res.success) {
        showToast('success', res.message || trans('Pembayaran lunas. Kunjungan selesai. Silakan cetak struk.', 'Payment completed. Visit finished. Please print receipt.'));
        await loadData();
      } else {
        showToast('danger', res?.message || trans('Gagal memproses pembayaran.', 'Failed to process payment.'));
      }
    } catch (err) {
      showToast('danger', err.message || trans('Gagal memproses pembayaran.', 'Failed to process payment.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>
        {trans('Memuat lembar pembayaran kasir...', 'Loading cashier payment sheet...')}
      </div>
    );
  }

  if (!kunjungan) {
    return (
      <div style={{ padding: '20px 0' }}>
        <button type="button" className="btn btn-light btn-sm" onClick={() => onBack()}>
          <AppIcon name="arrowleft" /> {trans('Kembali', 'Back')}
        </button>
        <div className="alert alert-danger" style={{ marginTop: 14 }}>
          {trans('Data kunjungan tidak ditemukan.', 'Visit data not found.')}
        </div>
      </div>
    );
  }

  // Perhitungan Keuangan persis bayar.php
  const totalBill = Number(invoice?.total || billing?.total || 0);
  const realTerbayar = Number(invoice?.terbayar || 0);

  let hasPenjaminPmt = false;
  let penjaminPmtAmt = 0;
  pembayaranList.forEach((p) => {
    if (p.metode === 'penjamin') {
      hasPenjaminPmt = true;
      penjaminPmtAmt += Number(p.jumlah || 0);
    }
  });

  let coverPenjVal = Number(billing?.cover_penjamin || 0);
  if (kunjungan.jenis_penjamin !== 'umum' && coverPenjVal <= 0 && !hasPenjaminPmt) {
    coverPenjVal = totalBill;
  }

  const effectivePenjaminCover = hasPenjaminPmt ? penjaminPmtAmt : (kunjungan.jenis_penjamin !== 'umum' ? coverPenjVal : 0);
  const penjaminNama = kunjungan.asuransi_nama || kunjungan.corporate_nama || (kunjungan.jenis_penjamin || '').toUpperCase();
  const tanggunganPasien = Math.max(0, totalBill - effectivePenjaminCover);
  const realPasienPaid = hasPenjaminPmt ? Math.max(0, realTerbayar - penjaminPmtAmt) : realTerbayar;
  const sisaPasien = Math.max(0, tanggunganPasien - realPasienPaid);
  const isLunas = invoice?.status === 'lunas' || sisaPasien <= 0;

  return (
    <div>
      {/* Toast / Flash Alert di atas tombol kembali persis screenshot */}
      {toast && (
        <div className={`alert alert-${toast.type}`} style={{ marginBottom: 14 }}>
          <AppIcon name={toast.type === 'success' ? 'check' : 'close'} /> {toast.message}
        </div>
      )}

      {/* Tombol Kembali persis legacy */}
      <button
        type="button"
        className="btn btn-light btn-sm"
        onClick={() => onBack()}
        style={{ marginBottom: 14 }}
      >
        <AppIcon name="arrowleft" /> {trans('Kembali', 'Back')}
      </button>

      <div className="pay-page" style={{ marginTop: 0 }}>
        {/* Hero: Identitas Pasien & Invoice persis bayar.php */}
        <div className="bd-hero">
          <div className="bd-hero-glow"></div>
          <div className="bd-hero-main">
            <div className="bd-avatar">
              <AppIcon name="idcard" />
            </div>
            <div>
              <div className="bd-pasien">{kunjungan.pasien || kunjungan.pasien_nama}</div>
              <div className="bd-meta">
                <span><AppIcon name="user" /> {trans('No. MR', 'MR No.')} <b>{kunjungan.no_mr}</b></span>
                <span><AppIcon name="hospital" /> {kunjungan.poli || kunjungan.poli_nama}</span>
                <span><AppIcon name="ticket" /> {kunjungan.no_kunjungan}</span>
              </div>
            </div>
          </div>
          <div className="bd-hero-side">
            <div className="bd-kunjungan">
              Invoice {invoice?.no_invoice || '-'}
            </div>
            <span className={`badge ${isLunas ? 'badge-green' : 'badge-orange'}`}>
              {isLunas ? trans('LUNAS', 'PAID') : trans('Belum Lunas', 'Unpaid')}
            </span>
          </div>
        </div>

        {/* Verifikasi Penjamin */}
        <div className="pay-penjamin">
          {kunjungan.jenis_penjamin === 'umum' ? (
            <>
              <span className="badge badge-gray">{trans('UMUM / CASH', 'SELF-PAY / CASH')}</span>
              <span>{trans('Pasien membayar sendiri (tanpa penjamin).', 'Patient pays directly (no guarantor).')}</span>
            </>
          ) : (
            <>
              <span className="badge badge-blue">{getPenjaminLabel(kunjungan.jenis_penjamin)}</span>
              {kunjungan.asuransi_nama && <span>&middot; <b>{kunjungan.asuransi_nama}</b></span>}
              {kunjungan.corporate_nama && (
                <span>&middot; <b>{kunjungan.corporate_nama}</b> {kunjungan.limit_jaminan > 0 && `(limit ${formatRupiah(kunjungan.limit_jaminan)})`}</span>
              )}
              {kunjungan.no_jaminan && <span>&middot; {trans('No. Jaminan:', 'Guarantee No.:')} <b>{kunjungan.no_jaminan}</b></span>}
            </>
          )}
        </div>

        {/* 2 Kolom: Ringkasan Tagihan & Form Input Pembayaran */}
        <div className="pay-grid">
          {/* Kolom Kiri: Ringkasan Tagihan */}
          <div className="pay-card">
            <div className="pay-card-title">
              <AppIcon name="billing" /> {trans('Ringkasan Tagihan', 'Billing Summary')}
            </div>
            <div className="pay-sum-rows">
              <div className="bd-sum-row">
                <span>{trans('Total Tagihan', 'Total Bill')}</span>
                <b>{formatRupiah(totalBill)}</b>
              </div>
              {kunjungan.jenis_penjamin !== 'umum' && (
                <>
                  <div className="bd-sum-row" style={{ color: 'var(--primary)' }}>
                    <span>{trans('Tanggungan Penjamin', 'Guarantor Coverage')} ({penjaminNama})</span>
                    <b>{formatRupiah(effectivePenjaminCover)}</b>
                  </div>
                  <div className="bd-sum-row" style={{ fontWeight: 600 }}>
                    <span>{trans('Tanggungan Pasien', 'Patient Responsibility')}</span>
                    <b>{formatRupiah(tanggunganPasien)}</b>
                  </div>
                </>
              )}
              {(realPasienPaid > 0 || kunjungan.jenis_penjamin === 'umum') && (
                <div className="bd-sum-row">
                  <span>{trans('Sudah Terbayar Pasien', 'Paid by Patient')}</span>
                  <b style={{ color: 'var(--green)' }}>{formatRupiah(realPasienPaid)}</b>
                </div>
              )}
            </div>

            <div className={`pay-sisa ${sisaPasien > 0 ? 'owe' : 'paid'}`}>
              <div className="lbl">{trans('SISA TAGIHAN PASIEN', 'PATIENT REMAINING BALANCE')}</div>
              <div className="val">{formatRupiah(sisaPasien)}</div>
            </div>

            {isLunas && (
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-green"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => handleCetakStruk(invoice?.id, false)}
                >
                  <AppIcon name="print" /> {trans('Cetak Struk', 'Print Receipt')}
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  style={{ flex: 1, justifyContent: 'center', border: '1px solid #cbd5e1' }}
                  onClick={() => handleCetakStruk(invoice?.id, true)}
                >
                  {trans('Cetak Copy', 'Print Copy')}
                </button>
              </div>
            )}
          </div>

          {/* Kolom Kanan: Input Pembayaran */}
          <div className="pay-card">
            <div className="pay-card-title">
              <AppIcon name="money" /> {trans('Input Pembayaran', 'Payment Input')}
            </div>
            {isLunas ? (
              <div className="pay-lunas-banner">
                <AppIcon name="check" />
                <div>
                  <b>{trans('Tagihan sudah lunas', 'Bill is fully paid')}</b>
                  <small>{trans('Tidak ada pembayaran lagi. Silakan cetak struk.', 'No further payment required. Please print receipt.')}</small>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitPembayaran}>
                <div className="form-group">
                  <label>{trans('Metode Pembayaran', 'Payment Method')}</label>
                  <select
                    className="form-control"
                    value={metode}
                    onChange={(e) => setMetode(e.target.value)}
                  >
                    <option value="cash">{trans('Tunai (Cash)', 'Cash')}</option>
                    <option value="transfer">{trans('Transfer Bank', 'Bank Transfer')}</option>
                    <option value="qris">QRIS</option>
                    <option value="edc">{trans('Mesin EDC / Kartu', 'EDC Machine / Card')}</option>
                    <option value="va">Virtual Account (VA)</option>
                    <option value="ewallet">E-Wallet</option>
                    {kunjungan.jenis_penjamin !== 'umum' && (
                      <option value="penjamin">{trans('Tanggungan Penjamin', 'Guarantor Coverage')}</option>
                    )}
                  </select>
                </div>

                {metode === 'transfer' && (
                  <div className="form-group">
                    <label>{trans('Pilih Bank Tujuan', 'Select Target Bank')}</label>
                    <select
                      className="form-control"
                      value={bankId}
                      onChange={(e) => setBankId(e.target.value)}
                      required
                    >
                      <option value="">{trans('Pilih Bank Tujuan...', 'Select Target Bank...')}</option>
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nama_bank} &mdash; {b.no_rekening} ({b.atas_nama})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>{trans('Jumlah Bayar', 'Payment Amount')}</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    className="form-control"
                    value={jumlah}
                    onChange={(e) => setJumlah(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{trans('Keterangan / Catatan Transaksi', 'Transaction Notes')}</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={trans('Contoh: Pembayaran tunai kasir...', 'E.g., Cash payment...')}
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-green"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={submitting}
                >
                  <AppIcon name="check" /> {submitting ? trans('Menyimpan...', 'Saving...') : trans('Simpan Pembayaran', 'Save Payment')}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bagian Bawah: Riwayat Pembayaran */}
        <div className="pay-card">
          <div className="pay-card-title">
            <AppIcon name="clock" /> {trans('Riwayat Pembayaran', 'Payment History')}
          </div>
          <div className="bd-table-wrap">
            <table className="bd-table">
              <thead>
                <tr>
                  <th>{trans('WAKTU', 'TIME')}</th>
                  <th>{trans('METODE PEMBAYARAN', 'PAYMENT METHOD')}</th>
                  <th>{trans('BANK', 'BANK')}</th>
                  <th className="num">{trans('JUMLAH', 'AMOUNT')}</th>
                  <th>{trans('BUKTI', 'PROOF')}</th>
                  <th>{trans('KASIR', 'CASHIER')}</th>
                </tr>
              </thead>
              <tbody>
                {pembayaranList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="bd-empty">
                      {trans('Belum ada pembayaran.', 'No payment records yet.')}
                    </td>
                  </tr>
                ) : (
                  pembayaranList.map((pm, idx) => (
                    <tr key={idx}>
                      <td>{formatTglId(pm.tanggal || pm.created_at, true)}</td>
                      <td>
                        <span className="badge badge-gray">{getMetodeLabel(pm.metode)}</span>
                      </td>
                      <td>{pm.nama_bank || '-'}</td>
                      <td className="num bold">{formatRupiah(pm.jumlah)}</td>
                      <td>
                        {pm.bukti ? (
                          <a href={`/${pm.bukti}`} target="_blank" rel="noreferrer">
                            {trans('Lihat', 'View')}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{pm.kasir_nama || pm.kasir || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
