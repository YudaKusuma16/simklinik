import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';

export default function KeuanganBayarView({ kunjunganId, onBack }) {
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
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
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
      case 'cash': return 'Tunai (Cash)';
      case 'transfer': return 'Transfer Bank';
      case 'qris': return 'QRIS';
      case 'edc': return 'Mesin EDC / Kartu';
      case 'va': return 'Virtual Account (VA)';
      case 'ewallet': return 'E-Wallet';
      case 'penjamin': return 'Tanggungan Penjamin';
      default: return m || 'Tunai';
    }
  };

  const getPenjaminLabel = (p) => {
    switch (p) {
      case 'umum': return 'Umum';
      case 'asuransi': return 'Asuransi Swasta';
      case 'bpjs': return 'BPJS Kesehatan';
      case 'corporate': return 'Corporate';
      case 'ar': return 'AR';
      default: return p || 'Umum';
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
      showToast('danger', 'Jumlah bayar harus lebih dari 0.');
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
        showToast('success', res.message || 'Pembayaran lunas. Kunjungan selesai. Silakan cetak struk.');
        await loadData();
      } else {
        showToast('danger', res?.message || 'Gagal memproses pembayaran.');
      }
    } catch (err) {
      showToast('danger', err.message || 'Gagal memproses pembayaran.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>
        Memuat lembar pembayaran kasir...
      </div>
    );
  }

  if (!kunjungan) {
    return (
      <div style={{ padding: '20px 0' }}>
        <button type="button" className="btn btn-light btn-sm" onClick={() => onBack()}>
          <AppIcon name="arrowleft" /> Kembali
        </button>
        <div className="alert alert-danger" style={{ marginTop: 14 }}>
          Data kunjungan tidak ditemukan.
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
        <AppIcon name="arrowleft" /> Kembali
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
                <span><AppIcon name="user" /> No. MR <b>{kunjungan.no_mr}</b></span>
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
              {isLunas ? 'LUNAS' : 'Belum Lunas'}
            </span>
          </div>
        </div>

        {/* Verifikasi Penjamin */}
        <div className="pay-penjamin">
          {kunjungan.jenis_penjamin === 'umum' ? (
            <>
              <span className="badge badge-gray">UMUM / CASH</span>
              <span>Pasien membayar sendiri (tanpa penjamin).</span>
            </>
          ) : (
            <>
              <span className="badge badge-blue">{getPenjaminLabel(kunjungan.jenis_penjamin)}</span>
              {kunjungan.asuransi_nama && <span>&middot; <b>{kunjungan.asuransi_nama}</b></span>}
              {kunjungan.corporate_nama && (
                <span>&middot; <b>{kunjungan.corporate_nama}</b> {kunjungan.limit_jaminan > 0 && `(limit ${formatRupiah(kunjungan.limit_jaminan)})`}</span>
              )}
              {kunjungan.no_jaminan && <span>&middot; No. Jaminan: <b>{kunjungan.no_jaminan}</b></span>}
            </>
          )}
        </div>

        {/* 2 Kolom: Ringkasan Tagihan & Form Input Pembayaran */}
        <div className="pay-grid">
          {/* Kolom Kiri: Ringkasan Tagihan */}
          <div className="pay-card">
            <div className="pay-card-title">
              <AppIcon name="billing" /> Ringkasan Tagihan
            </div>
            <div className="pay-sum-rows">
              <div className="bd-sum-row">
                <span>Total Tagihan</span>
                <b>{formatRupiah(totalBill)}</b>
              </div>
              {kunjungan.jenis_penjamin !== 'umum' && (
                <>
                  <div className="bd-sum-row" style={{ color: 'var(--primary)' }}>
                    <span>Tanggungan Penjamin ({penjaminNama})</span>
                    <b>{formatRupiah(effectivePenjaminCover)}</b>
                  </div>
                  <div className="bd-sum-row" style={{ fontWeight: 600 }}>
                    <span>Tanggungan Pasien</span>
                    <b>{formatRupiah(tanggunganPasien)}</b>
                  </div>
                </>
              )}
              {(realPasienPaid > 0 || kunjungan.jenis_penjamin === 'umum') && (
                <div className="bd-sum-row">
                  <span>Sudah Terbayar Pasien</span>
                  <b style={{ color: 'var(--green)' }}>{formatRupiah(realPasienPaid)}</b>
                </div>
              )}
            </div>

            <div className={`pay-sisa ${sisaPasien > 0 ? 'owe' : 'paid'}`}>
              <div className="lbl">SISA TAGIHAN PASIEN</div>
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
                  <AppIcon name="print" /> Cetak Struk
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  style={{ flex: 1, justifyContent: 'center', border: '1px solid #cbd5e1' }}
                  onClick={() => handleCetakStruk(invoice?.id, true)}
                >
                  Cetak Copy
                </button>
              </div>
            )}
          </div>

          {/* Kolom Kanan: Input Pembayaran */}
          <div className="pay-card">
            <div className="pay-card-title">
              <AppIcon name="money" /> Input Pembayaran
            </div>
            {isLunas ? (
              <div className="pay-lunas-banner">
                <AppIcon name="check" />
                <div>
                  <b>Tagihan sudah lunas</b>
                  <small>Tidak ada pembayaran lagi. Silakan cetak struk.</small>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitPembayaran}>
                <div className="form-group">
                  <label>Metode Pembayaran</label>
                  <select
                    className="form-control"
                    value={metode}
                    onChange={(e) => setMetode(e.target.value)}
                  >
                    <option value="cash">Tunai (Cash)</option>
                    <option value="transfer">Transfer Bank</option>
                    <option value="qris">QRIS</option>
                    <option value="edc">Mesin EDC / Kartu</option>
                    <option value="va">Virtual Account (VA)</option>
                    <option value="ewallet">E-Wallet</option>
                    {kunjungan.jenis_penjamin !== 'umum' && (
                      <option value="penjamin">Tanggungan Penjamin</option>
                    )}
                  </select>
                </div>

                {metode === 'transfer' && (
                  <div className="form-group">
                    <label>Pilih Bank Tujuan</label>
                    <select
                      className="form-control"
                      value={bankId}
                      onChange={(e) => setBankId(e.target.value)}
                      required
                    >
                      <option value="">Pilih Bank Tujuan...</option>
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nama_bank} &mdash; {b.no_rekening} ({b.atas_nama})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Jumlah Bayar</label>
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
                  <label>Keterangan</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Catatan pembayaran (opsional)..."
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
                  <AppIcon name="check" /> {submitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bagian Bawah: Riwayat Pembayaran */}
        <div className="pay-card">
          <div className="pay-card-title">
            <AppIcon name="clock" /> Riwayat Pembayaran
          </div>
          <div className="bd-table-wrap">
            <table className="bd-table">
              <thead>
                <tr>
                  <th>WAKTU</th>
                  <th>METODE PEMBAYARAN</th>
                  <th>BANK</th>
                  <th className="num">JUMLAH</th>
                  <th>BUKTI</th>
                  <th>KASIR</th>
                </tr>
              </thead>
              <tbody>
                {pembayaranList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="bd-empty">
                      Belum ada pembayaran.
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
                            Lihat
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
