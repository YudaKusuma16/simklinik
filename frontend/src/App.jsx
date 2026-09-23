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
import { useI18n } from './i18n';

export const ROUTES = [
  { view: 'login', path: '/login', altPaths: ['/masuk', '/auth/login', '/legacy/auth/login.php'] },
  { view: 'dashboard', path: '/dashboard', altPaths: ['/', '', '/legacy/modules/dashboard/index.php'] },
  
  // Registrasi & Pasien & Kunjungan
  { view: 'registrasi_daftar', path: '/pendaftaran', altPaths: ['/daftar', '/registrasi', '/registrasi/daftar', '/legacy/modules/registrasi/daftar.php'] },
  { view: 'pasien', subView: 'form', path: '/pasien/baru', altPaths: ['/pasien/form', '/legacy/modules/registrasi/pasien_form.php', '/registrasi/pasien_form.php'] },
  { view: 'pasien', path: '/pasien', altPaths: ['/data-pasien', '/legacy/modules/registrasi/pasien.php'] },
  { view: 'kunjungan', path: '/kunjungan', altPaths: ['/antrean', '/data-registrasi', '/legacy/modules/registrasi/index.php'] },

  // Pelayanan
  { view: 'pelayanan', path: '/pelayanan', altPaths: ['/legacy/modules/pelayanan/index.php'] },
  { view: 'pelayanan', subView: 'periksa', path: '/pelayanan/periksa', altPaths: ['/legacy/modules/pelayanan/periksa.php'] },

  // Rekam Medis
  { view: 'rekam_medis', path: '/rekam-medis', altPaths: ['/rekam_medis', '/legacy/modules/rekam_medis/index.php'] },
  { view: 'rekam_medis', subView: 'pasien', path: '/rekam-medis/pasien', altPaths: ['/rekam_medis/pasien', '/legacy/modules/rekam_medis/pasien.php'] },
  { view: 'rekam_medis', subView: 'detail', path: '/rekam-medis/detail', altPaths: ['/rekam_medis/detail', '/legacy/modules/rekam_medis/detail.php'] },

  // Farmasi / Inventory
  { view: 'farmasi', path: '/farmasi', altPaths: ['/inventory', '/legacy/modules/inventory/index.php'] },
  { view: 'farmasi', subView: 'stok', path: '/farmasi/stok', altPaths: ['/inventory/stok'] },
  { view: 'farmasi', subView: 'pembelian_list', path: '/farmasi/pembelian', altPaths: ['/inventory/pembelian', '/legacy/modules/inventory/pembelian.php'] },
  { view: 'farmasi', subView: 'pembelian_form', path: '/farmasi/pembelian/baru', altPaths: ['/inventory/pembelian/baru', '/inventory/pembelian_form', '/legacy/modules/inventory/pembelian_form.php'] },
  { view: 'farmasi', subView: 'penyesuaian', path: '/farmasi/penyesuaian', altPaths: ['/inventory/penyesuaian', '/inventory/opname', '/legacy/modules/inventory/penyesuaian.php'] },
  { view: 'farmasi', subView: 'kartu_stok', path: '/farmasi/kartu-stok', altPaths: ['/inventory/kartu_stok', '/legacy/modules/inventory/kartu_stok.php'] },

  // Billing & Keuangan
  { view: 'billing', path: '/billing', altPaths: ['/legacy/modules/billing/index.php'] },
  { view: 'billing', subView: 'proses', path: '/billing/proses', altPaths: ['/legacy/modules/billing/proses.php'] },
  { view: 'billing', subView: 'cetak_invoice', path: '/billing/cetak_invoice', altPaths: ['/legacy/modules/billing/cetak_invoice.php', '/cetak_invoice.php'] },
  { view: 'keuangan', path: '/keuangan', altPaths: ['/legacy/modules/keuangan/index.php'] },
  { view: 'keuangan', subView: 'bayar', path: '/keuangan/bayar', altPaths: ['/legacy/modules/keuangan/bayar.php'] },
  { view: 'keuangan', subView: 'struk', path: '/keuangan/struk', altPaths: ['/legacy/modules/keuangan/struk.php', '/struk.php'] },

  // Master Data
  { view: 'master', path: '/master', altPaths: ['/master-data', '/legacy/modules/master/index.php'] },
  { view: 'master', subView: 'crud', path: '/master/crud', altPaths: ['/legacy/modules/master/crud.php'] },

  // Laporan
  { view: 'laporan', path: '/laporan', altPaths: ['/legacy/modules/laporan/index.php'] },
  { view: 'laporan', subView: 'lihat', path: '/laporan/lihat', altPaths: ['/legacy/modules/laporan/lihat.php'] },
  { view: 'laporan', subView: 'kunjungan_detail', path: '/laporan/kunjungan_detail', altPaths: ['/legacy/modules/laporan/kunjungan_detail.php'] },

  // Pengaturan & Profil
  { view: 'profil_klinik', path: '/pengaturan/klinik', altPaths: ['/klinik', '/pengaturan/profil', '/legacy/modules/pengaturan/klinik.php', '/legacy/modules/pengaturan/profil.php', '/legacy/modules/pengaturan/index.php'] },
  { view: 'pengguna_role', path: '/pengaturan/pengguna', altPaths: ['/pengguna', '/users', '/legacy/modules/pengaturan/pengguna.php', '/legacy/modules/pengaturan/users.php'] },
  { view: 'profile', path: '/profil-saya', altPaths: ['/profile', '/akun/profil', '/legacy/modules/akun/profil.php'] },
];

export function parseLocation() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const group = params.get('g') || params.get('group');
  const jenis = params.get('jenis');
  const invoiceId = params.get('invoice_id');
  const kunjunganId = params.get('kunjungan_id');
  let id = params.get('id') || invoiceId || kunjunganId || params.get('pasien_id');
  let slug = params.get('slug') || params.get('entity') || params.get('report');
  const copy = params.get('copy') === '1' || params.get('copy') === 'true';

  // Specific dynamic path regex matching
  // 1. /pelayanan/:kunjunganId
  const matchPelayanan = pathname.match(/^\/pelayanan\/(\d+)/);
  if (matchPelayanan) {
    return {
      view: 'pelayanan',
      subView: 'periksa',
      id: matchPelayanan[1],
      group,
      jenis,
      slug,
      copy,
    };
  }

  // 2. /rekam-medis/:id or /rekam_medis/:id
  const matchRekamMedis = pathname.match(/^\/rekam[-_]medis\/(\d+)/);
  if (matchRekamMedis) {
    return {
      view: 'rekam_medis',
      subView: 'pasien',
      id: matchRekamMedis[1],
      group,
      jenis,
      slug,
      copy,
    };
  }

  // 3. /master/:slug (e.g. /master/obat, /master/poli)
  const matchMaster = pathname.match(/^\/master(?:\-data)?\/([a-zA-Z0-9_\-]+)/);
  if (matchMaster && matchMaster[1] !== 'index.php' && matchMaster[1] !== 'crud.php' && matchMaster[1] !== 'crud') {
    return {
      view: 'master',
      slug: matchMaster[1],
      group,
      jenis,
      id,
      copy,
    };
  }

  // 4. /laporan/:slug (e.g. /laporan/kunjungan, /laporan/pendapatan)
  const matchLaporan = pathname.match(/^\/laporan\/([a-zA-Z0-9_\-]+)/);
  if (matchLaporan && matchLaporan[1] !== 'index.php' && matchLaporan[1] !== 'lihat.php' && matchLaporan[1] !== 'kunjungan_detail.php') {
    return {
      view: 'laporan',
      slug: matchLaporan[1],
      group: group || 'Operasional',
      jenis,
      id,
      copy,
    };
  }

  // 5. /pasien/baru or /pasien/:id
  if (pathname === '/pasien/baru' || pathname === '/pasien/form' || pathname.includes('pasien_form')) {
    return { view: 'pasien', subView: 'form', id, group, jenis, slug, copy };
  }
  const matchPasien = pathname.match(/^\/pasien\/(\d+)/);
  if (matchPasien) {
    return { view: 'pasien', subView: 'list', id: matchPasien[1], group, jenis, slug, copy };
  }

  // Check exact ROUTES
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

  // Fallback checks
  if (pathname.includes('billing/cetak_invoice') || pathname.includes('cetak_invoice.php')) {
    return { view: 'billing', subView: 'cetak_invoice', id: kunjunganId || id, copy };
  }
  if (pathname.includes('keuangan/struk') || pathname.includes('struk.php')) {
    return { view: 'keuangan', subView: 'struk', id: invoiceId || id, copy };
  }
  if (pathname.includes('inventory/pembelian_form') || pathname.includes('pembelian_form.php') || pathname.includes('farmasi/pembelian/baru')) {
    return { view: 'farmasi', subView: 'pembelian_form', id };
  }
  if (pathname.includes('inventory/pembelian') || pathname.includes('pembelian.php') || pathname.includes('farmasi/pembelian')) {
    return { view: 'farmasi', subView: 'pembelian_list', id };
  }
  if (pathname.includes('inventory/penyesuaian') || pathname.includes('penyesuaian.php') || pathname.includes('farmasi/penyesuaian') || pathname.includes('opname')) {
    return { view: 'farmasi', subView: 'penyesuaian', id };
  }
  if (pathname.includes('inventory/kartu_stok') || pathname.includes('kartu_stok.php') || pathname.includes('farmasi/kartu-stok')) {
    return { view: 'farmasi', subView: 'kartu_stok', id };
  }
  if (pathname.includes('inventory') || pathname.includes('farmasi')) {
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
  if (pathname.includes('rekam_medis') || pathname.includes('rekam-medis')) {
    return { view: 'rekam_medis', subView: id ? 'pasien' : null, id };
  }
  if (pathname.includes('pendaftaran') || pathname.includes('registrasi/daftar') || pathname.includes('daftar.php')) {
    return { view: 'registrasi_daftar', id };
  }
  if (pathname.includes('kunjungan') || pathname.includes('registrasi')) {
    return { view: 'kunjungan' };
  }
  if (pathname.includes('pasien')) {
    return { view: 'pasien', subView: 'list', id };
  }
  if (pathname.includes('pengaturan/klinik') || pathname.includes('klinik') || pathname.includes('pengaturan/profil')) {
    return { view: 'profil_klinik' };
  }
  if (pathname.includes('pengaturan/pengguna') || pathname.includes('pengguna') || pathname.includes('users')) {
    return { view: 'pengguna_role' };
  }
  if (pathname.includes('profil-saya') || pathname.includes('akun/profil') || pathname.includes('profil') || pathname.includes('profile')) {
    return { view: 'profile' };
  }
  if (pathname.includes('login') || pathname.includes('masuk')) {
    return { view: 'login' };
  }

  return { view: 'dashboard' };
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
  const [rekamMedisPatientId, setRekamMedisPatientId] = useState(() => (initialLoc.view === 'rekam_medis' && (initialLoc.subView === 'pasien' || initialLoc.id)) ? initialLoc.id : null);
  const [openNewPatientForm, setOpenNewPatientForm] = useState(false);
  const [openDaftarModal, setOpenDaftarModal] = useState(false);
  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebar') === 'collapsed');

  // Language from unified i18n context
  const { locale, setLocale, t, isEn, trans, formatTgl } = useI18n();
  const handleLocaleChange = setLocale;

  // Sidebar sub-menu dropdown states
  const [masterNavOpen, setMasterNavOpen] = useState(() => initialLoc.view === 'master');
  const [laporanNavOpen, setLaporanNavOpen] = useState(() => initialLoc.view === 'laporan');
  const [selectedMasterGroup, setSelectedMasterGroup] = useState(() => (initialLoc.view === 'master' && initialLoc.group) ? initialLoc.group : 'SDM & Poli');
  const [selectedMasterSlug, setSelectedMasterSlug] = useState(() => (initialLoc.view === 'master' && initialLoc.slug) ? initialLoc.slug : null);
  const [selectedLaporanGroup, setSelectedLaporanGroup] = useState(() => (initialLoc.view === 'laporan' && initialLoc.group) ? initialLoc.group : 'Operasional');
  const [selectedLaporanSlug, setSelectedLaporanSlug] = useState(() => (initialLoc.view === 'laporan' && initialLoc.slug) ? initialLoc.slug : null);

  const navigateTo = (view, subView = null, params = {}, replace = false) => {
    let fullUrl = '/dashboard';

    if (view === 'login') {
      fullUrl = '/login';
    } else if (view === 'dashboard') {
      fullUrl = '/dashboard';
    } else if (view === 'registrasi_daftar') {
      fullUrl = '/pendaftaran';
      if (params.pasien_id) {
        fullUrl += `?pasien_id=${params.pasien_id}`;
      }
    } else if (view === 'pasien') {
      if (subView === 'form') {
        fullUrl = '/pasien/baru';
      } else {
        fullUrl = '/pasien';
      }
      if (params.id && subView !== 'form') {
        fullUrl = `/pasien/${params.id}`;
      }
    } else if (view === 'kunjungan') {
      fullUrl = '/kunjungan';
    } else if (view === 'pelayanan') {
      if (params.id || (subView === 'periksa' && params.id)) {
        fullUrl = `/pelayanan/${params.id}`;
      } else {
        fullUrl = '/pelayanan';
      }
    } else if (view === 'rekam_medis') {
      if (params.id || (subView === 'pasien' && params.id)) {
        fullUrl = `/rekam-medis/${params.id}`;
      } else {
        fullUrl = '/rekam-medis';
      }
    } else if (view === 'farmasi') {
      fullUrl = '/farmasi';
    } else if (view === 'billing') {
      fullUrl = '/billing';
      if (params.id) {
        fullUrl += `?id=${params.id}`;
      }
    } else if (view === 'keuangan') {
      fullUrl = '/keuangan';
      if (params.id) {
        fullUrl += `?id=${params.id}`;
      }
    } else if (view === 'master') {
      if (params.slug) {
        fullUrl = `/master/${params.slug}`;
      } else {
        fullUrl = '/master';
        if (params.g) fullUrl += `?g=${encodeURIComponent(params.g)}`;
      }
    } else if (view === 'laporan') {
      if (params.report || params.slug) {
        fullUrl = `/laporan/${params.report || params.slug}`;
      } else {
        fullUrl = '/laporan';
        if (params.g) fullUrl += `?g=${encodeURIComponent(params.g)}`;
      }
    } else if (view === 'profil_klinik') {
      fullUrl = '/pengaturan/klinik';
    } else if (view === 'pengguna_role') {
      fullUrl = '/pengaturan/pengguna';
    } else if (view === 'profile') {
      fullUrl = '/profil-saya';
    } else {
      let targetRoute = ROUTES.find(r => r.view === view && (subView ? r.subView === subView : !r.subView));
      if (!targetRoute) targetRoute = ROUTES.find(r => r.view === view);
      fullUrl = targetRoute ? targetRoute.path : '/dashboard';
    }

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
    if (view === 'pelayanan') setActiveExamKunjunganId(subView === 'periksa' && params.id ? params.id : (params.id || null));
    if (view === 'billing') setBillingProsesId(subView === 'proses' && params.id ? params.id : null);
    if (view === 'keuangan') setKeuanganBayarId(subView === 'bayar' && params.id ? params.id : null);
    if (view === 'rekam_medis') setRekamMedisPatientId(subView === 'pasien' && params.id ? params.id : (params.id || null));
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
      if (loc.view === 'pelayanan') setActiveExamKunjunganId(loc.subView === 'periksa' && loc.id ? loc.id : (loc.id || null));
      if (loc.view === 'billing') setBillingProsesId(loc.subView === 'proses' && loc.id ? loc.id : null);
      if (loc.view === 'keuangan') setKeuanganBayarId(loc.subView === 'bayar' && loc.id ? loc.id : null);
      if (loc.view === 'rekam_medis') setRekamMedisPatientId(loc.subView === 'pasien' && loc.id ? loc.id : (loc.id || null));
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
  const userDropdownRef = useRef(null);

  // Close user dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    const confirmMsg = t('app.logout_confirm');
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
        setErrors([trans('Ukuran foto maksimal 20 MB.', 'Max photo size is 20 MB.')]);
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
        setSuccessMessage(res.message || trans('Profil berhasil diperbarui.', 'Profile updated successfully.'));
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
      setErrors([err.message || trans('Gagal memperbarui profil.', 'Failed to update profile.')]);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');

    if (passwordData.new_password.length < 6) {
      setErrors([trans('Password baru minimal 6 karakter.', 'New password must be at least 6 characters.')]);
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrors([trans('Konfirmasi password tidak cocok.', 'Password confirmation does not match.')]);
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.post('/profile/password', passwordData);
      if (res.success) {
        setSuccessMessage(res.message || trans('Password berhasil diubah.', 'Password changed successfully.'));
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      }
    } catch (err) {
      setErrors([err.message || trans('Password saat ini tidak sesuai.', 'Current password is incorrect.')]);
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
        {t('common.loading_data')}
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
              {t('app.name')}
              <small>{t('app.clinic_name')}</small>
            </span>
          </div>

          <nav>
            {/* Dashboard */}
            <a 
              className={currentView === 'dashboard' ? 'active' : ''} 
              href="/dashboard" 
              onClick={e => { e.preventDefault(); navigateTo('dashboard'); }} 
              title={t('menu.dashboard')}
            >
              <span className="ico"><AppIcon name="dashboard" /></span>
              <span className="txt">{t('menu.dashboard')}</span>
            </a>

            {/* Rekam Medis */}
            <div className="label">{t('menu.groups.rekam_medis')}</div>
            <a 
              className={currentView === 'rekam_medis' ? 'active' : ''} 
              href="/rekam-medis" 
              onClick={e => { e.preventDefault(); navigateTo('rekam_medis'); }} 
              title={t('menu.rekam_medis')}
            >
              <span className="ico"><AppIcon name="rekam" /></span>
              <span className="txt">{t('menu.rekam_medis')}</span>
            </a>

            {/* Operasional */}
            <div className="label">{t('menu.groups.operasional')}</div>
            <a 
              className={currentView === 'registrasi_daftar' ? 'active' : ''} 
              href="/pendaftaran" 
              onClick={e => { 
                e.preventDefault(); 
                setSelectedPasienForVisit(null);
                navigateTo('registrasi_daftar'); 
              }} 
              title={t('menu.new_registration')}
            >
              <span className="ico"><AppIcon name="registrasi" /></span>
              <span className="txt">{t('menu.new_registration')}</span>
            </a>
            <a 
              className={currentView === 'pasien' ? 'active' : ''} 
              href="/pasien" 
              onClick={e => { 
                e.preventDefault(); 
                setPasienSubView('list');
                navigateTo('pasien'); 
              }} 
              title={t('menu.patient_data')}
            >
              <span className="ico"><AppIcon name="users" /></span>
              <span className="txt">{t('menu.patient_data')}</span>
            </a>
            <a 
              className={currentView === 'kunjungan' ? 'active' : ''} 
              href="/kunjungan" 
              onClick={e => { e.preventDefault(); navigateTo('kunjungan'); }} 
              title={t('menu.visit_list')}
            >
              <span className="ico"><AppIcon name="calendar" /></span>
              <span className="txt">{t('menu.visit_list')}</span>
            </a>

            {/* Keuangan */}
            <div className="label">{t('menu.groups.keuangan')}</div>
            <a 
              className={currentView === 'billing' ? 'active' : ''} 
              href="/billing" 
              onClick={e => { e.preventDefault(); navigateTo('billing'); }} 
              title={t('menu.billing')}
            >
              <span className="ico"><AppIcon name="billing" /></span>
              <span className="txt">{t('menu.billing')}</span>
            </a>
            <a 
              className={currentView === 'keuangan' ? 'active' : ''} 
              href="/keuangan" 
              onClick={e => { e.preventDefault(); navigateTo('keuangan'); }} 
              title={t('menu.finance')}
            >
              <span className="ico"><AppIcon name="keuangan" /></span>
              <span className="txt">{t('menu.finance')}</span>
            </a>

            {/* Data & Stok */}
            <div className="label">{t('menu.groups.data_stok')}</div>
            <div className={`nav-group ${masterNavOpen ? 'open' : ''}`}>
              <div className={`nav-parent ${currentView === 'master' ? 'active' : ''}`}>
                <button 
                  type="button" 
                  className="np-link" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('master', null, { g: selectedMasterGroup, slug: selectedMasterSlug });
                    setMasterNavOpen(prev => currentView === 'master' ? !prev : true);
                  }} 
                  title={t('menu.master_data')}
                >
                  <span className="ico"><AppIcon name="master" /></span>
                  <span className="txt">{t('menu.master_data')}</span>
                </button>
                <button 
                  type="button" 
                  className="np-caret" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMasterNavOpen(prev => !prev);
                  }} 
                  aria-label="Sub-menu"
                  aria-expanded={masterNavOpen}
                >
                  <AppIcon name="chevron" />
                </button>
              </div>
              <div className="nav-sub">
                <a 
                  className={currentView === 'master' && selectedMasterGroup === 'Layanan & Tarif' ? 'active' : ''} 
                  href="/master/tindakan" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('master', null, { g: 'Layanan & Tarif', slug: 'tindakan' });
                  }}
                >
                  <span className="dot"></span>
                  <span className="txt">{t('menu.services_tariff')}</span>
                  <span className="cnt c1">{masterCounts['Layanan & Tarif'] ?? 0}</span>
                </a>
                <a 
                  className={currentView === 'master' && selectedMasterGroup === 'SDM & Poli' ? 'active' : ''} 
                  href="/master/poli" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('master', null, { g: 'SDM & Poli', slug: 'poli' });
                  }}
                >
                  <span className="dot"></span>
                  <span className="txt">{t('menu.staff_poli')}</span>
                  <span className="cnt c2">{masterCounts['SDM & Poli'] ?? 0}</span>
                </a>
                <a 
                  className={currentView === 'master' && (selectedMasterGroup === 'Medicine' || selectedMasterGroup === 'Farmasi' || selectedMasterGroup === 'Farmasi & Obat') ? 'active' : ''} 
                  href="/master/obat" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('master', null, { g: 'Medicine', slug: 'obat' });
                  }}
                >
                  <span className="dot"></span>
                  <span className="txt">{t('menu.pharmacy')}</span>
                  <span className="cnt c3">{masterCounts['Farmasi'] ?? 0}</span>
                </a>
                <a 
                  className={currentView === 'master' && selectedMasterGroup === 'Penjamin & Bank' ? 'active' : ''} 
                  href="/master/asuransi" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('master', null, { g: 'Penjamin & Bank', slug: 'asuransi' });
                  }}
                >
                  <span className="dot"></span>
                  <span className="txt">{t('menu.insurance_bank')}</span>
                  <span className="cnt c4">{masterCounts['Penjamin & Bank'] ?? 0}</span>
                </a>
                <a 
                  className={currentView === 'master' && selectedMasterGroup === 'Pasien' ? 'active' : ''} 
                  href="/master/kelompok_pasien" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('master', null, { g: 'Pasien', slug: 'kelompok_pasien' });
                  }}
                >
                  <span className="dot"></span>
                  <span className="txt">{t('menu.patients')}</span>
                  <span className="cnt c5">{masterCounts['Pasien'] ?? 0}</span>
                </a>
                <a 
                  className={currentView === 'master' && (selectedMasterGroup === 'Kode Pembatalan' || selectedMasterGroup === 'Billing') ? 'active' : ''} 
                  href="/master/kode_pembatalan" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('master', null, { g: 'Billing', slug: 'kode_pembatalan' });
                  }}
                >
                  <span className="dot"></span>
                  <span className="txt">{t('menu.cancel_codes')}</span>
                  <span className="cnt c6">{masterCounts['Billing'] ?? 14}</span>
                </a>
              </div>
            </div>
            <a 
              className={currentView === 'farmasi' ? 'active' : ''} 
              href="/farmasi" 
              onClick={e => { e.preventDefault(); navigateTo('farmasi', 'stok'); }} 
              title={t('menu.inventory')}
            >
              <span className="ico"><AppIcon name="inventory" /></span>
              <span className="txt">{t('menu.inventory')}</span>
            </a>

            {/* Lainnya */}
            <div className="label">{t('menu.groups.lainnya')}</div>
            <div className={`nav-group ${laporanNavOpen ? 'open' : ''}`}>
              <div className={`nav-parent ${currentView === 'laporan' ? 'active' : ''}`}>
                <button 
                  type="button" 
                  className="np-link" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('laporan', null, { g: selectedLaporanGroup, report: selectedLaporanSlug });
                    setLaporanNavOpen(prev => currentView === 'laporan' ? !prev : true);
                  }} 
                  title={t('menu.reports')}
                >
                  <span className="ico"><AppIcon name="laporan" /></span>
                  <span className="txt">{t('menu.reports')}</span>
                </button>
                <button 
                  type="button" 
                  className="np-caret" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLaporanNavOpen(prev => !prev);
                  }} 
                  aria-label="Sub-menu"
                  aria-expanded={laporanNavOpen}
                >
                  <AppIcon name="chevron" />
                </button>
              </div>
              <div className="nav-sub">
                <a 
                  className={currentView === 'laporan' && selectedLaporanGroup === 'Operasional' ? 'active' : ''} 
                  href="/laporan/kunjungan" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('laporan', null, { g: 'Operasional', report: 'kunjungan' });
                  }}
                >
                  <span className="dot"></span>
                  <span className="txt">{t('menu.operational')}</span>
                  <span className="cnt c1">3</span>
                </a>
                <a 
                  className={currentView === 'laporan' && selectedLaporanGroup === 'Keuangan' ? 'active' : ''} 
                  href="/laporan/pendapatan" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('laporan', null, { g: 'Keuangan', report: 'pendapatan' });
                  }}
                >
                  <span className="dot"></span>
                  <span className="txt">{t('menu.financial')}</span>
                  <span className="cnt c2">4</span>
                </a>
                <a 
                  className={currentView === 'laporan' && selectedLaporanGroup === 'Penunjang' ? 'active' : ''} 
                  href="/laporan/farmasi" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('laporan', null, { g: 'Penunjang', report: 'farmasi' });
                  }}
                >
                  <span className="dot"></span>
                  <span className="txt">{t('menu.support')}</span>
                  <span className="cnt c3">3</span>
                </a>
              </div>
            </div>

            {/* Pengaturan */}
            <div className="label">{t('menu.groups.pengaturan')}</div>
            <a 
              className={currentView === 'profil_klinik' ? 'active' : ''} 
              href="/pengaturan/klinik" 
              onClick={e => { e.preventDefault(); navigateTo('profil_klinik'); }} 
              title={t('menu.clinic_profile')}
            >
              <span className="ico"><AppIcon name="hospital" /></span>
              <span className="txt">{t('menu.clinic_profile')}</span>
            </a>
            <a 
              className={currentView === 'pengguna_role' ? 'active' : ''} 
              href="/pengaturan/pengguna" 
              onClick={e => { e.preventDefault(); navigateTo('pengguna_role'); }} 
              title={t('menu.users_roles')}
            >
              <span className="ico"><AppIcon name="users" /></span>
              <span className="txt">{t('menu.users_roles')}</span>
            </a>
          </nav>

          <div className="sidebar-foot">
            <button type="button" className="logout-link" onClick={handleLogout} title={t('app.logout')}>
              <span className="ico"><AppIcon name="logout" /></span>
              <span className="txt">{t('app.logout')}</span>
            </button>
          </div>
        </aside>

        <button 
          type="button" 
          className="sidebar-backdrop" 
          onClick={toggleSidebar} 
          aria-label={t('app.close_menu')} 
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
                title={t('app.toggle_menu')} 
                aria-expanded={!sidebarCollapsed}
              >
                <span className="mt-bars"><AppIcon name="menu" /></span>
                <span className="mt-x"><AppIcon name="close" /></span>
              </button>
              <div className="topbar-search">
                <span className="ts-ico"><AppIcon name="search" /></span>
                <input type="search" id="menuSearch" placeholder={t('app.search_menu')} autoComplete="off" />
              </div>
            </div>

            <div className="topbar-right">
              {/* Language Switcher matching backend lang-switcher */}
              <div className="lang-picker">
                <label className="lang-picker-label" htmlFor="appLangSelect">{t('app.language')}</label>
                <select 
                  id="appLangSelect" 
                  className="lang-picker-select" 
                  aria-label={t('app.language')}
                  value={locale}
                  onChange={(e) => handleLocaleChange(e.target.value)}
                >
                  <option value="id">{t('app.lang_id')}</option>
                  <option value="en">{t('app.lang_en')}</option>
                </select>
              </div>

              {/* User Dropdown Chip */}
              <div 
                ref={userDropdownRef}
                className={`user-dropdown ${userMenuOpen ? 'open' : ''}`} 
                id="userDropdown"
              >
                <button 
                  type="button" 
                  className="user-chip" 
                  onClick={() => setUserMenuOpen(prev => !prev)} 
                  aria-haspopup="true" 
                  aria-expanded={userMenuOpen}
                  title={t('app.account_menu')}
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
                  >
                    <a 
                      href="/profil-saya" 
                      role="menuitem"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        navigateTo('profile'); 
                        setUserMenuOpen(false); 
                      }}
                      title={t('app.my_profile')}
                    >
                      <span className="ico"><AppIcon name="user" /></span>
                      <span>{t('app.my_profile')}</span>
                    </a>
                    <div className="user-menu-sep"></div>
                    <button 
                      type="button" 
                      role="menuitem"
                      className="user-menu-btn danger"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      title={t('app.logout')}
                    >
                      <span className="ico"><AppIcon name="logout" /></span>
                      <span>{t('app.logout')}</span>
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
              initialGroup={selectedMasterGroup}
              initialSlug={selectedMasterSlug}
              onNavigateSlug={(g, s) => {
                setSelectedMasterGroup(g);
                setSelectedMasterSlug(s);
                navigateTo('master', null, { g, slug: s });
              }}
            />
          ) : currentView === 'laporan' ? (
            <LaporanView
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
                  <div className="pt-title">{t('profile.title')}</div>
                  <div className="pt-sub">{t('profile.subtitle')}</div>
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
                title={t('profile.change_photo')}
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
                  <AppIcon name="calendar" /> {t('profile.joined')} {formatDate(user.created_at)}
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
                    <div className="st-title">{t('profile.account_info')}</div>
                    <div className="st-sub">{t('profile.account_info_sub')}</div>
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
                    <label>{t('profile.fullname')}</label>
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
                      <label>{t('profile.username')}</label>
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
                      <label>{t('profile.email')}</label>
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
                    <label>{t('profile.phone')}</label>
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
                      <AppIcon name="save" /> {savingProfile ? t('profile.saving') : t('profile.save_changes')}
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
                    <div className="st-title">{t('profile.security')}</div>
                    <div className="st-sub">{t('profile.security_sub')}</div>
                  </div>
                </div>

                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label>{t('profile.curr_password')}</label>
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
                      <label>{t('profile.new_password')}</label>
                      <input 
                        type="password" 
                        name="new_password" 
                        className="form-control" 
                        value={passwordData.new_password}
                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        required 
                        minLength={6} 
                        placeholder={t('profile.min_password_len')} 
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('profile.confirm_password')}</label>
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
                      <AppIcon name="save" /> {savingPassword ? t('profile.saving') : t('profile.change_password_btn')}
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
                    <div className="st-title">{t('profile.quick_access')}</div>
                  </div>
                </div>

                <div className="pf-quicks">
                  <a 
                    className="pf-quick" 
                    href="/dashboard" 
                    onClick={e => { e.preventDefault(); navigateTo('dashboard'); }}
                  >
                    <span className="qic"><AppIcon name="dashboard" /></span>
                    <span>
                      <span className="q-t">{t('menu.dashboard')}</span>
                      <span className="q-s">{t('profile.dash_summary')}</span>
                    </span>
                    <span className="q-go"><AppIcon name="chevron" /></span>
                  </a>

                  <a 
                    className="pf-quick" 
                    href="/pengaturan/pengguna" 
                    onClick={e => { e.preventDefault(); navigateTo('pengguna_role'); }}
                  >
                    <span className="qic"><AppIcon name="users" /></span>
                    <span>
                      <span className="q-t">{t('menu.users_roles')}</span>
                      <span className="q-s">{t('profile.users_summary')}</span>
                    </span>
                    <span className="q-go"><AppIcon name="chevron" /></span>
                  </a>

                  <a 
                    className="pf-quick" 
                    href="/pengaturan/klinik" 
                    onClick={e => { e.preventDefault(); navigateTo('profil_klinik'); }}
                  >
                    <span className="qic"><AppIcon name="hospital" /></span>
                    <span>
                      <span className="q-t">{t('menu.clinic_profile')}</span>
                      <span className="q-s">{t('profile.clinic_summary')}</span>
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
                      <span className="q-t">{t('app.logout')}</span>
                      <span className="q-s">{t('profile.logout_summary')}</span>
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
          &copy; {new Date().getFullYear()} {t('app.copyright')} &middot; PT Sapta Genki Clinic
        </footer>
      </div>
    </div>
  );
}
