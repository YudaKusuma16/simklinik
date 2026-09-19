import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';

export default function PembelianObatView({ onBack, onNewPurchase }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPembelian();
  }, []);

  const fetchPembelian = async () => {
    setLoading(true);
    try {
      const res = await api.get('/farmasi/pembelian');
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching pembelian obat:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const columns = [
    {
      key: 'no_beli',
      label: 'NO. BELI',
      render: (r) => <b>{r.no_beli}</b>,
    },
    {
      key: 'tanggal',
      label: 'TANGGAL',
      render: (r) => formatDate(r.tanggal),
    },
    {
      key: 'supplier',
      label: 'SUPPLIER',
      render: (r) => r.supplier || '-',
    },
    {
      key: 'jml',
      label: 'JML ITEM',
      render: (r) => `${r.jml || 0} item`,
    },
    {
      key: 'total',
      label: 'JUMLAH',
      style: { textAlign: 'right' },
      tdStyle: { textAlign: 'right' },
      render: (r) => formatRupiah(r.total),
    },
    {
      key: 'keterangan',
      label: 'KETERANGAN',
      render: (r) => r.keterangan || '-',
    },
  ];

  return (
    <div className="pembelian-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-light btn-sm" onClick={onBack}>
            <AppIcon name="arrowleft" /> Inventory Farmasi
          </button>
          <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 20 }}>
            <AppIcon name="truck" /> Pembelian Obat
          </h2>
        </div>
        <button type="button" className="btn" onClick={onNewPurchase}>
          <AppIcon name="plus" /> Pembelian Baru
        </button>
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <DataTableWrapper
          columns={columns}
          data={data}
          defaultPageSize={25}
          emptyText="Belum ada data"
          rowKey="id"
        />
      </div>
    </div>
  );
}
