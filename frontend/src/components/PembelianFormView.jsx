import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import { useI18n } from '../i18n';

export default function PembelianFormView({ onBack, onSuccess }) {
  const { t, trans, isEn } = useI18n();
  const [suppliers, setSuppliers] = useState([]);
  const [obatList, setObatList] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const getTodayString = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [supplierId, setSupplierId] = useState('');
  const [tanggal, setTanggal] = useState(getTodayString());
  const [keterangan, setKeterangan] = useState('');
  const [items, setItems] = useState([
    { obat_id: '', no_batch: '', tgl_expired: '', qty: 1, harga_beli: 0 }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadLookups();
  }, []);

  const loadLookups = async () => {
    setLoadingLookups(true);
    try {
      const res = await api.get('/farmasi/pembelian/lookups');
      if (res) {
        if (res.suppliers) setSuppliers(res.suppliers);
        if (res.obat) setObatList(res.obat);
      }
    } catch (err) {
      console.error('Error loading pembelian lookups:', err);
      setErrorMessage(trans('Gagal memuat daftar supplier/obat: ', 'Failed to load supplier/medicine list: ') + err.message);
    } finally {
      setLoadingLookups(false);
    }
  };

  const handleAddRow = () => {
    setItems(prev => [
      ...prev,
      { obat_id: '', no_batch: '', tgl_expired: '', qty: 1, harga_beli: 0 }
    ]);
  };

  const handleRemoveRow = (index) => {
    setItems(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy.length === 0 ? [{ obat_id: '', no_batch: '', tgl_expired: '', qty: 1, harga_beli: 0 }] : copy;
    });
  };

  const handleObatChange = (index, value) => {
    const selected = obatList.find(o => String(o.id) === String(value));
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        obat_id: value,
        harga_beli: selected ? Number(selected.harga_beli || 0) : copy[index].harga_beli,
      };
      return copy;
    });
  };

  const handleItemField = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: field === 'qty' || field === 'harga_beli' ? (value === '' ? '' : Number(value)) : value,
      };
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    // Validasi
    const validItems = items.filter(it => it.obat_id && Number(it.qty) > 0);
    if (validItems.length === 0) {
      setErrorMessage(trans('Minimal isi 1 baris obat dengan jumlah (qty) lebih dari 0.', 'Please add at least 1 medicine row with qty greater than 0.'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: supplierId ? Number(supplierId) : null,
        tanggal: tanggal || getTodayString(),
        keterangan: keterangan.trim() || null,
        items: validItems.map(it => ({
          obat_id: Number(it.obat_id),
          no_batch: it.no_batch ? String(it.no_batch).trim() : null,
          tgl_expired: it.tgl_expired || null,
          qty: Number(it.qty) || 1,
          harga_beli: Number(it.harga_beli) || 0,
        })),
      };

      const res = await api.post('/farmasi/pembelian', payload);
      if (res && res.success) {
        onSuccess(res.message || trans('Pembelian obat berhasil disimpan.', 'Medicine purchase saved successfully.'));
      } else {
        setErrorMessage(res.message || trans('Gagal menyimpan pembelian.', 'Failed to save purchase.'));
      }
    } catch (err) {
      console.error('Error saving pembelian:', err);
      setErrorMessage(err.message || trans('Terjadi kesalahan saat menyimpan.', 'An error occurred while saving.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pembelian-form-view">
      <button type="button" className="btn btn-light btn-sm" onClick={onBack}>
        <AppIcon name="arrowleft" /> {trans('Pembelian', 'Purchases')}
      </button>

      {errorMessage && (
        <div className="alert alert-danger" style={{ marginTop: 14 }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
        <div className="card">
          <div className="form-row">
            <div className="form-group">
              <label>{trans('Supplier', 'Supplier')}</label>
              <select
                name="supplier_id"
                className="form-control"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
              >
                <option value="">— {trans('Pilih Supplier', 'Select Supplier')} —</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{trans('Tanggal', 'Date')}</label>
              <input
                type="date"
                name="tanggal"
                className="form-control"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{trans('Keterangan', 'Notes')}</label>
            <input
              type="text"
              name="keterangan"
              className="form-control"
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
            />
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{trans('Daftar Obat Dibeli', 'Purchased Medicine List')}</h3>
            <button type="button" className="btn btn-sm" onClick={handleAddRow}>
              <AppIcon name="plus" /> {trans('Tambah Obat', 'Add Medicine')}
            </button>
          </div>

          <div className="table-wrap">
            <table className="table-inline-form">
              <thead>
                <tr>
                  <th className="col-obat">{trans('OBAT', 'MEDICINE')}</th>
                  <th className="col-batch">{trans('NO. BATCH', 'BATCH NO.')}</th>
                  <th className="col-exp">{trans('KEDALUWARSA', 'EXPIRY DATE')}</th>
                  <th className="col-qty">QTY</th>
                  <th className="col-harga">{trans('HARGA BELI', 'PURCHASE PRICE')}</th>
                  <th className="col-del"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        className="form-control"
                        value={row.obat_id}
                        onChange={(e) => handleObatChange(index, e.target.value)}
                      >
                        <option value="">— {trans('Pilih Obat', 'Select Medicine')} —</option>
                        {obatList.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.nama} ({trans('Stok', 'Stock')} {parseInt(o.stok || 0, 10)})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        value={row.no_batch}
                        onChange={(e) => handleItemField(index, 'no_batch', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="form-control"
                        value={row.tgl_expired}
                        onChange={(e) => handleItemField(index, 'tgl_expired', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-control input-qty"
                        value={row.qty}
                        onChange={(e) => handleItemField(index, 'qty', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-control"
                        value={row.harga_beli}
                        onChange={(e) => handleItemField(index, 'harga_beli', e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-red"
                        onClick={() => handleRemoveRow(index)}
                        title={trans('Hapus Baris', 'Delete Row')}
                      >
                        <AppIcon name="close" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ margin: '18px 0 40px' }}>
          <button
            type="submit"
            className="btn btn-green"
            disabled={submitting}
          >
            <AppIcon name="save" /> {submitting ? trans('Menyimpan...', 'Saving...') : trans('Simpan Pembelian & Tambah Stok', 'Save Purchase & Add Stock')}
          </button>
        </div>
      </form>
    </div>
  );
}
