import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';

export default function DashboardView({ onNavigate }) {
  const [pasienTerbaru, setPasienTerbaru] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/dashboard/stats');
      if (res && res.data && res.data.pasien_terbaru) {
        setPasienTerbaru(res.data.pasien_terbaru);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data pasien.');
    } finally {
      setLoading(false);
    }
  };

  // Indonesian date formatter matching legacy tgl_id()
  const formatTglId = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const ts = new Date(dateStr);
      if (isNaN(ts.getTime())) return dateStr;
      const day = ts.getDate();
      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const month = monthNames[ts.getMonth() + 1];
      const year = ts.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  const columns = [
    {
      key: 'no_mr',
      label: 'NO. MR',
      render: (p) => <b>{p.no_mr}</b>,
    },
    {
      key: 'nama',
      label: 'NAMA',
      render: (p) => p.nama,
    },
    {
      key: 'jenis_kelamin',
      label: 'L/P',
      render: (p) => (p.jenis_kelamin === 'L' ? 'L' : 'P'),
    },
    {
      key: 'tgl_lahir',
      label: 'TGL LAHIR',
      render: (p) => formatTglId(p.tgl_lahir),
    },
    {
      key: 'telepon',
      label: 'TELEPON',
      render: (p) => p.telepon || '-',
    },
    {
      key: 'kelompok',
      label: 'KELOMPOK',
      render: (p) => p.kelompok || '-',
    },
  ];

  return (
    <>
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* dash-section-head matching backend/legacy/modules/dashboard/index.php */}
      <div className="dash-section-head">
        <div className="section-title" style={{ margin: 0 }}>
          Data Pasien
        </div>
        <div className="dash-section-actions">
          <button 
            type="button" 
            className="btn btn-sm btn-light" 
            onClick={() => onNavigate('pasien')}
          >
            Lihat Semua
          </button>
          <button 
            type="button" 
            className="btn" 
            onClick={() => onNavigate('pasien_form')}
          >
            <AppIcon name="plus" /> Pasien Baru
          </button>
        </div>
      </div>

      {/* table-wrap with DataTableWrapper matching DataTables in simklinik-backup */}
      <div className="table-wrap">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
            Memuat data...
          </div>
        ) : (
          <DataTableWrapper
            columns={columns}
            data={pasienTerbaru}
            defaultPageSize={25}
            emptyText="Belum ada data pasien."
          />
        )}
      </div>
    </>
  );
}
