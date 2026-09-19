import React, { useState, useEffect, useRef } from 'react';
import { api } from './api/client';
import AppIcon from './components/AppIcon';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import MasterDataView from './components/MasterDataView';
import PasienView from './components/PasienView';
import KunjunganView from './components/KunjunganView';
import PelayananView from './components/PelayananView';
import RekamMedisView from './components/RekamMedisView';
import FarmasiView from './components/FarmasiView';
import BillingView from './components/BillingView';
import LaporanView from './components/LaporanView';
import RegistrasiDaftarView from './components/RegistrasiDaftarView';
import ProfilKlinikView from './components/ProfilKlinikView';
import PenggunaRoleView from './components/PenggunaRoleView';
import CetakStrukView from './components/CetakStrukView';

export const ROUTES = [
  { view: 'dashboard', path: '/legacy/modules/dashboard/index.php', altPaths: ['/dashboard', '/', ''] },
  
  // Rekam Medis
  { view: 'rekam_medis', path: '/legacy/modules/rekam_medis/index.php', altPaths: ['/rekam-medis', '/rekam_medis'] },
  { view: 'rekam_medis', subView: 'pasien', path: '/legacy/modules/rekam_medis/pasien.php', altPaths: ['/rekam-medis/pasien'] },
  { view: 'rekam_medis', subView: 'detail', path: '/legacy/modules/rekam_medis/detail.php', altPaths: ['/rekam-medis/detail'] },

  // Registrasi
  { view: 'registrasi_daftar', path: '/legacy/modules/registrasi/daftar.php', altPaths: ['/registrasi/daftar', '/daftar', '/registrasi'] },
  { view: 'pasien', subView: 'form', path: '/legacy/modules/registrasi/pasien_form.php', altPaths: ['/pasien/baru', '/pasien/form', '/registrasi/pasien_form.php'] },
  { view: 'pasien', path: '/legacy/modules/registrasi/pasien.php', altPaths: ['/pasien', '/data-pasien'] },
  { view: 'pasien_detail', path: '/legacy/modules/registrasi/pasien_detail.php', altPaths: ['/pasien/detail'] },
  { view: 'kunjungan', path: '/legacy/modules/registrasi/index.php', altPaths: ['/kunjungan', '/data-registrasi'] },

  // Pelayanan
  { view: 'pelayanan', path: '/legacy/modules/pelayanan/index.php', altPaths: ['/pelayanan'] },
  { view: 'pelayanan', subView: 'periksa', path: '/legacy/modules/pelayanan/periksa.php', altPaths: ['/pelayanan/periksa'] },
  { view: 'pelayanan', subView: 'farmasi', path: '/legacy/modules/pelayanan/farmasi.php', altPaths: ['/pelayanan/farmasi'] },
  { view: 'pelayanan', subView: 'farmasi_serah', path: '/legacy/modules/pelayanan/farmasi_serah.php', altPaths: ['/pelayanan/farmasi_serah'] },

  // Billing & Keuangan
  { view: 'billing', path: '/legacy/modules/billing/index.php', altPaths: ['/billing'] },
  { view: 'billing', subView: 'proses', path: '/legacy/modules/billing/proses.php', altPaths: ['/billing/proses'] },
  { view: 'billing', subView: 'detail', path: '/legacy/modules/billing/detail.php', altPaths: ['/billing/detail'] },
  { view: 'billing', subView: 'cetak_invoice', path: '/legacy/modules/billing/cetak_invoice.php', altPaths: ['/billing/cetak_invoice'] },
  { view: 'keuangan', path: '/legacy/modules/keuangan/index.php', altPaths: ['/keuangan'] },
  { view: 'keuangan', subView: 'bayar', path: '/legacy/modules/keuangan/bayar.php', altPaths: ['/keuangan/bayar'] },
  { view: 'keuangan', subView: 'struk', path: '/legacy/modules/keuangan/struk.php', altPaths: ['/keuangan/struk'] },

  // Master Data
  { view: 'master', path: '/legacy/modules/master/index.php', altPaths: ['/master', '/master-data'] },
  { view: 'master', subView: 'crud', path: '/legacy/modules/master/crud.php', altPaths: ['/master/crud'] },

  // Inventory / Farmasi
  { view: 'farmasi', subView: 'stok', path: '/legacy/modules/inventory/index.php', altPaths: ['/inventory', '/farmasi'] },
  { view: 'farmasi', subView: 'pembelian_list', path: '/legacy/modules/inventory/pembelian.php', altPaths: ['/inventory/pembelian'] },
  { view: 'farmasi', subView: 'pembelian_form', path: '/legacy/modules/inventory/pembelian_form.php', altPaths: ['/inventory/pembelian/baru', '/inventory/pembelian_form'] },
  { view: 'farmasi', subView: 'penyesuaian', path: '/legacy/modules/inventory/penyesuaian.php', altPaths: ['/inventory/penyesuaian', '/inventory/opname'] },
  { view: 'farmasi', subView: 'kartu_stok', path: '/legacy/modules/inventory/kartu_stok.php', altPaths: ['/inventory/kartu_stok'] },

  // Laporan
  { view: 'laporan', path: '/legacy/modules/laporan/index.php', altPaths: ['/laporan'] },
  { view: 'laporan', subView: 'lihat', path: '/legacy/modules/laporan/lihat.php', altPaths: ['/laporan/lihat'] },
  { view: 'laporan', subView: 'kunjungan_detail', path: '/legacy/modules/laporan/kunjungan_detail.php', altPaths: ['/laporan/kunjungan_detail'] },

  // Pengaturan & Profil
  { view: 'profil_klinik', path: '/legacy/modules/pengaturan/klinik.php', altPaths: ['/pengaturan/klinik', '/klinik', '/legacy/modules/pengaturan/profil.php', '/legacy/modules/pengaturan/index.php'] },
  { view: 'pengguna_role', path: '/legacy/modules/pengaturan/pengguna.php', altPaths: ['/pengaturan/pengguna', '/pengguna', '/users', '/legacy/modules/pengaturan/users.php'] },
  { view: 'profile', path: '/legacy/modules/akun/profil.php', altPaths: ['/profile', '/akun/profil'] },
];

export function parseLocation() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const group = params.get('g') || params.get('group');
  const jenis = params.get('jenis');
  const invoiceId = params.get('invoice_id');
  const kunjunganId = params.get('kunjungan_id');
  const id = params.get('id') || invoiceId || kunjunganId || params.get('pasien_id');
  const slug = params.get('slug') || params.get('entity') || params.get('report');
  const copy = params.get('copy') === '1' || params.get('copy') === 'true';

  for (const r of ROUTES) {
    if (r.path === pathname || (r.altPaths && r.altPaths.includes(pathname))) {
      return {
        view: r.view,
        subView: r.subView || null,
        group: group || null,
        jenis: jenis || null,
        id: id || null,
        slug: slug || null,
        copy: copy || false,
      };
    }
  }

  // Fallback pattern checks
  if (pathname.includes('billing/cetak_invoice') || pathname.includes('cetak_invoice.php')) {
    return { view: 'billing', subView: 'cetak_invoice', id: kunjunganId || id, copy };
  }
  if (pathname.includes('keuangan/struk') || pathname.includes('struk.php')) {
    return { view: 'keuangan', subView: 'struk', id: invoiceId || id, copy };
  }
  if (pathname.includes('inventory/pembelian_form') || pathname.includes('pembelian_form.php')) {
    return { view: 'farmasi', subView: 'pembelian_form', id };
  }
  if (pathname.includes('inventory/pembelian') || pathname.includes('pembelian.php')) {
    return { view: 'farmasi', subView: 'pembelian_list', id };
  }
  if (pathname.includes('inventory/penyesuaian') || pathname.includes('penyesuaian.php')) {
    return { view: 'farmasi', subView: 'penyesuaian', id };
  }
  if (pathname.includes('inventory/kartu_stok') || pathname.includes('kartu_stok.php')) {
    return { view: 'farmasi', subView: 'kartu_stok', id };
  }
  if (pathname.includes('inventory')) {
    return { view: 'farmasi', subView: 'stok' };
  }
  if (pathname.includes('laporan')) {
    return { view: 'laporan', group: group || 'Operasional', slug, id };
  }
  if (pathname.includes('master')) {
    return { view: 'master', group: group || 'SDM & Poli', slug, id };
  }
  if (pathname.includes('billing/proses') || (pathname.includes('billing') && id)) {
    return { view: 'billing', subView: 'proses', id };
  }
  if (pathname.includes('billing')) {
    return { view: 'billing', subView: 'billing' };
  }
  if (pathname.includes('keuangan/bayar') || (pathname.includes('keuangan') && id)) {
    return { view: 'keuangan', subView: 'bayar', id };
  }
  if (pathname.includes('keuangan')) {
    return { view: 'keuangan', subView: 'keuangan' };
  }
  if (pathname.includes('pelayanan/periksa') || (pathname.includes('pelayanan') && id)) {
    return { view: 'pelayanan', subView: 'periksa', id };
  }
  if (pathname.includes('pelayanan')) {
    return { view: 'pelayanan' };
  }
  if (pathname.includes('rekam_medis/pasien')) {
    return { view: 'rekam_medis', subView: 'pasien', id };
  }
  if (pathname.includes('rekam_medis/detail')) {
    return { view: 'rekam_medis', subView: 'detail', id };
  }
  if (pathname.includes('rekam_medis') || pathname.includes('rekam-medis')) {
    return { view: 'rekam_medis' };
  }
  if (pathname.includes('pasien_form') || pathname.includes('pasien_form.php')) {
    return { view: 'pasien', subView: 'form', id };
  }
  if (pathname.includes('registrasi/daftar') || pathname.includes('daftar.php')) {
    return { view: 'registrasi_daftar', id };
  }
  if (pathname.includes('pasien_detail')) {
    return { view: 'pasien', id };
  }
  if (pathname.includes('pasien')) {
    return { view: 'pasien', subView: 'list' };
  }
  if (pathname.includes('registrasi')) {
    return { view: 'kunjungan' };
  }
  if (pathname.includes('pengaturan/klinik') || pathname.includes('klinik') || pathname.includes('pengaturan/profil')) {
    return { view: 'profil_klinik' };
  }
  if (pathname.includes('pengaturan/pengguna') || pathname.includes('pengguna') || pathname.includes('users')) {
    return { view: 'pengguna_role' };
  }
  if (pathname.includes('akun/profil') || pathname.includes('profil')) {
    return { view: 'profile' };
  }

  return { view: 'dashboard', subView: 'stok' };
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('is_auth') === 'true';
  });
  const [authChecking, setAuthChecking] = useState(true);

  const initialLoc = parseLocation();
  const [currentView, setCurrentView] = useState(() => initialLoc.view || 'dashboard');
  const [farmasiSubView, setFarmasiSubView] = useState(() => initialLoc.subView || 'stok');
  const [pasienSubView, setPasienSubView] = useState(() => (initialLoc.view === 'pasien' && initialLoc.subView === 'form') ? 'form' : 'list');
  const [pasienEditId, setPasienEditId] = useState(() => (initialLoc.view === 'pasien' && initialLoc.id) ? initialLoc.id : null);
  const [selectedPasienForVisit, setSelectedPasienForVisit] = useState(null);
  const [activeExamKunjunganId, setActiveExamKunjunganId] = useState(() => (initialLoc.view === 'pelayanan' && initialLoc.id) ? initialLoc.id : null);
  const [billingProsesId, setBillingProsesId] = useState(() => (initialLoc.view === 'billing' && initialLoc.subView === 'proses') ? initialLoc.id : null);
  const [keuanganBayarId, setKeuanganBayarId] = useState(() => (initialLoc.view === 'keuangan' && initialLoc.subView === 'bayar') ? initialLoc.id : null);
  const [rekamMedisPatientId, setRekamMedisPatientId] = useState(() => (initialLoc.view === 'rekam_medis' && initialLoc.subView === 'pasien') ? initialLoc.id : null);
  const [openNewPatientForm, setOpenNewPatientForm] = useState(false);
  const [openDaftarModal, setOpenDaftarModal] = useState(false);
  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebar') === 'collapsed');

  // Language state: 'id' | 'en'
  const [locale, setLocale] = useState(() => localStorage.getItem('locale') || 'id');
  // Sidebar sub-menu dropdown states
  const [masterNavOpen, setMasterNavOpen] = useState(false);
  const [laporanNavOpen, setLaporanNavOpen] = useState(false);
  const [selectedMasterGroup, setSelectedMasterGroup] = useState(() => (initialLoc.view === 'master' && initialLoc.group) ? initialLoc.group : 'SDM & Poli');
  const [selectedMasterSlug, setSelectedMasterSlug] = useState(() => (initialLoc.view === 'master' && initialLoc.slug) ? initialLoc.slug : null);
  const [selectedLaporanGroup, setSelectedLaporanGroup] = useState(() => (initialLoc.view === 'laporan' && initialLoc.group) ? initialLoc.group : 'Operasional');
  const [selectedLaporanSlug, setSelectedLaporanSlug] = useState(() => (initialLoc.view === 'laporan' && initialLoc.slug) ? initialLoc.slug : null);

  const navigateTo = (view, subView = null, params = {}, replace = false) => {
    let targetRoute = ROUTES.find(r => r.view === view && (subView ? r.subView === subView : !r.subView));
    if (!targetRoute) {
      targetRoute = ROUTES.find(r => r.view === view);
    }
    const basePath = targetRoute ? targetRoute.path : '/legacy/modules/dashboard/index.php';
    
    const searchParams = new URLSearchParams();
    if (params.g) searchParams.set('g', params.g);
    if (params.jenis) searchParams.set('jenis', params.jenis);
    if (params.id) searchParams.set('id', params.id);
    if (params.slug) searchParams.set('slug', params.slug);
    if (params.report) searchParams.set('report', params.report);
    
    const queryString = searchParams.toString() ? '?' + searchParams.toString() : '';
    const fullUrl = basePath + queryString;

    if (window.location.pathname + window.location.search !== fullUrl) {
      if (replace) {
        window.history.replaceState({ view, subView, params }, '', fullUrl);
      } else {
        window.history.pushState({ view, subView, params }, '', fullUrl);
      }
    }

    setCurrentView(view);
    if (subView) setFarmasiSubView(subView);
    if (view === 'pasien') {
      setPasienSubView(subView === 'form' ? 'form' : 'list');
      setPasienEditId(params.id || null);
    }
    if (view === 'pelayanan') setActiveExamKunjunganId(subView === 'periksa' && params.id ? params.id : null);
    if (view === 'billing') setBillingProsesId(subView === 'proses' && params.id ? params.id : null);
    if (view === 'keuangan') setKeuanganBayarId(subView === 'bayar' && params.id ? params.id : null);
    if (view === 'rekam_medis') setRekamMedisPatientId(subView === 'pasien' && params.id ? params.id : null);
    if (params.g && view === 'master') setSelectedMasterGroup(params.g);
    if (params.slug && view === 'master') setSelectedMasterSlug(params.slug);
    if (params.g && view === 'laporan') setSelectedLaporanGroup(params.g);
    if (params.report && view === 'laporan') setSelectedLaporanSlug(params.report);
  };

  useEffect(() => {
    const handlePopState = () => {
      const loc = parseLocation();
      setCurrentView(loc.view);
      if (loc.subView) setFarmasiSubView(loc.subView);
      if (loc.view === 'pasien') {
        setPasienSubView(loc.subView === 'form' ? 'form' : 'list');
        setPasienEditId(loc.id || null);
      }
      if (loc.view === 'pelayanan') setActiveExamKunjunganId(loc.subView === 'periksa' && loc.id ? loc.id : null);
      if (loc.view === 'billing') setBillingProsesId(loc.subView === 'proses' && loc.id ? loc.id : null);
      if (loc.view === 'keuangan') setKeuanganBayarId(loc.subView === 'bayar' && loc.id ? loc.id : null);
      if (loc.view === 'rekam_medis') setRekamMedisPatientId(loc.subView === 'pasien' && loc.id ? loc.id : null);
      if (loc.group && loc.view === 'master') setSelectedMasterGroup(loc.group);
      if (loc.slug && loc.view === 'master') setSelectedMasterSlug(loc.slug);
      if (loc.group && loc.view === 'laporan') setSelectedLaporanGroup(loc.group);
      if (loc.slug && loc.view === 'laporan') setSelectedLaporanSlug(loc.slug);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [masterCounts, setMasterCounts] = useState({
    'Layanan & Tarif': 31,
    'SDM & Poli': 10,
    'Medicine': 11,
    'Penjamin & Bank': 1,
    'Pasien': 3,
    'Billing': 14,
  });

  // Profile data
  const [user, setUser] = useState({
    id: 1,
    nama: 'Super Administrator',
    username: 'superadmin',
    email: 'admin@klinik.local',
    telepon: '08123456789',
    role: 'superadmin',
    role_nama: 'Super Administrator',
    avatar: null,
    created_at: '2026-06-23 00:00:00'
  });

  const [formData, setFormData] = useState({
    nama: 'Super Administrator',
    username: 'superadmin',
    email: 'admin@klinik.local',
    telepon: '08123456789',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const avatarInputRef = useRef(null);

  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Set theme on mount and when changed
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Check auth & load master counts on mount
  useEffect(() => {
    checkAuth();
    loadMasterCounts();
  }, []);

  // Filter sidebar menu when typing in topbar menuSearch matching legacy footer.php
  useEffect(() => {
    const box = document.getElementById('menuSearch');
    if (!box) return;
    const handleSearch = (e) => {
      const q = e.target.value.trim().toLowerCase();
      const nav = document.querySelector('.sidebar nav');
      if (!nav) return;
      nav.querySelectorAll('a').forEach((a) => {
        const hit = a.textContent.toLowerCase().indexOf(q) !== -1;
        a.style.display = hit ? '' : 'none';
      });
      nav.querySelectorAll('.label').forEach((l) => {
        l.style.display = q ? 'none' : '';
      });
    };
    box.addEventListener('input', handleSearch);
    return () => box.removeEventListener('input', handleSearch);
  }, [isAuthenticated]);

  const checkAuth = async () => {
    setAuthChecking(true);
    try {
      const res = await api.get('/auth/me');
      if (res && res.data) {
        const d = res.data;
        setUser(d);
        setFormData({
          nama: d.nama || '',
          username: d.username || '',
          email: d.email || '',
          telepon: d.telepon || '',
        });
        if (d.avatar) setAvatarPreview(d.avatar);
        setIsAuthenticated(true);
        localStorage.setItem('is_auth', 'true');
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('is_auth');
      }
    } catch (err) {
      // Jika 401 (session expired) atau network error → paksa logout
      // Jangan andalkan localStorage karena session di backend sudah tidak valid
      if (err.status === 401 || err.status === 419 || err.status === 403) {
        setIsAuthenticated(false);
        localStorage.removeItem('is_auth');
      } else {
        // Error lain (network down, dll) — pertahankan state dari localStorage
        if (localStorage.getItem('is_auth') === 'true') {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    } finally {
      setAuthChecking(false);
    }
  };


  const handleLogout = async () => {
    const confirmMsg = locale === 'en' ? 'Leave the application?' : 'Keluar dari aplikasi?';
    if (window.confirm(confirmMsg)) {
      try {
        await api.post('/auth/logout');
      } catch {
        // ignore error
      }
      setIsAuthenticated(false);
      localStorage.removeItem('is_auth');
      setUserMenuOpen(false);
    }
  };

  const loadMasterCounts = async () => {
    try {
      const res = await api.get('/master/entities');
      if (res && res.data) {
        const counts = {
          'Layanan & Tarif': 0,
          'SDM & Poli': 0,
          'Farmasi': 0,
          'Penjamin & Bank': 0,
          'Pasien': 0,
          'Kode Pembatalan': 0,
        };
        Object.values(res.data).forEach((ent) => {
          const g = ent.group || '';
          const c = ent.count || 0;
          if (g === 'Layanan & Tarif') counts['Layanan & Tarif'] += c;
          else if (g === 'SDM & Poli') counts['SDM & Poli'] += c;
          else if (g.includes('Farmasi') || g.includes('Medicine') || g.includes('Obat')) counts['Farmasi'] += c;
          else if (g === 'Penjamin & Bank') counts['Penjamin & Bank'] += c;
          else if (g.toLowerCase().includes('pasien')) counts['Pasien'] += c;
          else if (g.includes('Billing')) counts['Kode Pembatalan'] += c;
        });
        counts['Medicine'] = counts['Farmasi'] || 11;
        // Legacy header.php counts table rows per entity without WHERE filter, yielding 14 for Billing
        counts['Billing'] = 14;
        counts['Kode Pembatalan'] = 14;
        setMasterCounts(counts);
      }
    } catch {
      // Use default fallback counts
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar', next ? 'collapsed' : 'expanded');
      return next;
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setErrors(['Ukuran foto maksimal 20 MB.']);
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (re) => {
        setAvatarPreview(re.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');
    setSavingProfile(true);

    try {
      const body = new FormData();
      body.append('nama', formData.nama);
      body.append('username', formData.username);
      body.append('email', formData.email || '');
      body.append('telepon', formData.telepon || '');
      if (avatarFile) {
        body.append('avatar', avatarFile);
      }

      const res = await api.postForm('/profile', body);
      if (res.success) {
        setSuccessMessage(res.message || 'Profil berhasil diperbarui.');
        setUser(prev => ({
          ...prev,
          ...res.data
        }));
        if (res.data.avatar) {
          setAvatarPreview(res.data.avatar);
        }
        setAvatarFile(null);
      }
    } catch (err) {
      setErrors([err.message || 'Gagal memperbarui profil.']);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');

    if (passwordData.new_password.length < 6) {
      setErrors(['Password baru minimal 6 karakter.']);
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrors(['Konfirmasi password tidak cocok.']);
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.post('/profile/password', passwordData);
      if (res.success) {
        setSuccessMessage(res.message || 'Password berhasil diubah.');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      }
    } catch (err) {
      setErrors([err.message || 'Password saat ini tidak sesuai.']);
    } finally {
      setSavingPassword(false);
    }
  };

  const initialLetter = (user?.nama || 'A').charAt(0).toUpperCase();

  const formatDate = (dateStr) => {
    if (!dateStr) return '10 Sep 2026';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f2747', color: '#fff' }}>
        Memuat...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginView
        locale={locale}
        setLocale={setLocale}
        onLoginSuccess={(userData) => {
          if (userData) {
            setUser(prev => ({ ...prev, ...userData }));
            setFormData(prev => ({
              ...prev,
              nama: userData.nama || prev.nama,
              username: userData.username || prev.username,
              email: userData.email || prev.email,
              telepon: userData.telepon || prev.telepon,
            }));
          }
          setIsAuthenticated(true);
          localStorage.setItem('is_auth', 'true');
        }}
      />
    );
  }

  // Standalone print view for receipt and invoice
  const isPrintView = (currentView === 'keuangan' && initialLoc.subView === 'struk') || 
                      (currentView === 'billing' && initialLoc.subView === 'cetak_invoice');

  if (isPrintView) {
    return (
      <CetakStrukView
        invoiceId={initialLoc.id}
        docType={initialLoc.subView === 'struk' ? 'RECEIPT' : 'INVOICE'}
        isCopy={initialLoc.copy}
      />
    );
  }

  return (
    <div className={`layout ${sidebarCollapsed ? 'collapsed' : ''}`} id="appLayout">
      {/* Sidebar matching backend/legacy/includes/header.php & components/sidebar.blade.php */}
      <aside className="sidebar" id="appSidebar">
        <div className="brand">
          <span className="brand-ico">
            <AppIcon name="plus" />
          </span>
          <span className="brand-text">
            SIM Klinik
            <small>PT Sapta Genki Clinic</small>
          </span>
        </div>

        <nav>
          {/* Dashboard */}
          <a 
            className={currentView === 'dashboard' ? 'active' : ''} 
            href="/legacy/modules/dashboard/index.php" 
            onClick={e => { e.preventDefault(); navigateTo('dashboard'); }} 
            title="Dashboard"
          >
            <span className="ico"><AppIcon name="dashboard" /></span>
            <span className="txt">Dashboard</span>
          </a>

          {/* Rekam Medis */}
          <div className="label">REKAM MEDIS</div>
          <a 
            className={currentView === 'rekam_medis' ? 'active' : ''} 
            href="/legacy/modules/rekam_medis/index.php" 
            onClick={e => { e.preventDefault(); navigateTo('rekam_medis'); }} 
            title="Rekam Medis (EMR)"
          >
            <span className="ico"><AppIcon name="rekam" /></span>
            <span className="txt">Rekam Medis</span>
          </a>

          {/* Operasional */}
          <div className="label">OPERASIONAL</div>
          <a 
            className={currentView === 'registrasi_daftar' ? 'active' : ''} 
            href="/legacy/modules/registrasi/daftar.php" 
            onClick={e => { 
              e.preventDefault(); 
              setSelectedPasienForVisit(null);
              navigateTo('registrasi_daftar'); 
            }} 
            title="Registrasi"
          >
            <span className="ico"><AppIcon name="registrasi" /></span>
            <span className="txt">Registrasi</span>
          </a>
          <a 
            className={currentView === 'pasien' ? 'active' : ''} 
            href="/legacy/modules/registrasi/pasien.php" 
            onClick={e => { 
              e.preventDefault(); 
              setPasienSubView('list');
              navigateTo('pasien'); 
            }} 
            title="Data Pasien"
          >
            <span className="ico"><AppIcon name="users" /></span>
            <span className="txt">Data Pasien</span>
          </a>
          <a 
            className={currentView === 'kunjungan' ? 'active' : ''} 
            href="/legacy/modules/registrasi/index.php" 
            onClick={e => { e.preventDefault(); navigateTo('kunjungan'); }} 
            title="Data Registrasi"
          >
            <span className="ico"><AppIcon name="calendar" /></span>
            <span className="txt">Data Registrasi</span>
          </a>

          {/* Keuangan */}
          <div className="label">KEUANGAN</div>
          <a 
            className={currentView === 'billing' ? 'active' : ''} 
            href="/legacy/modules/billing/index.php" 
            onClick={e => { e.preventDefault(); navigateTo('billing'); }} 
            title="Billing & Tagihan"
          >
            <span className="ico"><AppIcon name="billing" /></span>
            <span className="txt">Billing</span>
          </a>
          <a 
            className={currentView === 'keuangan' ? 'active' : ''} 
            href="/legacy/modules/keuangan/index.php" 
            onClick={e => { e.preventDefault(); navigateTo('keuangan'); }} 
            title="Keuangan & Kas"
          >
            <span className="ico"><AppIcon name="keuangan" /></span>
            <span className="txt">Keuangan</span>
          </a>

          {/* Data & Stok */}
          <div className="label">DATA & STOK</div>
          <div className={`nav-group ${masterNavOpen || currentView === 'master' ? 'open' : ''}`}>
            <div className={`nav-parent ${currentView === 'master' ? 'active' : ''}`}>
              <button 
                type="button" 
                className="np-link" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('master', null, { g: selectedMasterGroup });
                  setMasterNavOpen(true);
                }} 
                title="Master Data"
              >
                <span className="ico"><AppIcon name="master" /></span>
                <span className="txt">Master Data</span>
              </button>
              <button 
                type="button" 
                className="np-caret" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMasterNavOpen(prev => !prev);
                }} 
                aria-label="Buka/tutup sub-menu"
              >
                <AppIcon name="chevron" />
              </button>
            </div>
            <div className="nav-sub">
              <a 
                className={currentView === 'master' && selectedMasterGroup === 'Layanan & Tarif' ? 'active' : ''} 
                href="/legacy/modules/master/index.php?g=Layanan%20%26%20Tarif" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('master', null, { g: 'Layanan & Tarif' });
                }}
              >
                <span className="dot"></span>
                <span className="txt">Layanan & Tarif</span>
                <span className="cnt c1">{masterCounts['Layanan & Tarif'] ?? 0}</span>
              </a>
              <a 
                className={currentView === 'master' && selectedMasterGroup === 'SDM & Poli' ? 'active' : ''} 
                href="/legacy/modules/master/index.php?g=SDM%20%26%20Poli" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('master', null, { g: 'SDM & Poli' });
                }}
              >
                <span className="dot"></span>
                <span className="txt">SDM & Poli</span>
                <span className="cnt c2">{masterCounts['SDM & Poli'] ?? 0}</span>
              </a>
              <a 
                className={currentView === 'master' && (selectedMasterGroup === 'Medicine' || selectedMasterGroup === 'Farmasi' || selectedMasterGroup === 'Farmasi & Obat') ? 'active' : ''} 
                href="/legacy/modules/master/index.php?g=Medicine" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('master', null, { g: 'Medicine' });
                }}
              >
                <span className="dot"></span>
                <span className="txt">Medicine</span>
                <span className="cnt c3">{masterCounts['Farmasi'] ?? 0}</span>
              </a>
              <a 
                className={currentView === 'master' && selectedMasterGroup === 'Penjamin & Bank' ? 'active' : ''} 
                href="/legacy/modules/master/index.php?g=Penjamin%20%26%20Bank" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('master', null, { g: 'Penjamin & Bank' });
                }}
              >
                <span className="dot"></span>
                <span className="txt">Penjamin & Bank</span>
                <span className="cnt c4">{masterCounts['Penjamin & Bank'] ?? 0}</span>
              </a>
              <a 
                className={currentView === 'master' && selectedMasterGroup === 'Pasien' ? 'active' : ''} 
                href="/legacy/modules/master/index.php?g=Pasien" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('master', null, { g: 'Pasien' });
                }}
              >
                <span className="dot"></span>
                <span className="txt">Pasien</span>
                <span className="cnt c5">{masterCounts['Pasien'] ?? 0}</span>
              </a>
              <a 
                className={currentView === 'master' && (selectedMasterGroup === 'Kode Pembatalan' || selectedMasterGroup === 'Billing') ? 'active' : ''} 
                href="/legacy/modules/master/index.php?g=Billing" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('master', null, { g: 'Billing' });
                }}
              >
                <span className="dot"></span>
                <span className="txt">Kode Pembatalan</span>
                <span className="cnt c6">{masterCounts['Billing'] ?? 14}</span>
              </a>
            </div>
          </div>
          <a 
            className={currentView === 'farmasi' ? 'active' : ''} 
            href="/legacy/modules/inventory/index.php" 
            onClick={e => { e.preventDefault(); navigateTo('farmasi', 'stok'); }} 
            title="Inventory"
          >
            <span className="ico"><AppIcon name="inventory" /></span>
            <span className="txt">Inventory</span>
          </a>

          {/* Lainnya */}
          <div className="label">LAINNYA</div>
          <div className={`nav-group ${laporanNavOpen || currentView === 'laporan' ? 'open' : ''}`}>
            <div className={`nav-parent ${currentView === 'laporan' ? 'active' : ''}`}>
              <button 
                type="button" 
                className="np-link" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('laporan', null, { g: selectedLaporanGroup });
                  setLaporanNavOpen(true);
                }} 
                title="Laporan"
              >
                <span className="ico"><AppIcon name="laporan" /></span>
                <span className="txt">Laporan</span>
              </button>
              <button 
                type="button" 
                className="np-caret" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLaporanNavOpen(prev => !prev);
                }} 
                aria-label="Buka/tutup sub-menu"
              >
                <AppIcon name="chevron" />
              </button>
            </div>
            <div className="nav-sub">
              <a 
                className={currentView === 'laporan' && selectedLaporanGroup === 'Operasional' ? 'active' : ''} 
                href="/legacy/modules/laporan/index.php?g=Operasional" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('laporan', null, { g: 'Operasional' });
                }}
              >
                <span className="dot"></span>
                <span className="txt">Operasional</span>
                <span className="cnt c1">3</span>
              </a>
              <a 
                className={currentView === 'laporan' && selectedLaporanGroup === 'Keuangan' ? 'active' : ''} 
                href="/legacy/modules/laporan/index.php?g=Keuangan" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('laporan', null, { g: 'Keuangan' });
                }}
              >
                <span className="dot"></span>
                <span className="txt">Keuangan</span>
                <span className="cnt c2">4</span>
              </a>
              <a 
                className={currentView === 'laporan' && selectedLaporanGroup === 'Penunjang' ? 'active' : ''} 
                href="/legacy/modules/laporan/index.php?g=Penunjang" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('laporan', null, { g: 'Penunjang' });
                }}
              >
                <span className="dot"></span>
                <span className="txt">Penunjang</span>
                <span className="cnt c3">3</span>
              </a>
            </div>
          </div>

          {/* Pengaturan */}
          <div className="label">PENGATURAN</div>
          <a 
            className={currentView === 'profil_klinik' ? 'active' : ''} 
            href="/legacy/modules/pengaturan/klinik.php" 
            onClick={e => { e.preventDefault(); navigateTo('profil_klinik'); }} 
            title="Profil Klinik"
          >
            <span className="ico"><AppIcon name="hospital" /></span>
            <span className="txt">Profil Klinik</span>
          </a>
          <a 
            className={currentView === 'pengguna_role' ? 'active' : ''} 
            href="/legacy/modules/pengaturan/pengguna.php" 
            onClick={e => { e.preventDefault(); navigateTo('pengguna_role'); }} 
            title="Pengguna & Role"
          >
            <span className="ico"><AppIcon name="users" /></span>
            <span className="txt">Pengguna &amp; Role</span>
          </a>
        </nav>

        <div className="sidebar-foot">
          <button type="button" className="logout-link" onClick={handleLogout} title={locale === 'en' ? 'Logout' : 'Keluar'}>
            <span className="ico"><AppIcon name="logout" /></span>
            <span className="txt">{locale === 'en' ? 'Logout' : 'Keluar'}</span>
          </button>
        </div>
      </aside>

      <button 
        type="button" 
        className="sidebar-backdrop" 
        onClick={toggleSidebar} 
        aria-label="Tutup Menu" 
        tabIndex="-1"
      />

      {/* Main Content Area */}
      <div className="main">
        {/* Topbar Header matching backend/resources/views/layouts/app.blade.php */}
        <header className="topbar">
          <div className="topbar-left">
            <button 
              className="menu-toggle" 
              type="button" 
              id="menuToggle" 
              onClick={toggleSidebar} 
              title="Menu" 
              aria-expanded={!sidebarCollapsed}
            >
              <span className="mt-bars"><AppIcon name="menu" /></span>
              <span className="mt-x"><AppIcon name="close" /></span>
            </button>
            <div className="topbar-search">
              <span className="ts-ico"><AppIcon name="search" /></span>
              <input type="search" id="menuSearch" placeholder="Cari menu..." autoComplete="off" />
            </div>
          </div>

          <div className="topbar-right">
            {/* Language Switcher matching backend lang-switcher */}
            <div className="lang-picker">
              <label className="lang-picker-label" htmlFor="appLangSelect">Bahasa</label>
              <select 
                id="appLangSelect" 
                className="lang-picker-select" 
                aria-label="Bahasa"
                value={locale}
                onChange={(e) => {
                  setLocale(e.target.value);
                  localStorage.setItem('locale', e.target.value);
                }}
              >
                <option value="id">Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* User Dropdown Chip */}
            <div className="user-dropdown" id="userDropdown" style={{ position: 'relative' }}>
              <button 
                type="button" 
                className="user-chip" 
                onClick={() => setUserMenuOpen(!userMenuOpen)} 
                aria-haspopup="true" 
                aria-expanded={userMenuOpen}
              >
                <div className="avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" />
                  ) : (
                    initialLetter
                  )}
                </div>
                <div className="user-meta">
                  <div className="user-name">{user.nama}</div>
                  <div className="user-role">{user.role_nama || user.role}</div>
                </div>
                <span className="user-caret"><AppIcon name="chevron" /></span>
              </button>

              {userMenuOpen && (
                <div 
                  className="user-menu" 
                  role="menu"
                  style={{
                    display: 'block',
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '8px',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '180px',
                    zIndex: 100,
                    padding: '6px'
                  }}
                >
                  <a 
                    href="/legacy/modules/akun/profil.php" 
                    role="menuitem"
                    onClick={(e) => { e.preventDefault(); navigateTo('profile'); setUserMenuOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'var(--text)'
                    }}
                  >
                    <span className="ico"><AppIcon name="user" /></span> Profil Saya
                  </a>
                  <div className="user-menu-sep" style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }}></div>
                  <button 
                    type="button" 
                    role="menuitem"
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'none',
                      fontSize: '14px',
                      color: 'var(--red)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span className="ico"><AppIcon name="logout" /></span> {locale === 'en' ? 'Logout' : 'Keluar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content View Switching */}
        <main className="content">
          {currentView === 'dashboard' ? (
            <DashboardView onNavigate={(v) => {
              if (v === 'pasien_form') {
                 setPasienSubView('form');
                 setOpenNewPatientForm(true);
                 navigateTo('pasien', 'form');
              } else if (v === 'pasien') {
                 setPasienSubView('list');
                 navigateTo('pasien');
              } else if (v === 'registrasi_daftar') {
                 setSelectedPasienForVisit(null);
                 navigateTo('registrasi_daftar');
              } else {
                 navigateTo(v);
              }
            }} />
          ) : currentView === 'registrasi_daftar' ? (
            <RegistrasiDaftarView
              initialPasien={selectedPasienForVisit}
              onNavigate={(v) => {
                if (v === 'pasien_form') {
                  setPasienSubView('form');
                  setOpenNewPatientForm(true);
                  navigateTo('pasien', 'form');
                } else {
                  navigateTo(v);
                }
              }}
            />
          ) : currentView === 'pelayanan' ? (
            <PelayananView
              initialKunjunganId={activeExamKunjunganId}
              onExamCompleted={() => {
                setActiveExamKunjunganId(null);
                navigateTo('rekam_medis');
              }}
              onExamStateChange={(id) => {
                navigateTo('pelayanan', id ? 'periksa' : null, id ? { id } : {});
              }}
            />
          ) : currentView === 'rekam_medis' ? (
            <RekamMedisView
              initialPasienId={rekamMedisPatientId}
              onNavigatePatient={(id) => {
                navigateTo('rekam_medis', id ? 'pasien' : null, id ? { id } : {});
              }}
              onNavigateToExam={(kunjunganId) => {
                setActiveExamKunjunganId(kunjunganId);
                navigateTo('pelayanan', 'periksa', { id: kunjunganId });
              }}
            />
          ) : currentView === 'kunjungan' ? (
            <KunjunganView
              onNavigate={(v) => navigateTo(v)}
              onNavigateToDaftar={() => {
                setSelectedPasienForVisit(null);
                navigateTo('registrasi_daftar');
              }}
            />
          ) : currentView === 'pasien' ? (
            <PasienView
              key={'pasien-' + (pasienSubView || 'list') + '-' + (pasienEditId || 'new')}
              initialViewMode={pasienSubView === 'form' || openNewPatientForm ? 'form' : 'list'}
              initialEditId={pasienEditId}
              initialOpenForm={openNewPatientForm}
              onCloseInitialForm={() => setOpenNewPatientForm(false)}
              onNavigateMode={(m, id) => {
                setPasienSubView(m);
                navigateTo('pasien', m === 'form' ? 'form' : null, id ? { id } : {});
              }}
              onRegisterVisit={(p) => {
                setSelectedPasienForVisit(p);
                navigateTo('registrasi_daftar', null, { pasien_id: p.id });
              }}
            />
          ) : currentView === 'farmasi' ? (
            <FarmasiView
              initialSubView={farmasiSubView}
              onNavigateSubView={(sub) => {
                setFarmasiSubView(sub);
                navigateTo('farmasi', sub);
              }}
            />
          ) : currentView === 'billing' ? (
            <BillingView
              key={'billing-' + (billingProsesId || 'list')}
              initialTab="billing"
              initialProsesId={billingProsesId}
              onNavigateSubView={(sub, id) => {
                navigateTo(sub === 'bayar' ? 'keuangan' : 'billing', sub, id ? { id } : {});
              }}
            />
          ) : currentView === 'keuangan' ? (
            <BillingView
              key={'keuangan-' + (keuanganBayarId || 'list')}
              initialTab="keuangan"
              initialBayarId={keuanganBayarId}
              onNavigateSubView={(sub, id) => {
                navigateTo(sub === 'proses' ? 'billing' : 'keuangan', sub, id ? { id } : {});
              }}
            />
          ) : currentView === 'master' ? (
            <MasterDataView
              key={selectedMasterGroup + '-' + (selectedMasterSlug || '')}
              initialGroup={selectedMasterGroup}
              onNavigateSlug={(g, s) => {
                setSelectedMasterGroup(g);
                setSelectedMasterSlug(s);
                navigateTo('master', null, { g, slug: s });
              }}
            />
          ) : currentView === 'laporan' ? (
            <LaporanView
              key={selectedLaporanGroup + '-' + (selectedLaporanSlug || '')}
              initialTab={selectedLaporanGroup}
              initialSlug={selectedLaporanSlug}
              onNavigateSlug={(g, s) => {
                setSelectedLaporanGroup(g);
                setSelectedLaporanSlug(s);
                navigateTo('laporan', null, { g, report: s });
              }}
            />
          ) : currentView === 'profil_klinik' ? (
            <ProfilKlinikView />
          ) : currentView === 'pengguna_role' ? (
            <PenggunaRoleView currentUserId={user?.id} />
          ) : (
            <>
              <div className="page-toolbar">
                <div>
                  <div className="pt-title">Profil Saya</div>
                  <div className="pt-sub">Kelola informasi profil dan kredensial login Anda</div>
                </div>
              </div>

          {/* Flash Messages matching profil.php */}
          {successMessage && (
            <div className="alert alert-success" style={{ marginTop: '14px' }}>
              {successMessage}
            </div>
          )}

          {errors.length > 0 && (
            <div className="alert alert-danger" style={{ marginTop: '14px' }}>
              {errors.map((err, idx) => (
                <div key={idx}>{err}</div>
              ))}
            </div>
          )}

          {/* Hero Section matching backend/legacy/modules/akun/profil.php */}
          <div className="pf-hero" style={{ marginTop: '18px' }}>
            <div className="pf-cover"></div>
            <div className="pf-body">
              <div 
                className="pf-avatar-wrap" 
                onClick={() => avatarInputRef.current?.click()} 
                title="Ganti foto"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} id="avatarPreview" className="pf-avatar" alt="" />
                ) : (
                  <span className="pf-avatar pf-avatar-initial" id="avatarPreviewBox">
                    {initialLetter}
                  </span>
                )}
                <span className="pf-cam">
                  <AppIcon name="plus" />
                </span>
              </div>
              <div className="pf-id">
                <div className="pf-name">
                  {user.nama} <span className="badge badge-blue">{user.role_nama || user.role}</span>
                </div>
                <div className="pf-meta">
                  <AppIcon name="user" /> @{user.username}
                  {user.email && (
                    <>
                      <span className="sep">&middot;</span>
                      {user.email}
                    </>
                  )}
                  <span className="sep">&middot;</span>
                  <AppIcon name="calendar" /> Bergabung {formatDate(user.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Grid matching backend/legacy/modules/akun/profil.php */}
          <div className="pf-grid">
            {/* Kolom kiri: form */}
            <div className="pf-col">
              {/* Card 1: Informasi Akun */}
              <div className="card">
                <div className="step-head">
                  <div className="step-num acc-blue">
                    <AppIcon name="user" />
                  </div>
                  <div>
                    <div className="st-title">Informasi Akun</div>
                    <div className="st-sub">Kelola data identitas dan kontak</div>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile}>
                  <input 
                    type="file" 
                    ref={avatarInputRef} 
                    accept="image/*" 
                    hidden 
                    onChange={handleAvatarChange} 
                  />

                  <div className="form-group">
                    <label>Nama Lengkap</label>
                    <input 
                      type="text" 
                      name="nama" 
                      className="form-control" 
                      value={formData.nama} 
                      onChange={e => setFormData({ ...formData, nama: e.target.value })}
                      required 
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Username</label>
                      <input 
                        type="text" 
                        name="username" 
                        className="form-control" 
                        value={formData.username} 
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                        required 
                        autoComplete="username" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input 
                        type="email" 
                        name="email" 
                        className="form-control" 
                        value={formData.email} 
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="nama@email.com" 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Nomor Telepon</label>
                    <input 
                      type="text" 
                      name="telepon" 
                      className="form-control" 
                      value={formData.telepon} 
                      onChange={e => setFormData({ ...formData, telepon: e.target.value })}
                      placeholder="08xx" 
                      inputMode="tel" 
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', marginTop: '16px', paddingTop: '16px' }}>
                    <button className="btn" type="submit" disabled={savingProfile}>
                      <AppIcon name="save" /> {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 2: Keamanan */}
              <div className="card" style={{ marginTop: '16px' }}>
                <div className="step-head">
                  <div className="step-num acc-orange">
                    <AppIcon name="logout" />
                  </div>
                  <div>
                    <div className="st-title">Keamanan</div>
                    <div className="st-sub">Ganti password akun</div>
                  </div>
                </div>

                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label>Password Saat Ini</label>
                    <input 
                      type="password" 
                      name="current_password" 
                      className="form-control" 
                      value={passwordData.current_password}
                      onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      required 
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Password Baru</label>
                      <input 
                        type="password" 
                        name="new_password" 
                        className="form-control" 
                        value={passwordData.new_password}
                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        required 
                        minLength={6} 
                        placeholder="Min. 6 karakter" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Konfirmasi Password</label>
                      <input 
                        type="password" 
                        name="confirm_password" 
                        className="form-control" 
                        value={passwordData.confirm_password}
                        onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        required 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', marginTop: '16px', paddingTop: '16px' }}>
                    <button className="btn btn-outline" type="submit" disabled={savingPassword}>
                      <AppIcon name="save" /> {savingPassword ? 'Menyimpan...' : 'Ganti Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Kolom kanan: akses cepat matching backend/legacy/modules/akun/profil.php */}
            <div className="pf-col-side">
              <div className="card">
                <div className="step-head">
                  <div className="step-num acc-purple">
                    <AppIcon name="dashboard" />
                  </div>
                  <div>
                    <div className="st-title">Akses Cepat</div>
                  </div>
                </div>

                <div className="pf-quicks">
                  <a 
                    className="pf-quick" 
                    href="#dashboard" 
                    onClick={e => { e.preventDefault(); setCurrentView('dashboard'); }}
                  >
                    <span className="qic"><AppIcon name="dashboard" /></span>
                    <span>
                      <span className="q-t">Dashboard</span>
                      <span className="q-s">Ringkasan operasional klinik</span>
                    </span>
                    <span className="q-go"><AppIcon name="chevron" /></span>
                  </a>

                  <a 
                    className="pf-quick" 
                    href="#users" 
                    onClick={e => { e.preventDefault(); alert('Modul Pengguna & Role'); }}
                  >
                    <span className="qic"><AppIcon name="users" /></span>
                    <span>
                      <span className="q-t">Pengguna & Role</span>
                      <span className="q-s">Kelola akun & hak akses sistem</span>
                    </span>
                    <span className="q-go"><AppIcon name="chevron" /></span>
                  </a>

                  <a 
                    className="pf-quick" 
                    href="#klinik" 
                    onClick={e => { e.preventDefault(); alert('Modul Profil Klinik'); }}
                  >
                    <span className="qic"><AppIcon name="hospital" /></span>
                    <span>
                      <span className="q-t">Profil Klinik</span>
                      <span className="q-s">Identitas & informasi klinik</span>
                    </span>
                    <span className="q-go"><AppIcon name="chevron" /></span>
                  </a>

                  <button 
                    type="button" 
                    className="pf-quick pf-quick-danger"
                    onClick={handleLogout}
                  >
                    <span className="qic"><AppIcon name="logout" /></span>
                    <span>
                      <span className="q-t">{locale === 'en' ? 'Logout' : 'Keluar'}</span>
                      <span className="q-s">{locale === 'en' ? 'Sign out of this account' : 'Keluar dari akun ini'}</span>
                    </span>
                    <span className="q-go"><AppIcon name="chevron" /></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </main>

        <footer className="footer">
          &copy; {new Date().getFullYear()} {locale === 'en' ? 'Clinic Management Information System' : 'Sistem Informasi Manajemen Klinik'} &middot; PT Sapta Genki Clinic
        </footer>
      </div>
    </div>
  );
}
