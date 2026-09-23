import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import AppIcon from './AppIcon';
import { useI18n } from '../i18n';

export default function ProfilKlinikView() {
  const { t, trans } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    clinic_name: '',
    clinic_unit: '',
    clinic_address: '',
    clinic_logo: '',
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [alert, setAlert] = useState(null);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const showAlert = (text, type = 'success') => {
    setAlert({ text, type });
    setTimeout(() => setAlert(null), 4000);
  };

  useEffect(() => {
    loadClinic();
  }, []);

  const loadClinic = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings/clinic');
      if (res && res.success && res.data) {
        setData(res.data);
        if (res.data.clinic_logo) {
          setLogoPreview(`/${res.data.clinic_logo}`);
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setRemoveLogo(false);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('clinic_name', data.clinic_name);
      formData.append('clinic_unit', data.clinic_unit);
      formData.append('clinic_address', data.clinic_address);
      if (logoFile) formData.append('logo', logoFile);
      if (removeLogo) formData.append('remove_logo', '1');

      const res = await api.postForm('/settings/clinic', formData);
      if (res && res.success) {
        showAlert(trans('Profil rumah sakit berhasil disimpan.', 'Hospital profile saved successfully.'), 'success');
        if (res.data) setData(res.data);
        setLogoFile(null);
      } else {
        setErrors([res?.message || trans('Gagal menyimpan.', 'Failed to save.')]);
      }
    } catch (err) {
      setErrors([err.message || trans('Terjadi kesalahan saat menyimpan.', 'An error occurred while saving.')]);
    } finally {
      setSaving(false);
    }
  };

  const clinicDisplayName = data.clinic_name || 'PT Rumah Sakit';
  const clinicUnit = data.clinic_unit || '';
  const clinicAddress = data.clinic_address || '';

  return (
    <div>
      {/* Page Toolbar matching legacy modules/pengaturan/profil.php */}
      <div className="page-toolbar">
        <div>
          <div className="pt-title">{trans('Profil Rumah Sakit', 'Hospital Profile')}</div>
          <div className="pt-sub">{trans('Identitas ini tampil di struk pembayaran, kartu antrian, dan header aplikasi.', 'This identity appears on payment receipts, queue cards, and application headers.')}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>{trans('Memuat data rumah sakit...', 'Loading hospital data...')}</div>
      ) : (
        <form onSubmit={handleSave} encType="multipart/form-data">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={handleLogoChange}
          />

          {/* Alerts */}
          {alert && (
            <div className={`alert alert-${alert.type}`} style={{ marginTop: 14 }}>{alert.text}</div>
          )}
          {errors.length > 0 && (
            <div className="alert alert-danger" style={{ marginTop: 14 }}>
              {errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          {/* Hero matching legacy pf-hero */}
          <div className="pf-hero" style={{ marginTop: 18 }}>
            <div className="pf-cover"></div>
            <div className="pf-body">
              <div
                className="pf-avatar-wrap"
                onClick={() => fileInputRef.current?.click()}
                title={trans('Ganti logo', 'Change logo')}
                style={{ cursor: 'pointer' }}
              >
                {logoPreview ? (
                  <img src={logoPreview} className="pf-avatar pf-logo" alt="Logo Rumah Sakit" />
                ) : (
                  <span
                    className="pf-avatar pf-avatar-initial pf-logo"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}
                  >
                    <AppIcon name="hospital" style={{ width: 40, height: 40, color: '#fff' }} />
                  </span>
                )}
                <span className="pf-cam"><AppIcon name="plus" /></span>
              </div>
              <div className="pf-id">
                <div className="pf-name">
                  {clinicDisplayName}
                  {clinicUnit && (
                    <span className="badge badge-blue" style={{ marginLeft: 8 }}>{clinicUnit}</span>
                  )}
                </div>
                <div className="pf-meta">
                  <AppIcon name="hospital" style={{ width: 14, height: 14, marginRight: 4 }} />
                  {clinicAddress || <span style={{ color: 'var(--muted)' }}>{trans('Alamat belum diset', 'Address not set')}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Form identitas klinik matching legacy */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="step-head">
              <div className="step-num acc-blue">
                <AppIcon name="hospital" />
              </div>
              <div>
                <div className="st-title">{trans('Identitas Rumah Sakit', 'Hospital Identity')}</div>
                <div className="st-sub">{trans('Nama, unit, alamat & logo', 'Name, unit, address & logo')}</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{trans('Nama Rumah Sakit', 'Hospital Name')}</label>
                <input
                  type="text"
                  name="clinic_name"
                  className="form-control"
                  value={data.clinic_name}
                  placeholder="contoh: PT Rumah Sakit"
                  onChange={(e) => setData(prev => ({ ...prev, clinic_name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>{trans('Unit / Cabang', 'Unit / Branch')}</label>
                <input
                  type="text"
                  name="clinic_unit"
                  className="form-control"
                  value={data.clinic_unit}
                  placeholder="contoh: Unit Bayakarta — Karawang"
                  onChange={(e) => setData(prev => ({ ...prev, clinic_unit: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label>{trans('Alamat', 'Address')}</label>
              <textarea
                name="clinic_address"
                className="form-control"
                rows={3}
                placeholder={trans('Alamat lengkap rumah sakit', 'Complete hospital address')}
                value={data.clinic_address}
                onChange={(e) => setData(prev => ({ ...prev, clinic_address: e.target.value }))}
              />
            </div>

            {logoPreview && (
              <div className="form-group">
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  onClick={handleRemoveLogo}
                  style={{ color: 'var(--red, #e53e3e)' }}
                >
                  {trans('Hapus Logo', 'Remove Logo')}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 16 }}>
              <button className="btn" type="submit" disabled={saving}>
                <AppIcon name="save" /> {saving ? trans('Menyimpan...', 'Saving...') : trans('Simpan Profil', 'Save Profile')}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
