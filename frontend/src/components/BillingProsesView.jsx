import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import { useI18n } from '../i18n';

export default function BillingProsesView({ kunjunganId, onBack, onNavigateToKeuangan }) {
  const { t, isEn, trans, formatTgl } = useI18n();
  const [loading, setLoading] = useState(true);
  const [kunjungan, setKunjungan] = useState(null);
  const [billing, setBilling] = useState(null);
  const [lines, setLines] = useState([]);
  const [lookups, setLookups] = useState({ asuransi: [], corporate: [] });
  const [batalCodes, setBatalCodes] = useState([]);

  // Form states
  const [administrasi, setAdministrasi] = useState(0);
  const [diskon, setDiskon] = useState(0);
  const [jenisPenjamin, setJenisPenjamin] = useState('umum');
  const [asuransiId, setAsuransiId] = useState('');
  const [corporateId, setCorporateId] = useState('');
  const [noJaminan, setNoJaminan] = useState('');
  const [hasilDiagnostik, setHasilDiagnostik] = useState('');
  const [coverPenjamin, setCoverPenjamin] = useState(0);

  // Cancellation states
  const [batalCodeId, setBatalCodeId] = useState('');
  const [batalAlasan, setBatalAlasan] = useState('');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
    loadLookups();
  }, [kunjunganId]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadLookups = async () => {
    try {
      const res = await api.get('/kunjungan/lookups');
      if (res) {
        setLookups({
          asuransi: res.asuransi || [],
          corporate: res.corporate || [],
        });
        setBatalCodes(res.kode_pembatalan || []);
        if (res.kode_pembatalan && res.kode_pembatalan.length > 0) {
          setBatalCodeId(res.kode_pembatalan[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/billing/proses/${kunjunganId}`);
      if (res && res.success) {
        setKunjungan(res.kunjungan);
        setBilling(res.billing);
        setLines(res.lines || []);

        const isRawatInap = res.kunjungan?.jenis_registrasi === 'rawat_inap';
        const svcOnly = (res.lines || [])
          .filter((l) => l.kategori !== 'administrasi')
          .reduce((sum, l) => sum + Number(l.subtotal || 0), 0);

        // Biaya administrasi: jika ada tersimpan gunakan itu, jika tidak ada default 0
        let defaultAdmin = 0;
        if (res.administrasi !== undefined && res.administrasi !== null) {
          defaultAdmin = Number(res.administrasi);
        }

        setAdministrasi(defaultAdmin);
        setDiskon(res.diskon !== undefined ? Number(res.diskon) : (res.billing?.diskon ? Number(res.billing.diskon) : 0));
        setJenisPenjamin(res.kunjungan?.jenis_penjamin || 'umum');
        setAsuransiId(res.kunjungan?.asuransi_id || '');
        setCorporateId(res.kunjungan?.corporate_id || '');
        setNoJaminan(res.kunjungan?.no_jaminan || '');
        setHasilDiagnostik(res.billing?.hasil_diagnostik || '');

        const initCover = res.billing?.cover_penjamin !== undefined && res.billing?.cover_penjamin !== null
          ? Number(res.billing.cover_penjamin)
          : (res.total || 0);
        setCoverPenjamin(initCover);
      } else {
        showToast('danger', res?.message || 'Gagal memuat data billing.');
      }
    } catch (err) {
      showToast('danger', err.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  };

  const formatDate = (dateStr) => {
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

  const formatCategoryLabel = (kat) => {
    switch (kat) {
      case 'tindakan': return trans('Tindakan Medis', 'Medical Procedure');
      case 'konsultasi': return trans('Konsultasi', 'Consultation');
      case 'laboratorium': return trans('Laboratorium', 'Laboratory');
      case 'radiologi': return trans('Radiologi', 'Radiology');
      case 'diagnostik': return trans('Diagnostik', 'Diagnostics');
      case 'fisioterapi': return trans('Fisioterapi', 'Physiotherapy');
      case 'farmasi': return trans('Farmasi / Resep', 'Pharmacy / Prescription');
      case 'administrasi': return trans('Administrasi', 'Administration');
      default: return kat ? kat.charAt(0).toUpperCase() + kat.slice(1) : trans('Layanan', 'Service');
    }
  };

  // Exclude admin from table list
  const serviceLines = (lines || []).filter((l) => l.kategori !== 'administrasi');
  const svcSubtotal = serviceLines.reduce((sum, l) => sum + Number(l.subtotal || 0), 0);
  const adminVal = parseFloat(administrasi) || 0;
  const diskonVal = parseFloat(diskon) || 0;
  const subtotalTotal = svcSubtotal + adminVal;
  const rawTotal = Math.max(0, subtotalTotal - diskonVal);
  const totalTagihan = rawTotal > 0 ? Math.ceil(rawTotal / 500) * 500 : 0;

  const isFinal = billing && billing.status === 'final';
  const isRawatInap = kunjungan?.jenis_registrasi === 'rawat_inap';
  const adminDeskripsi = isRawatInap 
    ? trans('Biaya Administrasi Rawat Inap', 'Inpatient Administrative Fee') 
    : trans('Biaya Administrasi & Registrasi', 'Administration & Registration Fee');

  // Cover penjamin calculation
  const coverVal = jenisPenjamin !== 'umum'
    ? (coverPenjamin > 0 ? Number(coverPenjamin) : totalTagihan)
    : 0;
  const sisaPasien = Math.max(0, totalTagihan - coverVal);

  const handleSimpanDraft = async () => {
    setSaving(true);
    try {
      const payload = {
        aksi: 'simpan',
        administrasi: adminVal,
        diskon: diskonVal,
        cover_penjamin: jenisPenjamin !== 'umum' ? coverVal : 0,
        jenis_penjamin: jenisPenjamin,
        asuransi_id: jenisPenjamin === 'asuransi' && asuransiId ? Number(asuransiId) : null,
        corporate_id: jenisPenjamin === 'corporate' && corporateId ? Number(corporateId) : null,
        no_jaminan: noJaminan || null,
        hasil_diagnostik: hasilDiagnostik || null,
      };

      const res = await api.post(`/billing/simpan/${kunjunganId}`, payload);
      if (res && res.success) {
        showToast('success', res.message || trans('Draft billing berhasil disimpan.', 'Billing draft saved successfully.'));
        await loadData();
      } else {
        showToast('danger', res?.message || trans('Gagal menyimpan draft billing.', 'Failed to save billing draft.'));
      }
    } catch (err) {
      showToast('danger', err.message || trans('Gagal menyimpan draft billing.', 'Failed to save billing draft.'));
    } finally {
      setSaving(false);
    }
  };

  const handleFinalisasi = async () => {
    setSaving(true);
    try {
      const payload = {
        aksi: 'finalisasi',
        administrasi: adminVal,
        diskon: diskonVal,
        cover_penjamin: jenisPenjamin !== 'umum' ? coverVal : 0,
        jenis_penjamin: jenisPenjamin,
        asuransi_id: jenisPenjamin === 'asuransi' && asuransiId ? Number(asuransiId) : null,
        corporate_id: jenisPenjamin === 'corporate' && corporateId ? Number(corporateId) : null,
        no_jaminan: noJaminan || null,
        hasil_diagnostik: hasilDiagnostik || null,
      };

      const res = await api.post(`/billing/simpan/${kunjunganId}`, payload);
      if (res && res.success) {
        onBack(trans(`Billing berhasil difinalisasi (${formatRupiah(totalTagihan)})`, `Billing finalized successfully (${formatRupiah(totalTagihan)})`));
      } else {
        showToast('danger', res?.message || trans('Gagal memfinalisasi billing.', 'Failed to finalize billing.'));
      }
    } catch (err) {
      showToast('danger', err.message || trans('Gagal memfinalisasi billing.', 'Failed to finalize billing.'));
    } finally {
      setSaving(false);
    }
  };

  const handleBatalBilling = async () => {
    if (!window.confirm(trans('Yakin ingin membatalkan tagihan kunjungan ini?', 'Are you sure you want to cancel this visit bill?'))) return;
    setSaving(true);
    try {
      const res = await api.post(`/kunjungan/${kunjunganId}/batal`, {
        kode_pembatalan_id: batalCodeId,
        alasan_batal: batalAlasan,
      });

      if (res && res.success) {
        onBack(trans('Tagihan kunjungan berhasil dibatalkan.', 'Visit bill cancelled successfully.'));
      } else {
        showToast('danger', res?.message || trans('Gagal membatalkan tagihan.', 'Failed to cancel bill.'));
      }
    } catch (err) {
      showToast('danger', err.message || trans('Gagal membatalkan tagihan.', 'Failed to cancel bill.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>
        {trans('Memuat lembar proses billing...', 'Loading billing sheet...')}
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

  return (
    <div>
      {/* Toast Alert Banner */}
      {toast && (
        <div className={`alert alert-${toast.type}`} style={{ marginBottom: 14 }}>
          {toast.message}
        </div>
      )}

      {/* Tombol Kembali persis legacy */}
      <button
        type="button"
        className="btn btn-light btn-sm"
        onClick={() => onBack()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
      >
        <AppIcon name="arrowleft" /> {trans('Kembali', 'Back')}
      </button>

      {/* Patient Header Card persis legacy modules/billing/proses.php */}
      <div
        className="card"
        style={{
          marginTop: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}

      >
        <div>
          <div style={{ fontSize: 'var(--fs-sub)', fontWeight: 700, color: 'var(--text-main)' }}>
            {kunjungan.pasien_nama || kunjungan.pasien}
          </div>
          <div style={{ color: 'var(--muted)', marginTop: 4 }}>
            {trans('No. MR', 'MR No.')} <b>{kunjungan.no_mr}</b> &middot; {kunjungan.poli_nama || kunjungan.poli} &middot; {kunjungan.dokter_nama || '-'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="badge badge-blue">
            No. {kunjungan.no_kunjungan}
          </div>
          {isFinal && (
            <div style={{ marginTop: 6 }}>
              <span className="badge badge-green">{trans('Billing Final', 'Final Billing')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className={`alert alert-${toast.type}`} style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppIcon name={toast.type === 'success' ? 'check' : 'alert'} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Alert Info Jika Sudah Final persis proses.php */}
      {isFinal && (
        <div className="alert alert-info" style={{ marginTop: 14 }}>
          {trans('Tagihan kunjungan ini sudah difinalisasi menjadi invoice. Anda dapat melanjutkan ke modul Keuangan untuk mencatat pembayaran.', 'This visit bill has been finalized into an invoice. You may proceed to Finance module to record payment.')}
        </div>
      )}

      {/* Section Title "Rincian Layanan" persis proses.php */}
      <div className="section-title" style={{ marginTop: 20 }}>
        {trans('Rincian Layanan', 'Service Details')}
      </div>

      {/* Rincian Layanan Table persis proses.php */}
      <div className="table-wrap">
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 110 }}>{trans('TANGGAL', 'DATE')}</th>
              <th>{trans('KATEGORI', 'CATEGORY')}</th>
              <th style={{ width: 110 }}>{trans('KODE', 'CODE')}</th>
              <th>{trans('DESKRIPSI', 'DESCRIPTION')}</th>
              <th style={{ width: 70 }}>{trans('QTY', 'QTY')}</th>
              <th style={{ width: 140, textAlign: 'right' }}>{trans('TARIF', 'RATE')}</th>
              <th style={{ width: 150, textAlign: 'right' }}>{trans('SUBTOTAL', 'SUBTOTAL')}</th>
            </tr>
          </thead>
          <tbody>
            {serviceLines.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
                  {trans('Belum ada layanan untuk kunjungan ini.', 'No services recorded for this visit.')}
                </td>
              </tr>
            ) : (
              serviceLines.map((l, idx) => (
                <tr key={idx}>
                  <td>
                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                      {formatDate(l.tgl_layanan || kunjungan.tgl_kunjungan)}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-gray" style={{ textTransform: 'none' }}>
                      {formatCategoryLabel(l.kategori)}
                    </span>
                  </td>
                  <td>
                    <code>{l.item_code || ''}</code>
                  </td>
                  <td>{l.deskripsi}</td>
                  <td>{parseInt(l.qty, 10) || 1}</td>
                  <td style={{ textAlign: 'right' }}>{formatRupiah(l.tarif)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRupiah(l.subtotal)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form Area */}
      <form onSubmit={(e) => e.preventDefault()} style={{ marginTop: 18 }}>
        {/* Card Hasil Diagnostik persis proses.php */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>
              {trans('Hasil Diagnostik', 'Diagnostic Results')}
            </label>
            <textarea
              name="hasil_diagnostik"
              id="hasil_diagnostik"
              className="form-control"
              rows={3}
              placeholder={trans('Hasil Diagnostik...', 'Diagnostic Results...')}
              value={hasilDiagnostik}
              onChange={(e) => setHasilDiagnostik(e.target.value)}
              disabled={isFinal}
            />
          </div>
        </div>

        {/* Card Penjamin & Asuransi persis proses.php */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div
            style={{
              fontWeight: 600,
              marginBottom: 14,
              fontSize: 'var(--fs-sub)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <AppIcon name="shield" />
            </span>
            <span>{trans('Penjamin & Asuransi', 'Guarantor & Insurance')}</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{trans('Jenis Penjamin', 'Guarantor Type')}</label>
              <select
                name="jenis_penjamin"
                id="jenis_penjamin"
                className="form-control"
                value={jenisPenjamin}
                onChange={(e) => {
                  setJenisPenjamin(e.target.value);
                  if (e.target.value === 'umum') {
                    setCoverPenjamin(0);
                  }
                }}
                disabled={isFinal}
              >
                <option value="umum">{trans('Umum', 'General')}</option>
                <option value="bpjs">BPJS Kesehatan</option>
                <option value="asuransi">{trans('Asuransi Swasta', 'Private Insurance')}</option>
                <option value="corporate">Corporate</option>
                <option value="ar">AR</option>
              </select>
            </div>

            {jenisPenjamin === 'asuransi' && (
              <div className="form-group penjamin-extra" id="box_asuransi">
                <label>{trans('Asuransi', 'Insurance')}</label>
                <select
                  name="asuransi_id"
                  className="form-control"
                  value={asuransiId}
                  onChange={(e) => setAsuransiId(e.target.value)}
                  disabled={isFinal}
                >
                  <option value="">{trans('Pilih Opsi...', 'Select Option...')}</option>
                  {lookups.asuransi.map((a) => (
                    <option key={a.id} value={a.id}>{a.nama}</option>
                  ))}
                </select>
              </div>
            )}

            {jenisPenjamin === 'corporate' && (
              <div className="form-group penjamin-extra" id="box_corporate">
                <label>{trans('Perusahaan', 'Company')}</label>
                <select
                  name="corporate_id"
                  className="form-control"
                  value={corporateId}
                  onChange={(e) => setCorporateId(e.target.value)}
                  disabled={isFinal}
                >
                  <option value="">{trans('Pilih Opsi...', 'Select Option...')}</option>
                  {lookups.corporate.map((c) => (
                    <option key={c.id} value={c.id}>{c.nama}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {(jenisPenjamin === 'asuransi' || jenisPenjamin === 'corporate') && (
            <div className="form-group penjamin-extra" id="box_nojaminan" style={{ marginTop: 10 }}>
              <label>{trans('No. Kartu / Jaminan', 'Card / Guarantee No.')}</label>
              <input
                type="text"
                name="no_jaminan"
                className="form-control"
                value={noJaminan}
                onChange={(e) => setNoJaminan(e.target.value)}
                disabled={isFinal}
              />
            </div>
          )}

          {!isFinal && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSimpanDraft}
                disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <AppIcon name="save" /> {trans('Simpan', 'Save')}
              </button>
            </div>
          )}
        </div>

        {/* Card Kalkulasi Kanan persis proses.php (max-width: 460px; margin-left: auto;) */}
        <div
          className="card"
          style={{
            maxWidth: 460,
            marginLeft: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span>{trans('Subtotal Layanan', 'Service Subtotal')}</span>
            <b>{formatRupiah(svcSubtotal)}</b>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
            <label style={{ margin: 0 }}>{adminDeskripsi}</label>
            <input
              type="number"
              min="0"
              step="any"
              name="administrasi"
              id="administrasi"
              className="form-control"
              style={{ width: 160, textAlign: 'right' }}
              value={administrasi}
              onChange={(e) => setAdministrasi(e.target.value)}
              disabled={isFinal}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
            <label style={{ margin: 0 }}>{trans('Diskon', 'Discount')}</label>
            <input
              type="number"
              min="0"
              step="any"
              name="diskon"
              id="diskon"
              className="form-control"
              style={{ width: 160, textAlign: 'right' }}
              value={diskon}
              onChange={(e) => setDiskon(e.target.value)}
              disabled={isFinal}
            />
          </div>

          {jenisPenjamin !== 'umum' && (
            <div
              id="box_penjamin_cover"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px 14px',
                marginTop: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                  color: 'var(--primary)',
                  marginBottom: 8,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <AppIcon name="shield" />
                </span>
                <span>{trans('Cover Penjamin', 'Guarantor Coverage')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <label style={{ margin: 0 }}>{trans('Ditanggung Penjamin', 'Covered by Guarantor')}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  name="cover_penjamin"
                  id="cover_penjamin"
                  className="form-control"
                  style={{ width: 160, textAlign: 'right' }}
                  value={coverPenjamin}
                  onChange={(e) => setCoverPenjamin(e.target.value)}
                  disabled={isFinal}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span>{trans('Ditanggung Pasien', 'Patient Responsibility')}</span>
                <b id="sisaPasienView">{formatRupiah(sisaPasien)}</b>
              </div>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              fontSize: 'var(--fs-sub)',
              fontWeight: 700,
            }}
          >
            <span>{trans('TOTAL TAGIHAN', 'TOTAL BILL')}</span>
            <span id="totalView">{formatRupiah(totalTagihan)}</span>
          </div>

          {!isFinal ? (
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                className="btn btn-light"
                onClick={handleSimpanDraft}
                disabled={saving}
                style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <AppIcon name="save" /> {trans('Simpan Draf', 'Save Draft')}
              </button>
              <button
                type="button"
                className="btn btn-green"
                onClick={handleFinalisasi}
                disabled={saving}
                style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <AppIcon name="check" /> {trans('Finalisasi Billing', 'Finalize Billing')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn"
              style={{
                marginTop: 14,
                width: '100%',
                justifyContent: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
              onClick={() => {
                if (onNavigateToKeuangan) {
                  onNavigateToKeuangan();
                } else {
                  onBack();
                }
              }}
            >
              <AppIcon name="keuangan" /> {trans('Lanjutkan ke Pembayaran', 'Proceed to Payment')}
            </button>
          )}

          {/* Batalkan Billing Collapsible persis proses.php */}
          {!isFinal && kunjungan.status !== 'selesai' && (
            <details style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--danger)', fontWeight: 600 }}>
                {trans('Batalkan Billing', 'Cancel Billing')}
              </summary>
              <div style={{ marginTop: 12 }}>
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
                    placeholder={trans('Catatan tambahan (opsional)...', 'Additional notes (optional)...')}
                    value={batalAlasan}
                    onChange={(e) => setBatalAlasan(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleBatalBilling}
                  disabled={saving || !batalCodeId}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <AppIcon name="close" /> {trans('Batalkan Billing', 'Cancel Billing')}
                </button>
              </div>
            </details>
          )}
        </div>
      </form>
    </div>
  );
}
