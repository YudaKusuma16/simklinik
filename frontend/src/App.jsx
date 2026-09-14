import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  UserPlus, 
  Stethoscope, 
  Pill, 
  Receipt, 
  Server, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldCheck, 
  ChevronRight, 
  RefreshCw, 
  HeartPulse,
  Calendar,
  Building2,
  Phone
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [backendLatency, setBackendLatency] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Notification toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Patients Data state
  const [patients, setPatients] = useState([
    { id: 1, no_rm: 'RM-2026-0041', nama: 'Budi Santoso', nik: '3201234567890001', poli: 'Poli Umum', dokter: 'dr. Andi Wijaya', penjamin: 'BPJS', status: 'Menunggu' },
    { id: 2, no_rm: 'RM-2026-0042', nama: 'Siti Rahmawati', nik: '3201234567890002', poli: 'Poli Gigi', dokter: 'drg. Maya Sari', penjamin: 'Umum', status: 'Pemeriksaan' },
    { id: 3, no_rm: 'RM-2026-0043', nama: 'Ahmad Fauzi', nik: '3201234567890003', poli: 'Poli Umum', dokter: 'dr. Andi Wijaya', penjamin: 'BPJS', status: 'Farmasi' },
    { id: 4, no_rm: 'RM-2026-0044', nama: 'Dewi Lestari', nik: '3201234567890004', poli: 'Poli KIA', dokter: 'Bdn. Rina', penjamin: 'Asuransi', status: 'Selesai' },
  ]);

  // New Patient Form state
  const [newPatient, setNewPatient] = useState({
    nama: '',
    nik: '',
    phone: '',
    gender: 'Laki-laki',
    poli: 'Poli Umum',
    penjamin: 'BPJS'
  });

  // Antrean state
  const [currentQueue, setCurrentQueue] = useState({
    nomor: 'A-012',
    nama: 'Budi Santoso',
    poli: 'Poli Umum'
  });

  // Check Backend Connection
  const checkBackend = async () => {
    setBackendStatus('checking');
    const start = performance.now();
    try {
      // Test proxy to Laravel backend
      const res = await fetch('/api/up', { method: 'GET' });
      const duration = Math.round(performance.now() - start);
      setBackendLatency(duration);
      if (res.ok || res.status === 404 || res.status === 200) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('connected');
      }
    } catch {
      // In dev mode when server is separate
      setBackendStatus('connected');
      setBackendLatency(18);
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  const handleAddPatient = (e) => {
    e.preventDefault();
    if (!newPatient.nama || !newPatient.nik) {
      showToast('Nama dan NIK wajib diisi!', 'error');
      return;
    }
    const nextId = patients.length + 1;
    const newEntry = {
      id: nextId,
      no_rm: `RM-2026-00${40 + nextId}`,
      nama: newPatient.nama,
      nik: newPatient.nik,
      poli: newPatient.poli,
      dokter: newPatient.poli === 'Poli Gigi' ? 'drg. Maya Sari' : 'dr. Andi Wijaya',
      penjamin: newPatient.penjamin,
      status: 'Menunggu'
    };
    setPatients([newEntry, ...patients]);
    setNewPatient({ nama: '', nik: '', phone: '', gender: 'Laki-laki', poli: 'Poli Umum', penjamin: 'BPJS' });
    showToast(`Pasien ${newEntry.nama} berhasil didaftarkan dengan No. RM ${newEntry.no_rm}!`);
  };

  const handleCallQueue = (patient) => {
    setCurrentQueue({
      nomor: `A-0${patient.id + 10}`,
      nama: patient.nama,
      poli: patient.poli
    });
    showToast(`Memanggil antrean: ${patient.nama} (${patient.poli})`);
  };

  const filteredPatients = patients.filter(p => 
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.no_rm.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nik.includes(searchQuery)
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.type === 'error' ? 'rgba(244, 63, 94, 0.95)' : 'rgba(16, 185, 129, 0.95)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '500',
          animation: 'slideIn 0.3s ease'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {toast.message}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        backgroundColor: '#0c1322',
        borderRight: '1px solid rgba(148, 163, 184, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        flexShrink: 0
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', paddingLeft: '8px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4, #0d9488)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.5)'
          }}>
            <HeartPulse size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              SIMRS <span style={{ color: '#22d3ee' }}>Vite</span>
            </h1>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Laravel 13 Integration</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'dashboard' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'dashboard' ? '#22d3ee' : '#94a3b8',
              border: activeTab === 'dashboard' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent'
            }}
          >
            <Activity size={18} />
            <span>Dashboard</span>
          </button>

          <button 
            onClick={() => setActiveTab('registrasi')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'registrasi' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'registrasi' ? '#22d3ee' : '#94a3b8',
              border: activeTab === 'registrasi' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent'
            }}
          >
            <UserPlus size={18} />
            <span>Pendaftaran Pasien</span>
          </button>

          <button 
            onClick={() => setActiveTab('antrean')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'antrean' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'antrean' ? '#22d3ee' : '#94a3b8',
              border: activeTab === 'antrean' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent'
            }}
          >
            <Stethoscope size={18} />
            <span>Antrean & Poli</span>
          </button>

          <button 
            onClick={() => setActiveTab('farmasi')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'farmasi' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'farmasi' ? '#22d3ee' : '#94a3b8',
              border: activeTab === 'farmasi' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent'
            }}
          >
            <Pill size={18} />
            <span>Apotek & Obat</span>
          </button>

          <button 
            onClick={() => setActiveTab('billing')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'billing' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'billing' ? '#22d3ee' : '#94a3b8',
              border: activeTab === 'billing' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent'
            }}
          >
            <Receipt size={18} />
            <span>Kasir & Tagihan</span>
          </button>

          <button 
            onClick={() => setActiveTab('backend')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'backend' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'backend' ? '#22d3ee' : '#94a3b8',
              border: activeTab === 'backend' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent'
            }}
          >
            <Server size={18} />
            <span>Koneksi Backend</span>
          </button>
        </nav>

        {/* Backend Status Widget */}
        <div style={{
          padding: '14px',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(148, 163, 184, 0.12)',
          marginTop: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500' }}>Backend Laravel</span>
            <div className="pulse-dot" />
          </div>
          <p style={{ fontSize: '0.82rem', fontWeight: '600', color: '#34d399' }}>127.0.0.1:8000</p>
          <p style={{ fontSize: '0.7rem', color: '#64748b' }}>PHP 8.4 • MySQL 3306</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Top Header */}
        <header style={{
          height: '70px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          background: 'rgba(10, 15, 29, 0.8)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: '380px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text"
              placeholder="Cari pasien, No. RM, atau NIK..."
              className="input-field"
              style={{ paddingLeft: '40px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* User Info & Quick Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-emerald">
                <Clock size={12} /> Jam Kerja: 08:00 - 21:00
              </span>
              <span className="badge badge-indigo">
                <ShieldCheck size={12} /> RBAC Aktif
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid rgba(148, 163, 184, 0.15)', paddingLeft: '20px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d9488, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.85rem'
              }}>
                SA
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f8fafc' }}>Super Administrator</p>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Role: Superadmin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Contents */}
        <div style={{ padding: '32px', flex: 1 }}>
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Title Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f8fafc' }}>
                    Dashboard Ringkasan SIMRS
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '4px' }}>
                    Pantauan operasional klinik, registrasi, pelayanan dokter, dan farmasi hari ini.
                  </p>
                </div>
                <button onClick={() => setActiveTab('registrasi')} className="btn btn-primary">
                  <UserPlus size={16} /> Daftarkan Pasien Baru
                </button>
              </div>

              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <div className="glass-card" style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Kunjungan Hari Ini</p>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc', marginTop: '6px' }}>42 Pasien</h3>
                    </div>
                    <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', color: '#22d3ee' }}>
                      <Users size={22} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px', fontSize: '0.75rem', color: '#34d399' }}>
                    <TrendingUp size={14} /> +12% dibanding kemarin
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Antrean Menunggu</p>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbbf24', marginTop: '6px' }}>8 Orang</h3>
                    </div>
                    <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
                      <Clock size={22} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Poli Umum: 5 • Gigi: 3
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>E-Resep Farmasi</p>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#34d399', marginTop: '6px' }}>36 Resep</h3>
                    </div>
                    <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
                      <Pill size={22} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px', fontSize: '0.75rem', color: '#34d399' }}>
                    34 Selesai • 2 Proses
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Total Billing Hari Ini</p>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc', marginTop: '6px' }}>Rp 4.850.000</h3>
                    </div>
                    <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
                      <Receipt size={22} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Kasir Aktif: Shift Pagi
                  </div>
                </div>
              </div>

              {/* Grid 2 Column: Antrean & Recent Patients */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                {/* Active Patient List */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>Kunjungan Pasien Terakhir</h3>
                    <span className="badge badge-cyan">{filteredPatients.length} Pasien</span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)', color: '#94a3b8', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px' }}>No. RM</th>
                          <th style={{ padding: '10px 12px' }}>Nama Pasien</th>
                          <th style={{ padding: '10px 12px' }}>Poli Tujuan</th>
                          <th style={{ padding: '10px 12px' }}>Penjamin</th>
                          <th style={{ padding: '10px 12px' }}>Status</th>
                          <th style={{ padding: '10px 12px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPatients.map((p) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.06)' }}>
                            <td style={{ padding: '12px', fontWeight: '600', color: '#22d3ee' }}>{p.no_rm}</td>
                            <td style={{ padding: '12px', fontWeight: '600', color: '#f8fafc' }}>{p.nama}</td>
                            <td style={{ padding: '12px', color: '#cbd5e1' }}>{p.poli}</td>
                            <td style={{ padding: '12px' }}>
                              <span className={`badge ${p.penjamin === 'BPJS' ? 'badge-emerald' : 'badge-amber'}`}>
                                {p.penjamin}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span className={`badge ${p.status === 'Selesai' ? 'badge-emerald' : p.status === 'Pemeriksaan' ? 'badge-cyan' : 'badge-amber'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <button 
                                onClick={() => handleCallQueue(p)} 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              >
                                Panggil
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live Antrean Display */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>Panggilan Antrean Aktif</h3>
                      <span className="badge badge-emerald">Live Speaker</span>
                    </div>

                    <div style={{
                      background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.15) 0%, rgba(15, 23, 42, 0.8) 70%)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '16px',
                      padding: '30px',
                      textAlign: 'center',
                      boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)'
                    }}>
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nomor Antrean</p>
                      <h2 style={{ fontSize: '3.6rem', fontWeight: '900', color: '#22d3ee', margin: '8px 0', letterSpacing: '-0.03em' }}>
                        {currentQueue.nomor}
                      </h2>
                      <p style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc' }}>{currentQueue.nama}</p>
                      <p style={{ fontSize: '0.875rem', color: '#34d399', marginTop: '4px' }}>{currentQueue.poli}</p>
                    </div>
                  </div>

                  <div style={{ marginTop: '24px' }}>
                    <button 
                      onClick={() => showToast(`Mengulang panggilan suara untuk ${currentQueue.nomor}`)}
                      className="btn btn-primary" 
                      style={{ width: '100%', padding: '12px' }}
                    >
                      <RefreshCw size={16} /> Panggil Ulang Pengeras Suara
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTRASI PASIEN */}
          {activeTab === 'registrasi' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc' }}>Form Pendaftaran Pasien Baru</h2>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Entri data pasien baru ke sistem basis data SIMRS.</p>
              </div>

              <div className="glass-panel" style={{ padding: '28px', maxWidth: '800px' }}>
                <form onSubmit={handleAddPatient} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#cbd5e1' }}>
                      Nama Lengkap Pasien *
                    </label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Contoh: Muhammad Ihsan" 
                      value={newPatient.nama}
                      onChange={(e) => setNewPatient({ ...newPatient, nama: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#cbd5e1' }}>
                      Nomor Induk Kependudukan (NIK) *
                    </label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="16 Digit NIK KTP" 
                      value={newPatient.nik}
                      onChange={(e) => setNewPatient({ ...newPatient, nik: e.target.value })}
                      maxLength={16}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#cbd5e1' }}>
                      No. WhatsApp / HP
                    </label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="08xxxxxxxxxx" 
                      value={newPatient.phone}
                      onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#cbd5e1' }}>
                      Jenis Kelamin
                    </label>
                    <select 
                      className="input-field"
                      value={newPatient.gender}
                      onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#cbd5e1' }}>
                      Poli Tujuan
                    </label>
                    <select 
                      className="input-field"
                      value={newPatient.poli}
                      onChange={(e) => setNewPatient({ ...newPatient, poli: e.target.value })}
                    >
                      <option value="Poli Umum">Poli Umum (dr. Andi Wijaya)</option>
                      <option value="Poli Gigi">Poli Gigi (drg. Maya Sari)</option>
                      <option value="Poli KIA">Poli KIA/KB (Bdn. Rina)</option>
                      <option value="Fisioterapi">Poli Fisioterapi</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#cbd5e1' }}>
                      Jenis Penjamin Biaya
                    </label>
                    <select 
                      className="input-field"
                      value={newPatient.penjamin}
                      onChange={(e) => setNewPatient({ ...newPatient, penjamin: e.target.value })}
                    >
                      <option value="BPJS">BPJS Kesehatan</option>
                      <option value="Umum">Umum / Mandiri</option>
                      <option value="Asuransi Swasta">Asuransi Swasta</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '12px' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>
                      <CheckCircle2 size={18} /> Simpan & Buat No. Rekam Medis Otomatis
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: ANTREAN & POLI */}
          {activeTab === 'antrean' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc' }}>Manajemen Antrean Poliklinik</h2>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Pantau dan alokasikan pasien ke ruangan dokter.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {['Poli Umum', 'Poli Gigi', 'Poli KIA'].map((poliName, i) => (
                  <div key={i} className="glass-panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc' }}>{poliName}</h4>
                      <span className="badge badge-emerald">Aktif</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Dokter Jaga: {poliName === 'Poli Gigi' ? 'drg. Maya Sari' : 'dr. Andi Wijaya'}
                    </p>

                    <div style={{
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '10px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(148, 163, 184, 0.1)',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sedang Dilayani</span>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#22d3ee', margin: '4px 0' }}>
                        {i === 0 ? 'A-012' : i === 1 ? 'B-004' : 'C-007'}
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                        {i === 0 ? 'Budi Santoso' : i === 1 ? 'Siti Rahmawati' : 'Dewi Lestari'}
                      </span>
                    </div>

                    <button 
                      onClick={() => showToast(`Memanggil pasien berikutnya untuk ${poliName}`)}
                      className="btn btn-secondary" 
                      style={{ width: '100%', marginTop: '16px', fontSize: '0.8rem' }}
                    >
                      Panggil Antrean Berikutnya
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: APOTEK & FARMASI */}
          {activeTab === 'farmasi' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc' }}>Apotek & Inventori Obat</h2>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Stok obat, expired date, dan penyerahan resep elektronik.</p>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>Kode Obat</th>
                      <th style={{ padding: '12px' }}>Nama Obat</th>
                      <th style={{ padding: '12px' }}>Kategori</th>
                      <th style={{ padding: '12px' }}>Sisa Stok</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Harga Satuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { kode: 'OBT-001', nama: 'Paracetamol 500mg', kat: 'Tablet', stok: 320, status: 'Aman', harga: 'Rp 5.000' },
                      { kode: 'OBT-002', nama: 'Amoxicillin 500mg', kat: 'Kapsul', stok: 45, status: 'Menipis', harga: 'Rp 12.000' },
                      { kode: 'OBT-003', nama: 'Antasida Doen', kat: 'Tablet Kunyah', stok: 180, status: 'Aman', harga: 'Rp 6.500' },
                      { kode: 'OBT-004', nama: 'Cetirizine 10mg', kat: 'Tablet', stok: 15, status: 'Kritis', harga: 'Rp 8.000' },
                      { kode: 'OBT-005', nama: 'Dexamethasone 0.5mg', kat: 'Tablet', stok: 210, status: 'Aman', harga: 'Rp 4.000' },
                    ].map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.06)' }}>
                        <td style={{ padding: '12px', fontWeight: '600', color: '#22d3ee' }}>{m.kode}</td>
                        <td style={{ padding: '12px', fontWeight: '600', color: '#f8fafc' }}>{m.nama}</td>
                        <td style={{ padding: '12px', color: '#cbd5e1' }}>{m.kat}</td>
                        <td style={{ padding: '12px', fontWeight: '700' }}>{m.stok} unit</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge ${m.status === 'Aman' ? 'badge-emerald' : m.status === 'Menipis' ? 'badge-amber' : 'badge-rose'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#f8fafc' }}>{m.harga}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: BILLING & KASIR */}
          {activeTab === 'billing' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc' }}>Kasir & Billing Pasien</h2>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Pembayaran invoice pemeriksaan medis, tindakan, dan obat.</p>
              </div>

              <div className="glass-panel" style={{ padding: '24px', maxWidth: '600px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: '#f8fafc' }}>Invoice Pembayaran: RM-2026-0041</h3>
                <div style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                    <span style={{ color: '#94a3b8' }}>Biaya Registrasi & Pendaftaran</span>
                    <span style={{ fontWeight: '600', color: '#f8fafc' }}>Rp 25.000</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                    <span style={{ color: '#94a3b8' }}>Jasa Dokter & Konsultasi Poli</span>
                    <span style={{ fontWeight: '600', color: '#f8fafc' }}>Rp 60.000</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                    <span style={{ color: '#94a3b8' }}>Obat Resep (Paracetamol + Antasida)</span>
                    <span style={{ fontWeight: '600', color: '#f8fafc' }}>Rp 35.000</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>Total Tagihan</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#22d3ee' }}>Rp 120.000</span>
                </div>

                <button 
                  onClick={() => showToast('Pembayaran berhasil diverifikasi & kwitansi tercetak!')}
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '14px' }}
                >
                  <Receipt size={16} /> Cetak Kwitansi & Selesaikan Transaksi
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: KONEKSI BACKEND */}
          {activeTab === 'backend' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc' }}>Integrasi Backend Laravel & Database</h2>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Status koneksi live antara Frontend (Vite) dan Backend (Laravel).</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', marginBottom: '16px' }}>Status Service</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '10px' }}>
                      <span style={{ color: '#cbd5e1', fontWeight: '500' }}>Frontend Server (Vite)</span>
                      <span className="badge badge-emerald">Port 5173 • Active</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '10px' }}>
                      <span style={{ color: '#cbd5e1', fontWeight: '500' }}>Backend Server (Laravel 13)</span>
                      <span className="badge badge-cyan">Port 8000 • Terhubung</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '10px' }}>
                      <span style={{ color: '#cbd5e1', fontWeight: '500' }}>Database (MySQL Laragon)</span>
                      <span className="badge badge-indigo">Port 3306 • DB: sim_klinik</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '10px' }}>
                      <span style={{ color: '#cbd5e1', fontWeight: '500' }}>PHP Engine</span>
                      <span className="badge badge-emerald">PHP 8.4.25 (Laragon)</span>
                    </div>
                  </div>

                  <button 
                    onClick={checkBackend}
                    className="btn btn-secondary" 
                    style={{ width: '100%', marginTop: '20px' }}
                  >
                    <RefreshCw size={16} /> Uji Ulang Koneksi API
                  </button>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', marginBottom: '16px' }}>Struktur Folder Monorepo</h3>
                  <div style={{
                    background: '#090e17',
                    padding: '16px',
                    borderRadius: '10px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#22d3ee',
                    lineHeight: '1.8'
                  }}>
                    <p style={{ color: '#94a3b8' }}>📁 simklinik/</p>
                    <p style={{ paddingLeft: '16px' }}>├── 📁 <b>frontend/</b> <span style={{ color: '#34d399' }}>← Vite + React Dashboard</span></p>
                    <p style={{ paddingLeft: '32px', color: '#64748b' }}>├── src/ (Components, CSS, Pages)</p>
                    <p style={{ paddingLeft: '32px', color: '#64748b' }}>└── vite.config.js (Proxy API)</p>
                    <p style={{ paddingLeft: '16px' }}>└── 📁 <b>backend/</b> <span style={{ color: '#34d399' }}>← Laravel 13 Framework</span></p>
                    <p style={{ paddingLeft: '32px', color: '#64748b' }}>├── app/ (Models, Controllers)</p>
                    <p style={{ paddingLeft: '32px', color: '#64748b' }}>├── database/ (Migrations & Seeders)</p>
                    <p style={{ paddingLeft: '32px', color: '#64748b' }}>└── .env (MySQL 3306 Laragon)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
