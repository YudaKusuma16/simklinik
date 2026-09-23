import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import DataTableWrapper from './DataTableWrapper';
import PembelianObatView from './PembelianObatView';
import PembelianFormView from './PembelianFormView';
import PenyesuaianStokView from './PenyesuaianStokView';
import { useI18n } from '../i18n';

export default function FarmasiView({ initialSubView = 'stok', onNavigateSubView }) {
  const { t, trans, formatTgl, formatStatus } = useI18n();
  const [subView, setSubView] = useState(initialSubView); // 'stok' | 'pembelian_list' | 'pembelian_form' | 'penyesuaian'

  useEffect(() => {
    if (initialSubView && initialSubView !== subView) {
      setSubView(initialSubView);
    }
  }, [initialSubView]);

  const changeSubView = (nextView) => {
    setSubView(nextView);
    if (onNavigateSubView) {
      onNavigateSubView(nextView);
    }
  };
  const [activeTab, setActiveTab] = useState('stok'); // 'stok' | 'antrean'
  const [antreanList, setAntreanList] = useState([]);
  const [loadingAntrean, setLoadingAntrean] = useState(false);

  // Modal serah resep
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedResepId, setSelectedResepId] = useState(null);
  const [resepDetail, setResepDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingSerah, setSubmittingSerah] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Tab stok obat
  const [stokList, setStokList] = useState([]);
  const [loadingStok, setLoadingStok] = useState(false);
  const [searchStok, setSearchStok] = useState('');

  useEffect(() => {
    fetchStok();
    fetchAntrean();
  }, []);

  const fetchAntrean = async () => {
    setLoadingAntrean(true);
    try {
      const res = await api.get('/farmasi/antrean');
      if (res && res.data) {
        setAntreanList(res.data);
      }
    } catch (err) {
      console.error('Error fetching farmasi queue:', err);
    } finally {
      setLoadingAntrean(false);
    }
  };

  const fetchStok = async (q = searchStok) => {
    setLoadingStok(true);
    try {
      const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      const res = await api.get(`/farmasi/stok${query}`);
      if (res && res.data) {
        setStokList(res.data);
      }
    } catch (err) {
      console.error('Error fetching stok obat:', err);
    } finally {
      setLoadingStok(false);
    }
  };

  const openResepModal = async (resepId) => {
    setSelectedResepId(resepId);
    setModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/farmasi/resep/${resepId}`);
      if (res && res.success) {
        setResepDetail(res);
      }
    } catch (err) {
      console.error('Error fetching resep detail:', err);
      showToast('Gagal memuat resep: ' + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSerahkan = async () => {
    if (!selectedResepId) return;
    setSubmittingSerah(true);
    try {
      const res = await api.post(`/farmasi/serah/${selectedResepId}`);
      showToast(res.message);
      setModalOpen(false);
      fetchAntrean();
      fetchStok();
    } catch (err) {
      showToast('Gagal menyerahkan obat: ' + err.message);
    } finally {
      setSubmittingSerah(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  // Stat calculations
  const totalObat = stokList.length;
  const menipis = stokList.filter(o => Number(o.stok) <= Number(o.stok_minimal || 10)).length;
  const nilaiStok = stokList.reduce((acc, o) => acc + (Number(o.stok || 0) * Number(o.harga_beli || 0)), 0);
  const expSoon = 0;

  if (subView === 'pembelian_list') {
    return (
      <div className="farmasi-view">
        {toastMessage && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            <AppIcon name="check" style={{ marginRight: 8 }} /> {toastMessage}
          </div>
        )}
        <PembelianObatView
          onBack={() => {
            changeSubView('stok');
            fetchStok();
          }}
          onNewPurchase={() => changeSubView('pembelian_form')}
        />
      </div>
    );
  }

  if (subView === 'pembelian_form') {
    return (
      <div className="farmasi-view">
        <PembelianFormView
          onBack={() => changeSubView('pembelian_list')}
          onSuccess={(msg) => {
            showToast(msg);
            changeSubView('pembelian_list');
            fetchStok();
          }}
        />
      </div>
    );
  }

  if (subView === 'penyesuaian') {
    return (
      <div className="farmasi-view">
        <PenyesuaianStokView
          onBack={() => {
            changeSubView('stok');
            fetchStok();
          }}
          onSuccessMessage={(msg) => {
            showToast(msg);
            fetchStok();
          }}
        />
      </div>
    );
  }

  return (
    <div className="farmasi-view">
      {toastMessage && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <AppIcon name="check" style={{ marginRight: 8 }} /> {toastMessage}
        </div>
      )}

      {/* Page Toolbar persis legacy modules/inventory/index.php */}
      <div className="page-toolbar">
        <div>
          <div className="pt-title">{t('farmasi.title')}</div>
          <div className="pt-sub">
            {t('farmasi.subtitle')}
          </div>
        </div>
        <div className="pt-actions">
          <button
            type="button"
            className="btn btn-light"
            onClick={() => changeSubView('penyesuaian')}
          >
            <AppIcon name="pengaturan" /> {t('farmasi.penyesuaian_btn')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => changeSubView('pembelian_list')}
          >
            <AppIcon name="inventory" /> {t('farmasi.pembelian_btn')}
          </button>
        </div>
      </div>

      {/* 4 Cards Stat persis legacy */}
      <div className="cards" style={{ marginTop: 16 }}>
        <div className="card stat">
          <div>
            <div className="num">{totalObat}</div>
            <div className="lbl">{t('farmasi.total_obat')}</div>
          </div>
          <div className="ico bg-blue"><AppIcon name="pills" /></div>
        </div>
        <div className="card stat">
          <div>
            <div className="num">{menipis}</div>
            <div className="lbl">{t('farmasi.stok_menipis')}</div>
          </div>
          <div className="ico bg-red"><AppIcon name="bell" /></div>
        </div>
        <div className="card stat">
          <div>
            <div className="num">{formatRupiah(nilaiStok)}</div>
            <div className="lbl">{t('farmasi.nilai_stok')}</div>
          </div>
          <div className="ico bg-green"><AppIcon name="money" /></div>
        </div>
        <div className="card stat">
          <div>
            <div className="num">{expSoon}</div>
            <div className="lbl">{t('farmasi.exp_soon')}</div>
          </div>
          <div className="ico bg-orange"><AppIcon name="calendar" /></div>
        </div>
      </div>

      {/* TAB 1: STOK OBAT persis legacy */}
      <div style={{ marginTop: 20 }}>
        <div className="section-title">{t('farmasi.daftar_stok')}</div>

        <div className="table-wrap">
          <DataTableWrapper
            columns={[
              {
                key: 'kode',
                label: t('farmasi.kode'),
                render: (o) => <code>{o.kode}</code>,
              },
              {
                key: 'nama',
                label: t('farmasi.nama_obat'),
              },
              {
                key: 'kategori',
                label: t('farmasi.kategori'),
                render: (o) => o.kategori_nama || o.kategori || '-',
              },
              {
                key: 'stok',
                label: t('farmasi.stok'),
                style: { textAlign: 'center' },
                tdStyle: { textAlign: 'center' },
                render: (o) => (
                  <>
                    <b>{parseInt(o.stok || 0, 10)}</b> {o.satuan_nama || o.satuan || ''}
                  </>
                ),
              },
              {
                key: 'stok_minimal',
                label: t('farmasi.stok_min'),
                style: { textAlign: 'center' },
                tdStyle: { textAlign: 'center' },
                render: (o) => parseInt(o.stok_minimal || 0, 10),
              },
              {
                key: 'harga_beli',
                label: t('farmasi.harga_beli'),
                style: { textAlign: 'right' },
                tdStyle: { textAlign: 'right' },
                render: (o) => formatRupiah(o.harga_beli),
              },
              {
                key: 'harga_jual',
                label: t('farmasi.harga_jual'),
                style: { textAlign: 'right' },
                tdStyle: { textAlign: 'right' },
                render: (o) => {
                  const numJual = Number(o.harga_jual || 0);
                  const calcJual = numJual > 0 ? numJual : (Number(o.harga_beli || 0) + (Number(o.harga_beli || 0) * Number(o.markup_persen || 0) / 100));
                  return formatRupiah(calcJual);
                },
              },
              {
                key: 'status',
                label: t('farmasi.status'),
                style: { textAlign: 'center' },
                tdStyle: { textAlign: 'center' },
                render: (o) => {
                  const isLow = Number(o.stok) <= Number(o.stok_minimal || 10);
                  return (
                    <span className={`badge ${isLow ? 'badge-red' : 'badge-green'}`}>
                      {isLow ? t('farmasi.menipis') : t('farmasi.aman')}
                    </span>
                  );
                },
              },
              {
                key: 'aksi',
                label: t('farmasi.aksi'),
                sortable: false,
                thClassName: 'no-sort col-actions',
                className: 'cell-actions',
                render: (o) => (
                  <div className="cell-actions-inner">
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      onClick={() => alert(`${t('farmasi.kartu_stok')}: ${o.nama} (${o.stok} ${o.satuan_nama || ''})`)}
                    >
                      {t('farmasi.kartu_stok')}
                    </button>
                  </div>
                ),
              },
            ]}
            data={stokList}
            defaultPageSize={25}
            emptyText={trans('Belum ada data', 'No data available')}
            rowKey="id"
          />
        </div>
      </div>

      {/* TAB 2: ANTREAN RESEP persis legacy modules/pelayanan/farmasi.php */}
      {activeTab === 'antrean' && (
        <div style={{ marginTop: 20 }}>
          <div className="section-title">{t('farmasi.antrean_title')}</div>
          <div className="table-wrap">
            <DataTableWrapper
              columns={[
                {
                  key: 'no_antrian',
                  label: trans('ANTREAN', 'QUEUE'),
                  render: (a) => <b>{a.poli_kode}-{String(a.no_antrian).padStart(3, '0')}</b>,
                },
                {
                  key: 'no_mr',
                  label: trans('NO. MR', 'MR NO.'),
                },
                {
                  key: 'pasien_nama',
                  label: trans('PASIEN', 'PATIENT'),
                  render: (a) => (
                    <>
                      {a.pasien_nama}
                      {a.pasien_alergi && (
                        <>
                          <br />
                          <span className="badge badge-red" style={{ fontSize: 11 }}>
                            {trans('Alergi:', 'Allergy:')} {a.pasien_alergi}
                          </span>
                        </>
                      )}
                    </>
                  ),
                },
                {
                  key: 'poli_nama',
                  label: trans('POLI', 'CLINIC'),
                },
                {
                  key: 'jml_obat',
                  label: trans('JUMLAH OBAT', 'TOTAL MEDICINES'),
                  render: (a) => `${a.jml_obat} ${trans('item', 'items')}`,
                },
                {
                  key: 'resep_status',
                  label: trans('STATUS', 'STATUS'),
                  render: (a) => (
                    <span className="badge badge-orange">
                      {a.resep_status === 'baru' ? trans('Menunggu Penyiapan', 'Awaiting Preparation') : formatStatus(a.resep_status)}
                    </span>
                  ),
                },
                {
                  key: 'aksi',
                  label: trans('AKSI', 'ACTION'),
                  sortable: false,
                  thClassName: 'col-actions',
                  className: 'cell-actions',
                  render: (a) => (
                    <div className="cell-actions-inner">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => openResepModal(a.resep_id)}
                      >
                        {t('farmasi.serahkan_btn')}
                      </button>
                    </div>
                  ),
                },
              ]}
              data={antreanList}
              defaultPageSize={25}
              emptyText={trans('Belum ada data', 'No data available')}
              rowKey="resep_id"
            />
          </div>
        </div>
      )}

      {/* MODAL PENYERAHAN RESEP & CETAK ETIKET */}
      {modalOpen && (
        <div className="modal-overlay open" role="dialog" aria-modal="true">
          <div className="modal-box" style={{ maxWidth: 780 }}>
            <div className="modal-head">
              <div className="modal-title">
                {t('farmasi.modal_title')}
              </div>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
              {loadingDetail || !resepDetail ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>{trans('Memuat rincian resep...', 'Loading prescription details...')}</div>
              ) : (
                <>
                  {/* Patient Info Card */}
                  <div className="card" style={{ padding: '14px 18px', marginBottom: 16, background: 'var(--surface-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>
                          {resepDetail.resep.pasien_nama}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                          {trans('No. MR', 'MR No.')}: <b style={{ fontFamily: 'monospace' }}>{resepDetail.resep.no_mr}</b> &middot; {trans('Poli', 'Clinic')}: {resepDetail.resep.poli_nama} &middot; {trans('Dokter', 'Doctor')}: {resepDetail.resep.dokter_nama || '-'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
                          {resepDetail.resep.no_kunjungan}
                        </span>
                        {resepDetail.resep.pasien_alergi && (
                          <div style={{ marginTop: 4 }}>
                            <span className="badge badge-red">
                              {trans('Alergi:', 'Allergy:')} {resepDetail.resep.pasien_alergi}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {resepDetail.resep.catatan && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>{trans('Catatan Dokter:', "Doctor's Notes:")}</span> <i>{resepDetail.resep.catatan}</i>
                      </div>
                    )}
                  </div>

                  {/* Stock Warning Alert if any */}
                  {!resepDetail.stok_cukup && (
                    <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                      <b>{t('farmasi.warning_stok')}</b>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                        {resepDetail.stok_kurang.map((k) => (
                          <li key={k.obat_id}>
                            {k.nama} &mdash; {trans('Dibutuhkan:', 'Required:')} {k.butuh}, {trans('Sisa Stok di Farmasi:', 'Stock Left in Pharmacy:')} {k.stok}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Rincian Resep Table */}
                  <div className="table-wrap">
                    <table className="datatable" style={{ width: '100%', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th>{trans('Nama Obat', 'Medicine Name')}</th>
                          <th style={{ width: 70, textAlign: 'center' }}>{trans('Jumlah', 'Qty')}</th>
                          <th>{trans('Dosis', 'Dosage')}</th>
                          <th>{trans('Aturan Pakai', 'Signa / Instructions')}</th>
                          <th style={{ width: 90, textAlign: 'center' }}>{trans('Stok Gudang', 'Warehouse Stock')}</th>
                          <th style={{ textAlign: 'right', width: 110 }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resepDetail.items.map((it) => (
                          <tr key={it.id}>
                            <td>
                              <b>{it.obat_nama}</b>
                              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{it.obat_kode}</div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>
                              {it.qty} {it.satuan_nama || 'Pcs'}
                            </td>
                            <td>{it.dosis || '-'}</td>
                            <td>
                              <span className="badge badge-blue">{it.aturan_pakai || '-'}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${it.qty > it.obat_stok ? 'badge-red' : 'badge-green'}`}>
                                {it.obat_stok}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              Rp {Number(it.subtotal).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'right', fontWeight: 700 }}>
                            {trans('Total Biaya Obat', 'Total Medicine Cost')}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                            Rp {Number(resepDetail.total_biaya).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Etiket Preview */}
                  <div style={{ marginTop: 18, padding: 14, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        <AppIcon name="printer" /> {trans('Preview Label Etiket Obat', 'Preview Medicine Label')}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() => window.print()}
                      >
                        {t('farmasi.cetak_etiket')}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                      {resepDetail.items.map((it, idx) => (
                        <div key={idx} style={{ padding: '8px 10px', border: '1px dashed var(--border)', borderRadius: 6, fontSize: 11, background: '#fff', color: '#111' }}>
                          <div style={{ fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 3, marginBottom: 4 }}>
                            KLINIK PRATAMA SEHAT
                          </div>
                          <div>{trans('Pasien', 'Patient')}: <b>{resepDetail.resep.pasien_nama}</b></div>
                          <div>{trans('Obat', 'Medicine')}: <b>{it.obat_nama}</b> ({it.qty} {it.satuan_nama || 'Pcs'})</div>
                          <div style={{ marginTop: 4, fontWeight: 700, color: '#0369a1' }}>
                            {it.aturan_pakai}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setModalOpen(false)}
                disabled={submittingSerah}
              >
                {trans('Batal', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn"
                disabled={submittingSerah || !resepDetail?.stok_cukup}
                onClick={handleSerahkan}
              >
                {submittingSerah ? trans('Menyerahkan...', 'Dispensing...') : t('farmasi.serahkan_selesai')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
