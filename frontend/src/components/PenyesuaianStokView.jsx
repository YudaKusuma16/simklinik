import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';

export default function PenyesuaianStokView({ onBack, onSuccessMessage }) {
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
      setErrorMessage('Gagal memuat data penyesuaian: ' + err.message);
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
      setErrorMessage('Silakan pilih obat terlebih dahulu.');
      return;
    }
    if (stokFisik === '' || Number(stokFisik) < 0) {
      setErrorMessage('Stok fisik harus diisi (>= 0).');
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
        setSuccessMessage(res.message || 'Penyesuaian stok berhasil disimpan.');
        if (onSuccessMessage) onSuccessMessage(res.message);
        // Reset form input
        setSelectedObatId('');
        setStokSistemDisplay('-');
        setStokFisik('');
        setKeterangan('');
        // Refresh data
        fetchData();
      } else {
        setErrorMessage(res.message || 'Gagal menyimpan penyesuaian stok.');
      }
    } catch (err) {
      console.error('Error saving penyesuaian stok:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
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
      label: 'WAKTU',
      render: (r) => formatDateTime(r.tanggal),
    },
    {
      key: 'obat',
      label: 'OBAT',
      render: (r) => <b>{r.obat}</b>,
    },
    {
      key: 'qty',
      label: 'SELISIH',
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
      label: 'STOK AKHIR',
      style: { textAlign: 'center' },
      tdStyle: { textAlign: 'center' },
      render: (r) => parseInt(r.stok_akhir || 0, 10),
    },
    {
      key: 'keterangan',
      label: 'KETERANGAN',
      render: (r) => r.keterangan || '-',
    },
    {
      key: 'petugas',
      label: 'PETUGAS',
      render: (r) => r.petugas || '-',
    },
  ];

  return (
    <div className="penyesuaian-stok-view">
      <button type="button" className="btn btn-light btn-sm" onClick={onBack}>
        <AppIcon name="arrowleft" /> Inventory Farmasi
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
          <AppIcon name="scale" /> Penyesuaian / Opname
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 13 }}>
          Masukkan jumlah fisik hasil hitung. Sistem akan mencatat selisihnya.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Obat *</label>
            <select
              className="form-control"
              value={selectedObatId}
              onChange={handleObatChange}
              required
            >
              <option value="">— Pilih Obat —</option>
              {obatList.map(o => (
                <option key={o.id} value={o.id}>
                  {o.nama} (Stok sistem: {parseInt(o.stok || 0, 10)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Stok Sistem Saat Ini</label>
            <input
              type="text"
              className="form-control"
              value={stokSistemDisplay}
              disabled
              style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label>Stok Fisik (hasil hitung) *</label>
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
            <label>Keterangan</label>
            <input
              type="text"
              className="form-control"
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              placeholder="cth: Stok opname bulanan / koreksi rusak"
            />
          </div>

          <button
            type="submit"
            className="btn btn-green"
            disabled={submitting}
          >
            <AppIcon name="save" /> {submitting ? 'Menyimpan...' : 'Simpan Penyesuaian'}
          </button>
        </form>
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>
        Riwayat Penyesuaian
      </div>

      <div className="table-wrap">
        <DataTableWrapper
          columns={columns}
          data={riwayatList}
          defaultPageSize={25}
          emptyText="Belum ada data"
          rowKey="id"
        />
      </div>
    </div>
  );
}
