import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';

export default function CetakStrukView({ invoiceId, docType = 'RECEIPT', isCopy = false }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!invoiceId) {
      setError('ID Invoice atau Kunjungan tidak ditemukan.');
      setLoading(false);
      return;
    }
    loadInvoiceData();
  }, [invoiceId]);

  const loadInvoiceData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/billing/invoice/${invoiceId}`);
      if (res && res.success && res.data) {
        setData(res.data);
      } else {
        setError(res?.message || 'Gagal memuat dokumen cetak.');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat memuat data invoice.');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatTgl = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const formatTglIndoLong = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const formatTglEnLong = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // Convert number to words in English
  const numberToWordsEn = (num) => {
    if (!num || num === 0) return 'Zero Rupiah';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function inWords(n) {
      n = Math.floor(n);
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' And ' + inWords(n % 100) : '');
      if (n < 1000000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
      if (n < 1000000000) return inWords(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + inWords(n % 1000000) : '');
      return '';
    }
    return inWords(num).replace(/\s+/g, ' ').trim() + ' Rupiah';
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <h3>Memuat Dokumen {docType === 'INVOICE' ? 'Invoice' : 'Struk'}...</h3>
      </div>
    );
  }

  if (error || !data || !data.invoice) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <div style={{ maxWidth: 500, margin: '0 auto', background: '#fee2e2', color: '#dc2626', padding: 20, borderRadius: 8 }}>
          <b>Terjadi Kesalahan:</b> {error || 'Data invoice tidak ditemukan.'}
        </div>
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => window.close()}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Tutup Tab
          </button>
        </div>
      </div>
    );
  }

  const { invoice, billing, items = [], pembayaran = [], bank } = data;

  // Format invoice number prefix GBRI for rawat inap vs GBRJ
  const rawNoInvoice = invoice.no_invoice || 'INV-00000000-0000';
  const displayNoInvoice = (invoice.jenis_registrasi === 'rawat_inap')
    ? rawNoInvoice.replace(/^GBRJ/i, 'GBRI')
    : rawNoInvoice.replace(/^GBRI/i, 'GBRJ');

  // Group items by category
  const groupItems = {};
  items.forEach((item) => {
    let cat = (item.kategori || 'tindakan').toLowerCase();
    let groupLabel = 'MEDICAL SERVICE';
    if (cat.includes('konsul') || cat.includes('jasa_dokter')) groupLabel = 'CONSULTATION';
    else if (cat.includes('obat') || cat.includes('farmasi') || cat.includes('alkes')) groupLabel = 'PHARMACY';
    else if (cat.includes('lab')) groupLabel = 'LABORATORY';
    else if (cat.includes('rad')) groupLabel = 'RADIOLOGY';
    else if (cat.includes('admin')) groupLabel = 'ADMINISTRATION';

    if (!groupItems[groupLabel]) groupItems[groupLabel] = [];
    groupItems[groupLabel].push(item);
  });

  const totalTagihan = Number(invoice.total || billing?.total || 0);
  const diskon = Number(billing?.diskon || 0);
  const adminFee = Number(billing?.biaya_admin || 0);
  const coverPenjamin = Number(billing?.cover_penjamin || 0);
  const terbayar = Number(invoice.terbayar || 0);
  const netPayable = coverPenjamin > 0 ? Math.max(0, totalTagihan - coverPenjamin) : totalTagihan;
  const sisa = Math.max(0, totalTagihan - terbayar);

  const formatGuarantorName = () => {
    if (!invoice) return 'UMUM (PRIBADI)';
    const jp = (invoice.jenis_penjamin || 'umum').toLowerCase();
    if (jp === 'bpjs') return 'BPJS KESEHATAN';
    if (jp === 'asuransi') return `ASURANSI - ${(invoice.asuransi_nama || 'SWASTA').toUpperCase()}`;
    if (jp === 'corporate') return `CORPORATE - ${(invoice.corporate_nama || 'PERUSAHAAN').toUpperCase()}`;
    if (jp === 'ar') return 'A/R PATIENT';
    return 'UMUM (PRIBADI)';
  };

  const paymentDate = invoice.tanggal || new Date().toISOString();
  const printDate = new Date().toISOString();
  const admissionDate = invoice.admission || invoice.tgl_kunjungan || printDate;
  const dischargeDate = invoice.tgl_kunjungan || printDate;

  return (
    <div className="print-struk-page">
      <style>{`
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #eef2f7;
          color: #1e293b;
          margin: 0;
          padding: 24px;
          display: flex;
          justify-content: center;
        }
        .print-struk-page {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .paper {
          background: #fff;
          width: 720px;
          max-width: 100%;
          padding: 34px 40px;
          box-shadow: 0 2px 10px rgba(0,0,0,.1);
          box-sizing: border-box;
          position: relative;
        }
        ${isCopy ? `
        .paper::before {
          content: "COPY";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 160px;
          color: rgba(150, 150, 150, 0.14);
          font-weight: 900;
          letter-spacing: 20px;
          z-index: 0;
          pointer-events: none;
        }
        ` : ''}
        .head {
          text-align: center;
          border-bottom: 2px solid #1e293b;
          padding-bottom: 10px;
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }
        .head .clinic {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .head .unit, .head .address {
          font-size: 12px;
          color: #475569;
        }
        .head .address {
          margin-top: 2px;
        }
        .document-title {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 3px;
          margin: 0 0 12px;
          position: relative;
          z-index: 1;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          margin-bottom: 12px;
          gap: 30px;
          position: relative;
          z-index: 1;
        }
        .meta table {
          border-collapse: collapse;
        }
        .meta td {
          padding: 2px 0;
          vertical-align: top;
        }
        .meta td.k {
          color: #64748b;
          padding-right: 10px;
          white-space: nowrap;
        }
        table.items {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
          position: relative;
          z-index: 1;
        }
        table.items th {
          text-align: left;
          border-top: 1.5px solid #1e293b;
          border-bottom: 1.5px solid #1e293b;
          padding: 6px 4px;
          font-size: 11.5px;
          text-transform: uppercase;
        }
        table.items td {
          padding: 4px;
          vertical-align: top;
        }
        table.items .amt-h {
          text-align: right;
        }
        table.items td.amt {
          text-align: right;
          white-space: nowrap;
        }
        .grp td {
          font-weight: 800;
          padding-top: 6px;
          padding-bottom: 2px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #1e293b;
        }
        .sum {
          margin-top: 14px;
          margin-left: auto;
          width: 340px;
          font-size: 13px;
          position: relative;
          z-index: 1;
        }
        .sum div {
          display: grid;
          grid-template-columns: 1fr auto 100px;
          gap: 8px;
          padding: 3px 0;
          align-items: baseline;
        }
        .sum .cur {
          text-align: right;
          color: #334155;
          white-space: nowrap;
        }
        .sum .val {
          text-align: right;
        }
        .sum .net {
          font-size: 16px;
          font-weight: 800;
          border-top: 1.5px solid #1e293b;
          margin-top: 4px;
          padding-top: 6px;
        }
        .says {
          font-size: 12.5px;
          margin-top: 12px;
          border-top: 1px dashed #cbd5e1;
          padding-top: 8px;
          text-align: right;
          position: relative;
          z-index: 1;
        }
        .pay {
          font-size: 12.5px;
          margin-top: 12px;
          text-align: center;
          position: relative;
          z-index: 1;
        }
        .payline {
          display: flex;
          justify-content: space-between;
          max-width: 420px;
          margin: 0 auto;
          padding: 2px 0;
          text-align: left;
        }
        .bank {
          font-size: 12px;
          margin-top: 16px;
          color: #334155;
          position: relative;
          z-index: 1;
        }
        .signature {
          width: 260px;
          margin: 18px 0 0;
          text-align: center;
          font-size: 12.5px;
          position: relative;
          z-index: 1;
        }
        .signature .space {
          height: 52px;
        }
        .signature .name {
          font-weight: 600;
          text-decoration: underline;
        }
        .valid-note {
          margin-top: 10px;
          font-size: 11px;
          font-style: italic;
          color: #475569;
          position: relative;
          z-index: 1;
        }
        .actions {
          margin-top: 24px;
          text-align: center;
        }
        .btn-print {
          background: #2563eb;
          color: #fff;
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(37,99,235,0.25);
        }
        .btn-print:hover {
          background: #1d4ed8;
        }
        @page {
          margin: 0;
        }
        @media print {
          body {
            background: #fff !important;
            padding: 0 !important;
          }
          .actions {
            display: none !important;
          }
          .paper {
            box-shadow: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 1cm 1.5cm !important;
          }
        }
      `}</style>

      <div className="paper">
        {/* Head */}
        <div className="head">
          <div className="clinic">
            <AppIcon name="hospital" style={{ fontSize: 20 }} />
            PT Rumah Sakit
          </div>
          <div className="unit">Unit Bayakarta — Karawang</div>
          <div className="address">Karawang, Jawa Barat</div>
        </div>

        {/* Document Title */}
        <div className="document-title">{docType}</div>

        {/* Metadata */}
        <div className="meta">
          <table>
            <tbody>
              <tr>
                <td className="k">Reference</td>
                <td>: {invoice.poli_nama ? invoice.poli_nama.toUpperCase() : 'POLI UMUM'}</td>
              </tr>
              <tr>
                <td colSpan="2" style={{ fontWeight: 600 }}>
                  {invoice.dokter_nama ? invoice.dokter_nama.toUpperCase() : 'NO CONSULTATION'}
                </td>
              </tr>
              <tr>
                <td className="k">Guarantor</td>
                <td style={{ fontWeight: invoice.jenis_penjamin && invoice.jenis_penjamin !== 'umum' ? 700 : 400 }}>
                  : {formatGuarantorName()}
                </td>
              </tr>
              {invoice.no_jaminan && (
                <tr>
                  <td className="k">Policy / No. Jaminan</td>
                  <td>: <strong>{invoice.no_jaminan}</strong></td>
                </tr>
              )}
              <tr>
                <td className="k">No. MR</td>
                <td>: {invoice.no_mr}</td>
              </tr>
              <tr>
                <td colSpan="2" style={{ color: '#64748b' }}>Page 1 of 1</td>
              </tr>
            </tbody>
          </table>
          <table>
            <tbody>
              <tr>
                <td className="k">No. Invoice</td>
                <td>: {displayNoInvoice}</td>
              </tr>
              <tr>
                <td className="k">Print Date</td>
                <td>: {formatTgl(printDate)}</td>
              </tr>
              <tr>
                <td className="k">Admission Date</td>
                <td>: {formatTgl(admissionDate)}</td>
              </tr>
              {docType === 'RECEIPT' && (
                <tr>
                  <td className="k">Discharge Date</td>
                  <td>: {formatTgl(dischargeDate)}</td>
                </tr>
              )}
              <tr>
                <td className="k">Name</td>
                <td>: {invoice.pasien_nama}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Items Table */}
        <table className="items">
          <thead>
            <tr>
              <th style={{ width: '90px' }}>Date</th>
              <th style={{ width: '95px' }}>Item Code</th>
              <th>Description</th>
              <th style={{ width: '40px', textAlign: 'center' }}>Qty</th>
              <th className="amt-h" style={{ width: '150px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groupItems).map((groupLabel) => (
              <React.Fragment key={groupLabel}>
                <tr className="grp">
                  <td></td>
                  <td></td>
                  <td>{groupLabel}</td>
                  <td></td>
                  <td></td>
                </tr>
                {groupItems[groupLabel].map((it, idx) => (
                  <tr key={idx}>
                    <td>{formatTgl(it.tgl_layanan || invoice.tgl_kunjungan)}</td>
                    <td>{it.item_code || it.kode || '-'}</td>
                    <td>{it.deskripsi || it.nama || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{it.qty || 1}</td>
                    <td className="amt">
                      <span style={{ float: 'left' }}>Rp</span>
                      <span>{formatRupiah(it.subtotal || it.tarif * it.qty)}</span>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="sum">
          {adminFee > 0 && (
            <div>
              <span>ADMIN</span>
              <span className="cur">: Rp</span>
              <span className="val">{formatRupiah(adminFee)}</span>
            </div>
          )}
          <div>
            <span>TOTAL</span>
            <span className="cur">: Rp</span>
            <span className="val">{formatRupiah(totalTagihan)}</span>
          </div>
          <div>
            <span>DISCOUNT</span>
            <span className="cur">: Rp</span>
            <span className="val">{formatRupiah(diskon)}</span>
          </div>
          {coverPenjamin > 0 && (
            <div>
              <span>COVER GUARANTOR</span>
              <span className="cur">: Rp</span>
              <span className="val">{formatRupiah(coverPenjamin)}</span>
            </div>
          )}
          <div className="net">
            <span>NET PAYABLE</span>
            <span className="cur">Rp</span>
            <span className="val">{formatRupiah(netPayable)}</span>
          </div>
        </div>

        {/* Says */}
        <div className="says">
          <b>Says :</b> {numberToWordsEn(netPayable)}
        </div>

        {/* Payments / Penjamin */}
        <div className="pay">
          {pembayaran.length > 0 ? (
            pembayaran.map((p, idx) => (
              <div key={idx} className="payline">
                <span>{p.metode ? p.metode.toUpperCase() : 'TUNAI'}{p.keterangan ? ` (${p.keterangan})` : ''}</span>
                <span>{formatRupiah(p.jumlah)}</span>
              </div>
            ))
          ) : (
            <div className="payline">
              <span>
                {invoice.jenis_penjamin && invoice.jenis_penjamin !== 'umum'
                  ? `TANGGUNGAN ${formatGuarantorName()}${invoice.no_jaminan ? ` [${invoice.no_jaminan}]` : ''}`
                  : 'GBK - A/R PATIENT'}
              </span>
              <span>{formatRupiah(coverPenjamin > 0 ? coverPenjamin : totalTagihan)}</span>
            </div>
          )}
        </div>

        {/* Bank info */}
        <div className="bank">
          <div><b>Bank :</b></div>
          <div>Beneficiary Name : PT Rumah Sakit</div>
          <div>
            {bank ? `1. ${bank.nama_bank} ${bank.cabang ? bank.cabang + ' ' : ''}(IDR) A/c No : ${bank.no_rekening}` : '1. BCA KCP Panata Yuda (IDR) A/c No : 7045368149'}
          </div>
        </div>

        {/* Signature */}
        <div className="signature">
          <div>Karawang, {formatTglEnLong(printDate)}</div>
          <div>Cashier</div>
          <div className="space"></div>
          <div className="name">Super Administrator</div>
        </div>

        {/* Valid note */}
        <div className="valid-note">
          * Payment is deemed valid if receipt sealed by the cashier is issued
        </div>

        {/* Print button */}
        <div className="actions">
          <button type="button" className="btn-print" onClick={() => window.print()}>
            <AppIcon name="print" /> Cetak
          </button>
        </div>
      </div>
    </div>
  );
}
