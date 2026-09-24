import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';
import { useI18n } from '../i18n';

export default function DashboardView({ onNavigate }) {
  const { t, isEn, formatKelompok } = useI18n();
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
      setError(err.message || t('dashboard.error_load'));
    } finally {
      setLoading(false);
    }
  };

  // Date formatter matching locale
  const formatTgl = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const ts = new Date(dateStr);
      if (isNaN(ts.getTime())) return dateStr;
      const day = ts.getDate();
      const monthNamesId = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthNamesEn = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = isEn ? monthNamesEn[ts.getMonth() + 1] : monthNamesId[ts.getMonth() + 1];
      const year = ts.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  const columns = [
    {
      key: 'no_mr',
      label: t('common.mr_no'),
      render: (p) => <b>{p.no_mr}</b>,
    },
    {
      key: 'nama',
      label: t('common.name'),
      render: (p) => p.nama,
    },
    {
      key: 'jenis_kelamin',
      label: t('common.gender'),
      render: (p) => (p.jenis_kelamin === 'L' ? (isEn ? 'M' : 'L') : (isEn ? 'F' : 'P')),
    },
    {
      key: 'tgl_lahir',
      label: t('common.birth_date'),
      render: (p) => formatTgl(p.tgl_lahir),
    },
    {
      key: 'telepon',
      label: t('common.phone'),
      render: (p) => p.telepon || '-',
    },
    {
      key: 'kelompok',
      label: t('common.group'),
      render: (p) => formatKelompok(p.kelompok),
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
          {t('dashboard.patient_data')}
        </div>
        <div className="dash-section-actions">
          <button 
            type="button" 
            className="btn btn-sm btn-light" 
            onClick={() => onNavigate('pasien')}
          >
            {t('dashboard.view_all')}
          </button>
          <button 
            type="button" 
            className="btn" 
            onClick={() => onNavigate('pasien_form')}
          >
            <AppIcon name="plus" /> {t('dashboard.new_patient')}
          </button>
        </div>
      </div>

      {/* table-wrap with DataTableWrapper matching DataTables in simrs-backup */}
      <div className="table-wrap">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
            {t('dashboard.loading')}
          </div>
        ) : (
          <DataTableWrapper
            columns={columns}
            data={pasienTerbaru}
            defaultPageSize={25}
            emptyText={t('dashboard.empty')}
          />
        )}
      </div>
    </>
  );
}
