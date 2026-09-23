import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';
import { useI18n } from '../i18n';

const REPORT_GROUPS = {
  'Operasional': [
    { key: 'kunjungan', label: 'Laporan Kunjungan', icon: 'users' },
    { key: 'dokter', label: 'Laporan per Dokter', icon: 'user' },
    { key: 'poli', label: 'Laporan per Poli', icon: 'hospital' },
  ],
  'Keuangan': [
    { key: 'pendapatan', label: 'Laporan Pendapatan', icon: 'money' },
    { key: 'billing', label: 'Laporan Billing', icon: 'billing' },
    { key: 'piutang', label: 'Laporan Piutang', icon: 'clock' },
    { key: 'penjamin', label: 'Laporan per Penjamin', icon: 'shield' },
  ],
  'Penunjang': [
    { key: 'farmasi', label: 'Laporan Farmasi', icon: 'pills' },
    { key: 'laboratorium', label: 'Laporan Laboratorium', icon: 'flask' },
    { key: 'radiologi', label: 'Laporan Radiologi', icon: 'scan' },
  ],
};

export default function LaporanView({ initialTab, initialSlug = null, onNavigateSlug = null }) {
  const { t, trans, formatTgl, formatStatus } = useI18n();
  const [activeGroup, setActiveGroup] = useState(() => {
    if (initialTab && REPORT_GROUPS[initialTab]) return initialTab;
    return 'Operasional';
  });

  const [activeSlug, setActiveSlug] = useState(() => {
    if (initialSlug) return initialSlug;
    const list = REPORT_GROUPS[initialTab] || REPORT_GROUPS['Operasional'];
    return list[0].key;
  });

  useEffect(() => {
    if (initialTab && REPORT_GROUPS[initialTab]) {
      setActiveGroup(initialTab);
      if (initialSlug) {
        setActiveSlug(initialSlug);
      } else {
        setActiveSlug(REPORT_GROUPS[initialTab][0].key);
      }
    }
  }, [initialTab, initialSlug]);

  // Date filters matching legacy (default awal bulan s/d hari ini)
  const [dari, setDari] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [sampai, setSampai] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportCounts, setReportCounts] = useState({});

  // 1. Fetch counts for active group's reports
  useEffect(() => {
    api.get(`/laporan/summary?dari=${dari}&sampai=${sampai}`)
      .then((res) => {
        if (res && res.data) {
          const cMap = {};
          Object.entries(res.data).forEach(([s, r]) => {
            cMap[s] = r.count || 0;
          });
          setReportCounts(cMap);
        }
      })
      .catch((err) => console.error('Failed to load report summary:', err));
  }, [dari, sampai]);

  // 2. Fetch active report data
  useEffect(() => {
    fetchReport();
  }, [activeSlug, dari, sampai]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/laporan/${activeSlug}?dari=${dari}&sampai=${sampai}`);
      if (res && res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (num) => {
    if (num === null || num === undefined) return 'Rp 0';
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const exportCsv = () => {
    const rows = reportData?.data?.rows || [];
    if (rows.length === 0) {
      alert(trans('Tidak ada data untuk diexport.', 'No data to export.'));
      return;
    }

    const cols = reportData?.report?.cols || [];
    let csv = cols.map(c => `"${c.label}"`).join(',') + '\n';

    rows.forEach((r) => {
      const line = cols.map((c) => {
        let val = r[c.key];
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csv += line.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_${activeSlug}_${dari}_sd_${sampai}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailKunjungan, setSelectedDetailKunjungan] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleOpenDetail = async (kunjunganId) => {
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/kunjungan/${kunjunganId}`);
      if (res && res.data) {
        setSelectedDetailKunjungan(res.data);
      }
    } catch (err) {
      console.error('Failed to load kunjungan detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Build DataTable columns dynamically from API definitions
  const rawCols = reportData?.report?.cols || [];
  const dynamicColumns = [];

  // If not 'kunjungan' and not 'poli', prepend 'NO' column matching legacy index.php
  if (activeSlug !== 'kunjungan' && activeSlug !== 'poli') {
    dynamicColumns.push({
      key: '_no',
      label: 'NO',
      sortable: false,
      thClassName: 'no-sort col-no',
      className: 'col-no',
      style: { width: 45 },
      render: (_, idx) => idx,
    });
  }

  const formatReportColLabel = (key, rawLabel) => {
    const map = {
      tanggal: trans('TANGGAL', 'DATE'),
      no_kunjungan: trans('NO. KUNJUNGAN', 'VISIT NO.'),
      no_mr: trans('NO. MR', 'MR NO.'),
      pasien: trans('PASIEN', 'PATIENT'),
      dokter: trans('DOKTER', 'DOCTOR'),
      penjamin: trans('PENJAMIN', 'GUARANTOR'),
      status: trans('STATUS', 'STATUS'),
      action_periksa: trans('AKSI', 'ACTION'),
      no_invoice: trans('NO. INVOICE', 'INVOICE NO.'),
      metode: trans('METODE', 'METHOD'),
      jumlah: trans('JUMLAH', 'AMOUNT'),
      subtotal: trans('SUBTOTAL', 'SUBTOTAL'),
      diskon: trans('DISKON', 'DISCOUNT'),
      total: trans('TOTAL', 'TOTAL'),
      terbayar: trans('TERBAYAR', 'PAID AMOUNT'),
      sisa: trans('SISA', 'BALANCE'),
      poli: trans('POLI', 'CLINIC'),
      jml: trans('JUMLAH', 'COUNT'),
      obat: trans('OBAT', 'MEDICINE'),
      kategori: trans('KATEGORI', 'CATEGORY'),
      stok: trans('STOK', 'STOCK'),
      satuan: trans('SATUAN', 'UNIT'),
      pemeriksaan: trans('PEMERIKSAAN', 'EXAMINATION'),
      hasil: trans('HASIL', 'RESULT'),
      tarif: trans('TARIF', 'FEE'),
    };
    return map[key] || (rawLabel ? rawLabel.toUpperCase() : key.toUpperCase());
  };

  rawCols.forEach((c) => {
    const isMoneyOrNum = ['money', 'number'].includes(c.type);
    const isStatus = c.type === 'status';

    dynamicColumns.push({
      key: c.key,
      label: formatReportColLabel(c.key, c.label),
      sortable: c.type !== 'action_periksa',
      thClassName: c.type === 'action_periksa' ? 'no-sort col-actions' : '',
      className: c.type === 'action_periksa' ? 'cell-actions' : '',
      style: isMoneyOrNum ? { textAlign: 'right' } : (isStatus ? { textAlign: 'center' } : {}),
      tdStyle: isMoneyOrNum ? { textAlign: 'right' } : (isStatus ? { textAlign: 'center' } : {}),
      render: (row) => {
        const val = row[c.key];
        if (c.type === 'money') return formatRupiah(val);
        if (c.type === 'number') return Number(val || 0).toLocaleString('id-ID');
        if (c.type === 'date') return formatDate(val);
        if (c.type === 'datetime') return formatDateTime(val);
        if (c.type === 'upper') return String(val || '').toUpperCase();
        if (c.type === 'status') {
          return (
            <span className="badge badge-gray">
              {formatStatus(val)}
            </span>
          );
        }
        if (c.type === 'action_periksa') {
          return (
            <div className="cell-actions-inner">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleOpenDetail(val)}
              >
                Detail
              </button>
            </div>
          );
        }
        return val ?? '-';
      },
    });
  });

  const currentReports = REPORT_GROUPS[activeGroup] || [];
  const rows = reportData?.data?.rows || [];
  const totals = reportData?.data?.totals || {};
  const sumCols = reportData?.report?.sum || [];

  // Build tfoot rows matching legacy's .report-total-row (only if report has sum columns)
  const tfootRows = useMemo(() => {
    if (!sumCols || sumCols.length === 0) return null;
    // Build one row: "TOTAL" in first col, blank/values for subsequent cols
    const cells = [];
    let first = true;
    for (const col of dynamicColumns) {
      if (col.key === '_no') {
        cells.push({ content: '', style: {} });
        continue;
      }
      if (first) {
        cells.push({ content: 'TOTAL', style: { fontWeight: 700 } });
        first = false;
        continue;
      }
      if (sumCols.includes(col.key)) {
        const rawVal = totals[col.key] ?? 0;
        // Use the same formatter as the column render
        const rawColDef = (reportData?.report?.cols || []).find(c => c.key === col.key);
        let rendered;
        if (rawColDef?.type === 'money') {
          rendered = formatRupiah(rawVal);
        } else if (rawColDef?.type === 'number') {
          rendered = Number(rawVal || 0).toLocaleString('id-ID');
        } else {
          rendered = rawVal;
        }
        cells.push({ content: rendered, style: { textAlign: 'right', fontWeight: 700 } });
      } else {
        cells.push({ content: '', style: {} });
      }
    }
    return [cells];
  }, [dynamicColumns, sumCols, totals, reportData]);

  const getReportLabel = (key, defaultLabel) => {
    switch (key) {
      case 'kunjungan': return trans('Laporan Kunjungan', 'Visit Report');
      case 'dokter': return trans('Laporan per Dokter', 'Doctor Report');
      case 'poli': return trans('Laporan per Poli', 'Clinic Report');
      case 'pendapatan': return trans('Laporan Pendapatan', 'Revenue Report');
      case 'billing': return trans('Laporan Billing', 'Billing Report');
      case 'piutang': return trans('Laporan Piutang', 'Receivables Report');
      case 'penjamin': return trans('Laporan per Penjamin', 'Guarantor Report');
      case 'farmasi': return trans('Laporan Farmasi', 'Pharmacy Report');
      case 'laboratorium': return trans('Laporan Laboratorium', 'Laboratory Report');
      case 'radiologi': return trans('Laporan Radiologi', 'Radiology Report');
      default: return defaultLabel;
    }
  };

  return (
    <div>
      {/* Panel laporan: tab vertikal (jenis) di kiri + konten di kanan */}
      <div className="master-split">
        <nav className="vtabs">
          {currentReports.map((r) => {
            const isTabActive = r.key === activeSlug;
            const count = reportCounts[r.key] ?? (isTabActive ? rows.length : 0);
            return (
              <a
                key={r.key}
                href={`#${r.key}`}
                className={`vtab ${isTabActive ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSlug(r.key);
                  if (onNavigateSlug) onNavigateSlug(activeGroup, r.key);
                }}
              >
                <span className="vt-main">
                  <span className="vt-ico"><AppIcon name={r.icon} /></span>
                  <span>{getReportLabel(r.key, r.label)}</span>
                </span>
                <span className="tab-count">{count}</span>
              </a>
            );
          })}
        </nav>

        <div className="table-wrap" style={{ flex: 1, minWidth: 0, margin: 0 }}>
          {/* Panel Toolbar matching legacy */}
          <div className="panel-toolbar">
            <form className="report-filter no-print" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>{trans('Dari', 'From')}</label>
                <input
                  type="date"
                  name="dari"
                  value={dari}
                  className="form-control"
                  onChange={(e) => setDari(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>{trans('Sampai', 'To')}</label>
                <input
                  type="date"
                  name="sampai"
                  value={sampai}
                  className="form-control"
                  onChange={(e) => setSampai(e.target.value)}
                />
              </div>
            </form>
            <div className="report-actions no-print">
              <button type="button" className="btn btn-light" onClick={exportCsv}>
                <AppIcon name="download" /> {trans('Ekspor CSV', 'Export CSV')}
              </button>
              <button type="button" className="btn btn-light" onClick={() => window.print()}>
                <AppIcon name="print" /> {trans('Cetak', 'Print')}
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
              {trans('Memuat laporan...', 'Loading report...')}
            </div>
          ) : (
            <DataTableWrapper
              columns={dynamicColumns}
              data={rows}
              defaultPageSize={25}
              emptyText={trans('Belum ada data', 'No data available')}
              rowKey="id"
              tfootRows={tfootRows}
            />
          )}
        </div>
      </div>

      {/* Modal Detail Kunjungan */}
      {detailModalOpen && (
        <div className="modal-overlay open" onClick={() => setDetailModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <div className="modal-title">
                {trans('Detail Kunjungan', 'Visit Details')} {selectedDetailKunjungan?.no_kunjungan ? `— ${selectedDetailKunjungan.no_kunjungan}` : ''}
              </div>
              <button type="button" className="modal-close" onClick={() => setDetailModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              {loadingDetail || !selectedDetailKunjungan ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                  {trans('Memuat detail kunjungan...', 'Loading visit details...')}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px', fontSize: 14 }}>
                  <span style={{ color: 'var(--muted)' }}>{trans('No. Kunjungan', 'Visit No.')}:</span>
                  <b>{selectedDetailKunjungan.no_kunjungan}</b>

                  <span style={{ color: 'var(--muted)' }}>{trans('Tanggal', 'Date')}:</span>
                  <span>{formatDate(selectedDetailKunjungan.tgl_kunjungan)}</span>

                  <span style={{ color: 'var(--muted)' }}>{trans('Pasien', 'Patient')}:</span>
                  <b>
                    {selectedDetailKunjungan.pasien_nama} ({selectedDetailKunjungan.no_mr})
                  </b>

                  <span style={{ color: 'var(--muted)' }}>{trans('Poli / Unit', 'Clinic / Unit')}:</span>
                  <span>{selectedDetailKunjungan.poli_nama}</span>

                  <span style={{ color: 'var(--muted)' }}>{trans('Dokter', 'Doctor')}:</span>
                  <span>{selectedDetailKunjungan.dokter_nama || '-'}</span>

                  <span style={{ color: 'var(--muted)' }}>{trans('Penjamin', 'Guarantor')}:</span>
                  <span>
                    <span className="badge badge-gray">
                      {selectedDetailKunjungan.jenis_penjamin?.toUpperCase() || 'UMUM'}
                    </span>
                    {selectedDetailKunjungan.asuransi_nama ? ` - ${selectedDetailKunjungan.asuransi_nama}` : ''}
                    {selectedDetailKunjungan.corporate_nama ? ` - ${selectedDetailKunjungan.corporate_nama}` : ''}
                  </span>

                  <span style={{ color: 'var(--muted)' }}>{trans('Status', 'Status')}:</span>
                  <span>
                    <span className="badge badge-gray">
                      {formatStatus(selectedDetailKunjungan.status)}
                    </span>
                  </span>

                  <span style={{ color: 'var(--muted)' }}>{trans('Keluhan Awal', 'Chief Complaint')}:</span>
                  <span>{selectedDetailKunjungan.keluhan_awal || '-'}</span>
                </div>
              )}
            </div>
            <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 16 }}>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => window.print()}
              >
                <AppIcon name="print" /> {trans('Cetak', 'Print')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setDetailModalOpen(false)}
              >
                {trans('Tutup', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

