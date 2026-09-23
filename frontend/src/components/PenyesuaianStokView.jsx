import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';
import { useI18n } from '../i18n';

export default function PenyesuaianStokView({ onBack, onSuccessMessage }) {
  const { t, trans, isEn } = useI18n();
  const [obatList, setObatList] = useState([]);
  const [riwayatList, setRiwayatList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedObatId, setSelectedObatId] = useState('');
  const [stokSistemDisplay, setStokSistemDisplay] = useState('-');
  const [stokFisik, setStokFisik] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/farmasi/penyesuaian');
      if (res) {
        if (res.obat) setObatList(res.obat);
        if (res.riwayat) setRiwayatList(res.riwayat);
      }
    } catch (err) {
      console.error('Error fetching penyesuaian data:', err);
      setErrorMessage(trans('Gagal memuat data penyesuaian: ', 'Failed to load stock adjustment data: ') + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleObatChange = (e) => {
    const id = e.target.value;
    setSelectedObatId(id);
    if (!id) {
      setStokSistemDisplay('-');
      return;
    }
    const found = obatList.find(o => String(o.id) === String(id));
    if (found) {
      setStokSistemDisplay(String(parseInt(found.stok || 0, 10)));
    } else {
      setStokSistemDisplay('-');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedObatId) {
      setErrorMessage(trans('Silakan pilih obat terlebih dahulu.', 'Please select a medicine first.'));
      return;
    }
    if (stokFisik === '' || Number(stokFisik) < 0) {
      setErrorMessage(trans('Stok fisik harus diisi (>= 0).', 'Physical stock must be specified (>= 0).'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        obat_id: Number(selectedObatId),
        stok_fisik: Number(stokFisik),
        keterangan: keterangan.trim() || undefined,
      };

      const res = await api.post('/farmasi/penyesuaian', payload);
      if (res && res.success) {
        setSuccessMessage(res.message || trans('Penyesuaian stok berhasil disimpan.', 'Stock adjustment saved successfully.'));
        if (onSuccessMessage) onSuccessMessage(res.message);
        // Reset form input
        setSelectedObatId('');
        setStokSistemDisplay('-');
        setStokFisik('');
        setKeterangan('');
        // Refresh data
        fetchData();
      } else {
        setErrorMessage(res.message || trans('Gagal menyimpan penyesuaian stok.', 'Failed to save stock adjustment.'));
      }
    } catch (err) {
      console.error('Error saving penyesuaian stok:', err);
      setErrorMessage(err.message || trans('Terjadi kesalahan saat menyimpan.', 'An error occurred while saving.'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const columns = [
    {
      key: 'no',
      label: 'NO',
      style: { width: 50, textAlign: 'center' },
      tdStyle: { textAlign: 'center' },
      render: (_, __, idx) => idx + 1,
    },
    {
      key: 'tanggal',
      label: trans('WAKTU', 'TIME'),
      render: (r) => formatDateTime(r.tanggal),
    },
    {
      key: 'obat',
      label: trans('OBAT', 'MEDICINE'),
      render: (r) => <b>{r.obat}</b>,
    },
    {
      key: 'qty',
      label: trans('SELISIH', 'DIFFERENCE'),
      style: { textAlign: 'center' },
      tdStyle: { textAlign: 'center' },
      render: (r) => {
        const isPositive = Number(r.qty) >= 0;
        return (
          <span className={`badge ${isPositive ? 'badge-green' : 'badge-red'}`}>
            {isPositive ? '+' : ''}{Number(r.qty)}
          </span>
        );
      },
    },
    {
      key: 'stok_akhir',
      label: trans('STOK AKHIR', 'FINAL STOCK'),
      style: { textAlign: 'center' },
      tdStyle: { textAlign: 'center' },
      render: (r) => parseInt(r.stok_akhir || 0, 10),
    },
    {
      key: 'keterangan',
      label: trans('KETERANGAN', 'NOTES'),
      render: (r) => r.keterangan || '-',
    },
    {
      key: 'petugas',
      label: trans('PETUGAS', 'OFFICER'),
      render: (r) => r.petugas || '-',
    },
  ];

  return (
    <div className="penyesuaian-stok-view">
      <button type="button" className="btn btn-light btn-sm" onClick={onBack}>
        <AppIcon name="arrowleft" /> {trans('Inventory Farmasi', 'Pharmacy Inventory')}
      </button>

      {successMessage && (
        <div className="alert alert-success" style={{ marginTop: 14 }}>
          <AppIcon name="check" style={{ marginRight: 8 }} /> {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger" style={{ marginTop: 14 }}>
          {errorMessage}
        </div>
      )}

      <div className="card" style={{ maxWidth: 560, marginTop: 14 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 18 }}>
          <AppIcon name="scale" /> {trans('Penyesuaian / Opname', 'Adjustment / Stock Opname')}
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 13 }}>
          {trans('Masukkan jumlah fisik hasil hitung. Sistem akan mencatat selisihnya.', 'Enter counted physical stock. The system will record the difference.')}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{trans('Obat *', 'Medicine *')}</label>
            <select
              className="form-control"
              value={selectedObatId}
              onChange={handleObatChange}
              required
            >
              <option value="">— {trans('Pilih Obat', 'Select Medicine')} —</option>
              {obatList.map(o => (
                <option key={o.id} value={o.id}>
                  {o.nama} ({trans('Stok sistem', 'System stock')}: {parseInt(o.stok || 0, 10)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{trans('Stok Sistem Saat Ini', 'Current System Stock')}</label>
            <input
              type="text"
              className="form-control"
              value={stokSistemDisplay}
              disabled
              style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label>{trans('Stok Fisik (hasil hitung) *', 'Physical Stock (counted) *')}</label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={stokFisik}
              onChange={e => setStokFisik(e.target.value)}
              required
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label>{trans('Keterangan', 'Notes')}</label>
            <input
              type="text"
              className="form-control"
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              placeholder={trans('cth: Stok opname bulanan / koreksi rusak', 'e.g.: Monthly stock opname / damaged correction')}
            />
          </div>

          <button
            type="submit"
            className="btn btn-green"
            disabled={submitting}
          >
            <AppIcon name="save" /> {submitting ? trans('Menyimpan...', 'Saving...') : trans('Simpan Penyesuaian', 'Save Adjustment')}
          </button>
        </form>
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>
        {trans('Riwayat Penyesuaian', 'Adjustment History')}
      </div>

      <div className="table-wrap">
        <DataTableWrapper
          columns={columns}
          data={riwayatList}
          defaultPageSize={25}
          emptyText={trans('Belum ada data', 'No data available')}
          rowKey="id"
        />
      </div>
    </div>
  );
}
