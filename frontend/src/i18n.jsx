import React, { createContext, useContext, useState, useEffect } from 'react';

export const TRANSLATIONS = {
  id: {
    app: {
      name: 'SIM RS',
      clinic_name: 'PT Rumah Sakit',
      language: 'Bahasa',
      lang_id: 'Indonesia',
      lang_en: 'English',
      search_menu: 'Cari menu...',
      toggle_menu: 'Menu',
      close_menu: 'Tutup Menu',
      my_profile: 'Profil Saya',
      logout: 'Keluar',
      logout_confirm: 'Keluar dari aplikasi?',
      copyright: 'Sistem Informasi Manajemen Klinik',
      account_menu: 'Menu akun',
    },
    menu: {
      groups: {
        rekam_medis: 'REKAM MEDIS',
        operasional: 'OPERASIONAL',
        keuangan: 'KEUANGAN',
        data_stok: 'DATA & STOK',
        lainnya: 'LAINNYA',
        pengaturan: 'PENGATURAN',
      },
      dashboard: 'Dashboard',
      rekam_medis: 'Rekam Medis',
      new_registration: 'Registrasi',
      patient_data: 'Data Pasien',
      visit_list: 'Data Registrasi',
      billing: 'Billing',
      finance: 'Keuangan',
      master_data: 'Master Data',
      services_tariff: 'Layanan & Tarif',
      staff_poli: 'SDM & Poli',
      pharmacy: 'Medicine',
      insurance_bank: 'Penjamin & Bank',
      patients: 'Pasien',
      cancel_codes: 'Kode Pembatalan',
      inventory: 'Inventory',
      reports: 'Laporan',
      operational: 'Operasional',
      financial: 'Keuangan',
      support: 'Penunjang',
      clinic_profile: 'Profil Rumah Sakit',
      users_roles: 'Pengguna & Role',
    },
    datatable: {
      search: 'Cari:',
      search_placeholder: 'ketik untuk mencari...',
      sort: 'Urutkan',
      show: 'Tampilkan',
      length: 'data',
      empty: 'Belum ada data',
      first: 'Awal',
      previous: 'Sebelumnya',
      next: 'Berikutnya',
      last: 'Akhir',
      info_showing: 'Menampilkan',
      info_to: '–',
      info_of: 'dari',
      info_filtered: '(disaring dari :max total data)',
      no_matching: 'Tidak ditemukan data yang sesuai',
    },
    dashboard: {
      patient_data: 'Data Pasien',
      view_all: 'Lihat Semua',
      new_patient: 'Pasien Baru',
      loading: 'Memuat data...',
      empty: 'Belum ada data pasien.',
      error_load: 'Gagal memuat data pasien.',
      today_patients: 'Pasien Hari Ini',
      active_queue: 'Antrean Aktif',
      today_revenue: 'Pendapatan Hari Ini',
      total_registered: 'Total Pasien Terdaftar',
      low_stock_warning: 'Peringatan Stok Obat',
    },
    profile: {
      title: 'Profil Saya',
      subtitle: 'Kelola informasi profil dan kredensial login Anda',
      change_photo: 'Ganti foto',
      joined: 'Bergabung',
      account_info: 'Informasi Akun',
      account_info_sub: 'Kelola data identitas dan kontak',
      fullname: 'Nama Lengkap',
      username: 'Username',
      email: 'Email',
      phone: 'Nomor Telepon',
      save_changes: 'Simpan Perubahan',
      saving: 'Menyimpan...',
      saved_success: 'Perubahan profil berhasil disimpan.',
      security: 'Keamanan',
      security_sub: 'Ganti password akun',
      curr_password: 'Password Saat Ini',
      new_password: 'Password Baru',
      confirm_password: 'Konfirmasi Password',
      change_password_btn: 'Ganti Password',
      password_success: 'Password berhasil diubah.',
      min_password_len: 'Min. 6 karakter',
      quick_access: 'Akses Cepat',
      dash_summary: 'Ringkasan operasional klinik',
      users_summary: 'Kelola akun & hak akses sistem',
      clinic_summary: 'Identitas & informasi klinik',
      logout_summary: 'Keluar dari akun ini',
    },
    common: {
      action: 'Aksi',
      save: 'Simpan',
      save_changes: 'Simpan Perubahan',
      cancel: 'Batal',
      delete: 'Hapus',
      edit: 'Edit',
      view: 'Lihat',
      view_detail: 'Lihat Detail',
      detail: 'Detail',
      close: 'Tutup',
      back: 'Kembali',
      print: 'Cetak',
      export_csv: 'Ekspor CSV',
      filter: 'Filter',
      reset: 'Reset',
      all: 'Semua',
      active: 'Aktif',
      inactive: 'Tidak Aktif',
      status: 'Status',
      date: 'Tanggal',
      queue_no: 'No. Antrean',
      visit_no: 'No. Registrasi',
      mr_no: 'NO. MR',
      name: 'NAMA',
      gender: 'L/P',
      birth_date: 'TGL LAHIR',
      phone: 'TELEPON',
      group: 'KELOMPOK',
      notes: 'Catatan',
      loading_data: 'Memuat data...',
      confirm_delete: 'Apakah Anda yakin ingin menghapus data ini?',
      confirm_action: 'Apakah Anda yakin?',
      yes: 'Ya',
      no: 'Tidak',
      male: 'Laki-laki',
      female: 'Perempuan',
      doctor: 'Dokter',
      poli: 'Poli',
      patient: 'Pasien',
      total: 'Total',
      payment: 'Pembayaran',
      paid: 'Lunas',
      unpaid: 'Belum Bayar',
      search: 'Cari',
      add: 'Tambah',
      years: 'tahun',
    },
    login: {
      title: 'Masuk',
      subtitle: 'Silakan masuk ke akun Anda',
      username: 'Username',
      password: 'Password',
      submit: 'Masuk ke Sistem',
      logging_in: 'Memverifikasi...',
      badge: 'Sistem Informasi Manajemen Klinik',
      headline: 'Pelayanan Klinik<br>Cepat, Aman &amp;<br>Terintegrasi',
      description: 'SIM RS menghadirkan sistem tata kelola rumah sakit terpadu untuk registrasi pasien, pemeriksaan medis, farmasi, hingga pembayaran secara cepat, akurat, dan profesional.',
      secure_badge: 'Akses Keamanan Aktif',
      welcome: 'Selamat Datang',
      welcome_sub: 'Silakan masuk untuk mengakses SIM RS<br>secara aman dan profesional.',
      username_placeholder: 'Masukkan username',
      password_placeholder: 'Masukkan kata sandi',
      show_hide_pwd: 'Lihat/sembunyikan password',
      managed_by: 'Dikelola oleh PT Rumah Sakit',
      err_empty: 'Username dan password wajib diisi.',
      err_failed: 'Username atau password salah.',
    },
    kunjungan: {
      title: 'Registrasi Pasien',
      sub: ':date · :count kunjungan',
      new_reg: 'Registrasi Baru',
      queue: 'ANTREAN',
      visit_no: 'NO. KUNJUNGAN',
      mr_no: 'NO. MR',
      patient: 'PASIEN',
      reg_type: 'JENIS REGISTRASI',
      poli: 'POLI',
      doctor: 'DOKTER',
      insurance: 'PENJAMIN',
      status: 'STATUS',
      action: 'AKSI',
      view_detail: 'Lihat Detail',
      cancel_visit: 'Batalkan Kunjungan',
      loading: 'Memuat data kunjungan...',
      empty: 'Belum ada data kunjungan pada tanggal ini.',
      all: 'Semua',
      inpatient: 'Rawat Inap (Inpatient)',
      outpatient: 'Rawat Jalan (Outpatient)',
      detail_title: 'Detail Kunjungan',
      cancel_title: 'Batalkan Kunjungan',
      cancel_reason: 'Alasan Pembatalan',
      cancel_notes: 'Keterangan Tambahan',
      cancel_confirm: 'Konfirmasi Pembatalan',
      cancelling: 'Membatalkan...',
    },
    registrasi_daftar: {
      title: 'Registrasi Kunjungan',
      sub: 'Daftarkan kunjungan pasien ke poliklinik atau rawat inap',
      select_patient: 'Pilih Pasien',
      change_patient: 'Ganti Pasien',
      search_patient_ph: 'Ketik nama / No. MR / NIK / Telepon...',
      selected_patient_badge: 'Pasien Terpilih',
      visit_details: 'Detail Kunjungan',
      reg_type: 'Jenis Registrasi',
      outpatient: 'Rawat Jalan',
      inpatient: 'Rawat Inap',
      poli_destination: 'Poliklinik Tujuan',
      select_poli: '-- Pilih Poli --',
      doctor: 'Dokter Pemeriksa',
      select_doctor: '-- Pilih Dokter --',
      insurance_type: 'Jenis Penjamin',
      insurance_no: 'No. Kartu / Asuransi',
      complaint: 'Keluhan Utama',
      complaint_ph: 'Tuliskan keluhan atau alasan kunjungan pasien...',
      submit_btn: 'Daftarkan Kunjungan & Buat Antrean',
      submitting: 'Mendaftarkan...',
      success_msg: 'Kunjungan berhasil didaftarkan!',
      queue_assigned: 'Nomor Antrean Anda:',
      print_queue: 'Cetak Karcis Antrean',
      back_to_visits: 'Ke Daftar Registrasi',
      register_another: 'Daftarkan Pasien Lain',
    },
    pelayanan: {
      title: 'Pelayanan Pasien',
      sub: 'Pemeriksaan medis, diagnosis, tindakan, dan peresepan obat',
      patient_info: 'Data Pasien & Kunjungan',
      vital_signs: 'Tanda-Tanda Vital & Anamnesis',
      systolic: 'Tekanan Darah (Sistolik)',
      diastolic: 'Tekanan Darah (Diastolik)',
      pulse: 'Denyut Nadi (bpm)',
      temp: 'Suhu Tubuh (°C)',
      resp: 'Pernapasan (x/menit)',
      weight: 'Berat Badan (kg)',
      height: 'Tinggi Badan (cm)',
      chief_complaint: 'Keluhan Utama',
      physical_exam: 'Pemeriksaan Fisik',
      diagnosis: 'Diagnosis Medis (ICD-10)',
      search_diagnosis: 'Cari diagnosis / kode ICD-10...',
      primary_diag: 'Diagnosis Primer',
      secondary_diag: 'Diagnosis Sekunder',
      actions_therapy: 'Tindakan Medis & Terapi',
      search_action: 'Pilih tindakan...',
      prescriptions: 'Resep Obat',
      search_medicine: 'Cari obat dari stok...',
      dosage: 'Dosis / Signa',
      qty: 'Jumlah',
      save_examination: 'Simpan Hasil Pemeriksaan',
      saving: 'Menyimpan pemeriksaan...',
      exam_saved: 'Pemeriksaan medis berhasil disimpan!',
      finish_consultation: 'Selesai & Teruskan ke Farmasi / Billing',
    },
    rekam_medis: {
      title: 'Rekam Medis Pasien',
      sub: 'Riwayat medis lengkap, hasil konsultasi, dan catatan perawatan',
      search_patient: 'Cari Pasien (Nama/MR)...',
      patient_history: 'Riwayat Kunjungan Pasien',
      no_records: 'Belum ada rekam medis tersimpan.',
      visit_date: 'Tanggal Kunjungan',
      exam_summary: 'Ringkasan Pemeriksaan',
      doctor_notes: 'Catatan Dokter',
      medicines_prescribed: 'Obat yang Diberikan',
      actions_performed: 'Tindakan yang Dilakukan',
    },
    farmasi: {
      title: 'Farmasi & Inventori',
      sub: 'Manajemen stok obat, resep keluar, dan penerimaan perbekalan',
      subtitle: 'Manajemen persediaan obat, pembelian, dan penyesuaian stok',
      tab_stock: 'Stok Obat',
      tab_purchase: 'Pembelian & Penerimaan',
      tab_adjust: 'Penyesuaian Stok / Opname',
      tab_card: 'Kartu Stok',
      medicine_name: 'Nama Obat',
      category: 'Kategori',
      unit: 'Satuan',
      stock_qty: 'Stok',
      buy_price: 'Harga Beli',
      sell_price: 'Harga Jual',
      expiry: 'Kadaluwarsa',
      add_medicine: 'Tambah Obat Baru',
      adjust_stock: 'Penyesuaian Stok',
      dispense_rx: 'Siapkan Resep',
      penyesuaian_btn: 'Penyesuaian Stok',
      pembelian_btn: 'Pembelian Obat',
      total_obat: 'Total Obat',
      stok_menipis: 'Stok Menipis',
      nilai_stok: 'Estimasi Nilai Stok',
      exp_soon: 'Segera Kedaluwarsa',
      daftar_stok: 'Daftar Stok Obat',
      kode: 'KODE',
      nama_obat: 'NAMA OBAT',
      kategori: 'KATEGORI',
      stok: 'STOK',
      stok_min: 'MIN',
      harga_beli: 'HARGA BELI',
      harga_jual: 'HARGA JUAL',
      status: 'STATUS',
      menipis: 'Menipis',
      aman: 'Aman',
      aksi: 'AKSI',
      kartu_stok: 'Kartu Stok',
      antrean_title: 'Antrean Resep Farmasi',
      serahkan_btn: 'Serahkan Obat',
      modal_title: 'Rincian & Penyerahan Resep',
      warning_stok: 'Peringatan Stok Kurang',
      cetak_etiket: 'Cetak Etiket',
      serahkan_selesai: 'Serahkan Obat & Selesai',
    },
    billing: {
      title: 'Billing & Keuangan',
      sub: 'Pengelolaan tagihan pasien, pembayaran, dan pencatatan kas',
      tab_billing: 'Daftar Tagihan (Billing)',
      tab_keuangan: 'Kasir & Pembayaran',
      invoice_no: 'No. Invoice',
      total_bill: 'Total Tagihan',
      paid_amount: 'Jumlah Dibayar',
      remaining: 'Sisa Tagihan',
      payment_method: 'Metode Pembayaran',
      process_payment: 'Proses Pembayaran',
      print_receipt: 'Cetak Struk',
      print_invoice: 'Cetak Invoice',
      paid_full: 'LUNAS',
      unpaid_status: 'BELUM LUNAS',
    },
    master: {
      title: 'Master Data',
      sub: 'Kelola data referensi, tarif, poliklinik, dan penjamin',
      services_tariff: 'Layanan & Tarif',
      staff_poli: 'SDM & Poliklinik',
      pharmacy: 'Obat & Farmasi',
      insurance_bank: 'Penjamin & Bank',
      patients: 'Data Referensi Pasien',
      cancel_codes: 'Kode Pembatalan',
      add_data: 'Tambah Data',
      edit_data: 'Ubah Data',
      delete_data: 'Hapus Data',
    },
    laporan: {
      title: 'Laporan Operasional & Keuangan',
      sub: 'Statistik kunjungan, rekapitulasi pendapatan, dan analisis layanan',
      tab_ops: 'Operasional',
      tab_finance: 'Keuangan',
      tab_support: 'Penunjang',
      filter_period: 'Periode Laporan',
      export_excel: 'Ekspor Excel / CSV',
      print_report: 'Cetak Laporan',
    },
    profil_klinik: {
      title: 'Profil Klinik',
      sub: 'Informasi identitas klinik dan konfigurasi operasional',
      clinic_name: 'Nama Klinik',
      legal_entity: 'Badan Hukum / Perusahaan',
      license_no: 'Nomor Izin Operasional',
      phone: 'Nomor Telepon',
      email: 'Alamat Email',
      address: 'Alamat Lengkap',
      save_profile: 'Simpan Profil',
      profile_updated: 'Profil klinik berhasil diperbarui.',
    },
    pengguna: {
      title: 'Pengguna & Hak Akses',
      sub: 'Kelola akun staf, peran akses, dan status pengguna',
      add_user: 'Tambah Pengguna Baru',
      fullname: 'Nama Lengkap',
      username: 'Username',
      role: 'Peran / Role',
      status: 'Status Akun',
      reset_password: 'Reset Password',
      edit_user: 'Edit Pengguna',
    }
  },
  en: {
    app: {
      name: 'SIM RS',
      clinic_name: 'PT Rumah Sakit',
      language: 'Language',
      lang_id: 'Indonesia',
      lang_en: 'English',
      search_menu: 'Search menu...',
      toggle_menu: 'Menu',
      close_menu: 'Close Menu',
      my_profile: 'My Profile',
      logout: 'Logout',
      logout_confirm: 'Leave the application?',
      copyright: 'Clinic Management Information System',
      account_menu: 'Account menu',
    },
    menu: {
      groups: {
        rekam_medis: 'MEDICAL RECORDS',
        operasional: 'OPERATIONS',
        keuangan: 'FINANCE',
        data_stok: 'DATA & STOCK',
        lainnya: 'OTHERS',
        pengaturan: 'SETTINGS',
      },
      dashboard: 'Dashboard',
      rekam_medis: 'Medical Records',
      new_registration: 'Registration',
      patient_data: 'Patient Data',
      visit_list: 'Registration Data',
      billing: 'Billing',
      finance: 'Finance',
      master_data: 'Master Data',
      services_tariff: 'Services & Tariffs',
      staff_poli: 'Staff & Clinics',
      pharmacy: 'Medicine',
      insurance_bank: 'Insurance & Bank',
      patients: 'Patients',
      cancel_codes: 'Cancellation Codes',
      inventory: 'Inventory',
      reports: 'Reports',
      operational: 'Operational',
      financial: 'Financial',
      support: 'Support',
      clinic_profile: 'Hospital Profile',
      users_roles: 'Users & Roles',
    },
    datatable: {
      search: 'Search:',
      search_placeholder: 'type to search...',
      sort: 'Sort',
      show: 'Show',
      length: 'entries',
      empty: 'No data available',
      first: 'First',
      previous: 'Previous',
      next: 'Next',
      last: 'Last',
      info_showing: 'Showing',
      info_to: 'to',
      info_of: 'of',
      info_filtered: '(filtered from :max total entries)',
      no_matching: 'No matching records found',
    },
    dashboard: {
      patient_data: 'Patient Data',
      view_all: 'View All',
      new_patient: 'New Patient',
      loading: 'Loading data...',
      empty: 'No patient data available.',
      error_load: 'Failed to load patient data.',
      today_patients: 'Patients Today',
      active_queue: 'Active Queue',
      today_revenue: 'Today\'s Revenue',
      total_registered: 'Total Registered Patients',
      low_stock_warning: 'Low Stock Medicines',
    },
    profile: {
      title: 'My Profile',
      subtitle: 'Manage your profile information and login credentials',
      change_photo: 'Change photo',
      joined: 'Joined',
      account_info: 'Account Information',
      account_info_sub: 'Manage identity and contact information',
      fullname: 'Full Name',
      username: 'Username',
      email: 'Email',
      phone: 'Phone Number',
      save_changes: 'Save Changes',
      saving: 'Saving...',
      saved_success: 'Profile changes saved successfully.',
      security: 'Security',
      security_sub: 'Change account password',
      curr_password: 'Current Password',
      new_password: 'New Password',
      confirm_password: 'Confirm Password',
      change_password_btn: 'Change Password',
      password_success: 'Password changed successfully.',
      min_password_len: 'Min. 6 characters',
      quick_access: 'Quick Access',
      dash_summary: 'Clinic operational summary',
      users_summary: 'Manage accounts & system access rights',
      clinic_summary: 'Clinic identity & information',
      logout_summary: 'Sign out of this account',
    },
    common: {
      action: 'Action',
      save: 'Save',
      save_changes: 'Save Changes',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      view_detail: 'View Detail',
      detail: 'Detail',
      close: 'Close',
      back: 'Back',
      print: 'Print',
      export_csv: 'Export CSV',
      filter: 'Filter',
      reset: 'Reset',
      all: 'All',
      active: 'Active',
      inactive: 'Inactive',
      status: 'Status',
      date: 'Date',
      queue_no: 'Queue No.',
      visit_no: 'Registration No.',
      mr_no: 'MR NO.',
      name: 'NAME',
      gender: 'GENDER',
      birth_date: 'BIRTH DATE',
      phone: 'PHONE',
      group: 'GROUP',
      notes: 'Notes',
      loading_data: 'Loading data...',
      confirm_delete: 'Are you sure you want to delete this record?',
      confirm_action: 'Are you sure?',
      yes: 'Yes',
      no: 'No',
      male: 'Male',
      female: 'Female',
      doctor: 'Doctor',
      poli: 'Clinic',
      patient: 'Patient',
      total: 'Total',
      payment: 'Payment',
      paid: 'Paid',
      unpaid: 'Unpaid',
      search: 'Search',
      add: 'Add',
      years: 'years',
    },
    login: {
      title: 'Sign In',
      subtitle: 'Please sign in to your account',
      username: 'Username',
      password: 'Password',
      submit: 'Sign In to System',
      logging_in: 'Verifying...',
      badge: 'Clinic Management Information System',
      headline: 'Fast, Secure &amp;<br>Integrated Clinic<br>Services',
      description: 'SIM RS delivers an integrated hospital management system for patient registration, examinations, pharmacy, and payments — fast, accurate, and professional.',
      secure_badge: 'Secure Access Active',
      welcome: 'Welcome',
      welcome_sub: 'Please sign in to access SIM RS<br>securely and professionally.',
      username_placeholder: 'Enter username',
      password_placeholder: 'Enter password',
      show_hide_pwd: 'Show/hide password',
      managed_by: 'Managed by PT Rumah Sakit',
      err_empty: 'Username and password are required.',
      err_failed: 'Invalid username or password.',
    },
    kunjungan: {
      title: 'Patient Registration',
      sub: ':date · :count visits',
      new_reg: 'New Registration',
      queue: 'QUEUE',
      visit_no: 'VISIT NO.',
      mr_no: 'MR NO.',
      patient: 'PATIENT',
      reg_type: 'REGISTRATION TYPE',
      poli: 'CLINIC',
      doctor: 'DOCTOR',
      insurance: 'INSURANCE',
      status: 'STATUS',
      action: 'ACTION',
      view_detail: 'View Detail',
      cancel_visit: 'Cancel Visit',
      loading: 'Loading visit data...',
      empty: 'No visits registered on this date.',
      all: 'All',
      inpatient: 'Rawat Inap (Inpatient)',
      outpatient: 'Rawat Jalan (Outpatient)',
      detail_title: 'Visit Detail',
      cancel_title: 'Cancel Visit',
      cancel_reason: 'Cancellation Reason',
      cancel_notes: 'Additional Notes',
      cancel_confirm: 'Confirm Cancellation',
      cancelling: 'Cancelling...',
    },
    registrasi_daftar: {
      title: 'Visit Registration',
      sub: 'Register patient visits for clinic consultations or inpatient care',
      select_patient: 'Select Patient',
      change_patient: 'Change Patient',
      search_patient_ph: 'Type name / MR No. / ID / Phone...',
      selected_patient_badge: 'Selected Patient',
      visit_details: 'Visit Details',
      reg_type: 'Registration Type',
      outpatient: 'Outpatient',
      inpatient: 'Inpatient',
      poli_destination: 'Target Clinic / Poli',
      select_poli: '-- Select Clinic --',
      doctor: 'Attending Doctor',
      select_doctor: '-- Select Doctor --',
      insurance_type: 'Insurance Type',
      insurance_no: 'Card / Insurance No.',
      complaint: 'Chief Complaint',
      complaint_ph: 'Write chief complaints or reason for visit...',
      submit_btn: 'Register Visit & Create Queue',
      submitting: 'Registering...',
      success_msg: 'Visit registered successfully!',
      queue_assigned: 'Your Queue Number:',
      print_queue: 'Print Queue Ticket',
      back_to_visits: 'Back to Visit List',
      register_another: 'Register Another Patient',
    },
    pelayanan: {
      title: 'Patient Care & Consultation',
      sub: 'Medical examination, diagnosis, procedures, and prescriptions',
      patient_info: 'Patient & Visit Details',
      vital_signs: 'Vital Signs & History',
      systolic: 'Blood Pressure (Systolic)',
      diastolic: 'Blood Pressure (Diastolic)',
      pulse: 'Pulse (bpm)',
      temp: 'Body Temperature (°C)',
      resp: 'Respiration (x/min)',
      weight: 'Weight (kg)',
      height: 'Height (cm)',
      chief_complaint: 'Chief Complaint',
      physical_exam: 'Physical Examination',
      diagnosis: 'Medical Diagnosis (ICD-10)',
      search_diagnosis: 'Search diagnosis / ICD-10 code...',
      primary_diag: 'Primary Diagnosis',
      secondary_diag: 'Secondary Diagnosis',
      actions_therapy: 'Procedures & Therapy',
      search_action: 'Select procedure...',
      prescriptions: 'Prescriptions',
      search_medicine: 'Search medicine from stock...',
      dosage: 'Dosage / Directions',
      qty: 'Quantity',
      save_examination: 'Save Examination Results',
      saving: 'Saving examination...',
      exam_saved: 'Medical examination saved successfully!',
      finish_consultation: 'Complete & Forward to Pharmacy / Billing',
    },
    rekam_medis: {
      title: 'Patient Medical Records',
      sub: 'Comprehensive clinical history, consultation results, and care notes',
      search_patient: 'Search Patient (Name/MR)...',
      patient_history: 'Patient Visit History',
      no_records: 'No medical records available.',
      visit_date: 'Visit Date',
      exam_summary: 'Examination Summary',
      doctor_notes: 'Doctor Notes',
      medicines_prescribed: 'Prescribed Medicines',
      actions_performed: 'Procedures Performed',
    },
    farmasi: {
      title: 'Pharmacy & Inventory',
      sub: 'Manage medicine stock, prescriptions, and received supplies',
      subtitle: 'Manage medicine inventory, purchases, and stock adjustments',
      tab_stock: 'Medicine Stock',
      tab_purchase: 'Purchases & Receiving',
      tab_adjust: 'Stock Adjustment / Opname',
      tab_card: 'Stock Card',
      medicine_name: 'Medicine Name',
      category: 'Category',
      unit: 'Unit',
      stock_qty: 'Stock',
      buy_price: 'Buy Price',
      sell_price: 'Sell Price',
      expiry: 'Expiry Date',
      add_medicine: 'Add New Medicine',
      adjust_stock: 'Adjust Stock',
      dispense_rx: 'Dispense Prescription',
      penyesuaian_btn: 'Stock Adjustment',
      pembelian_btn: 'Medicine Purchases',
      total_obat: 'Total Medicines',
      stok_menipis: 'Low Stock',
      nilai_stok: 'Estimated Stock Value',
      exp_soon: 'Expiring Soon',
      daftar_stok: 'Medicine Stock List',
      kode: 'CODE',
      nama_obat: 'MEDICINE NAME',
      kategori: 'CATEGORY',
      stok: 'STOCK',
      stok_min: 'MIN',
      harga_beli: 'BUY PRICE',
      harga_jual: 'SELL PRICE',
      status: 'STATUS',
      menipis: 'Low Stock',
      aman: 'In Stock',
      aksi: 'ACTION',
      kartu_stok: 'Stock Card',
      antrean_title: 'Pharmacy Prescription Queue',
      serahkan_btn: 'Dispense Medication',
      modal_title: 'Prescription Details & Dispensing',
      warning_stok: 'Insufficient Stock Warning',
      cetak_etiket: 'Print Label',
      serahkan_selesai: 'Dispense Medication & Finish',
    },
    billing: {
      title: 'Billing & Finance',
      sub: 'Manage patient invoices, payments, and cashier transactions',
      tab_billing: 'Billing List',
      tab_keuangan: 'Cashier & Payments',
      invoice_no: 'Invoice No.',
      total_bill: 'Total Bill',
      paid_amount: 'Amount Paid',
      remaining: 'Remaining Bill',
      payment_method: 'Payment Method',
      process_payment: 'Process Payment',
      print_receipt: 'Print Receipt',
      print_invoice: 'Print Invoice',
      paid_full: 'PAID IN FULL',
      unpaid_status: 'UNPAID',
    },
    master: {
      title: 'Master Data',
      sub: 'Manage reference codes, tariffs, clinics, and insurance',
      services_tariff: 'Services & Tariffs',
      staff_poli: 'Staff & Clinics',
      pharmacy: 'Medicines & Pharmacy',
      insurance_bank: 'Insurance & Bank',
      patients: 'Patient Reference Data',
      cancel_codes: 'Cancellation Codes',
      add_data: 'Add Data',
      edit_data: 'Edit Data',
      delete_data: 'Delete Data',
    },
    laporan: {
      title: 'Operational & Financial Reports',
      sub: 'Visit statistics, revenue recap, and service analytics',
      tab_ops: 'Operations',
      tab_finance: 'Finance',
      tab_support: 'Support',
      filter_period: 'Report Period',
      export_excel: 'Export Excel / CSV',
      print_report: 'Print Report',
    },
    profil_klinik: {
      title: 'Clinic Profile',
      sub: 'Clinic identity information and operational configuration',
      clinic_name: 'Clinic Name',
      legal_entity: 'Legal Entity / Corporation',
      license_no: 'Operating License No.',
      phone: 'Phone Number',
      email: 'Email Address',
      address: 'Full Address',
      save_profile: 'Save Profile',
      profile_updated: 'Clinic profile updated successfully.',
    },
    pengguna: {
      title: 'Users & Roles',
      sub: 'Manage staff accounts, permission roles, and account status',
      add_user: 'Add New User',
      fullname: 'Full Name',
      username: 'Username',
      role: 'Role',
      status: 'Account Status',
      reset_password: 'Reset Password',
      edit_user: 'Edit User',
    }
  }
};

export const I18nContext = createContext({
  locale: 'id',
  setLocale: () => {},
  t: (key, params) => key,
  isEn: false,
  trans: (idText, enText) => idText,
  formatTgl: (dateStr) => dateStr,
  formatStatus: (status) => status,
  formatGender: (gender, isShort) => gender,
  formatPenjamin: (penjamin) => penjamin,
  formatMaritalStatus: (status) => status,
  formatReligion: (agama) => agama,
  formatRole: (role) => role,
  formatKelompok: (kelompok) => kelompok,
});

export function getInitialLocale() {
  try {
    const saved = localStorage.getItem('locale');
    if (saved === 'id' || saved === 'en') return saved;
    // Check cookie
    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
    if (match && (match[1] === 'id' || match[1] === 'en')) return match[1];
  } catch (e) {
    // ignore
  }
  return 'id';
}

export function I18nProvider({ children, initialLocale, onLocaleChange }) {
  const [locale, setLocaleState] = useState(() => initialLocale || getInitialLocale());
  const isEn = locale === 'en';

  useEffect(() => {
    if (initialLocale && (initialLocale === 'id' || initialLocale === 'en') && initialLocale !== locale) {
      setLocaleState(initialLocale);
    }
  }, [initialLocale]);

  const setLocale = (newLocale) => {
    if (newLocale !== 'id' && newLocale !== 'en') return;
    setLocaleState(newLocale);
    try {
      localStorage.setItem('locale', newLocale);
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
      document.documentElement.lang = newLocale;
      fetch(`/locale/${newLocale}`, { credentials: 'include' }).catch(() => {});
    } catch (e) {
      // ignore
    }
    if (onLocaleChange) {
      onLocaleChange(newLocale);
    }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = locale;
      document.cookie = `locale=${locale};path=/;max-age=31536000`;
    } catch (e) {
      // ignore
    }
  }, [locale]);

  const trans = (idText, enText) => (isEn ? enText : idText);

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

  const formatStatus = (status) => {
    if (!status) return '-';
    const s = String(status).toLowerCase().trim();
    const map = {
      menunggu: isEn ? 'Waiting' : 'Menunggu',
      periksa: isEn ? 'Examining' : 'Periksa',
      penunjang: isEn ? 'Support / Lab' : 'Penunjang',
      farmasi: isEn ? 'Pharmacy' : 'Farmasi',
      billing: 'Billing',
      pembayaran: isEn ? 'Payment' : 'Pembayaran',
      selesai: isEn ? 'Completed' : 'Selesai',
      batal: isEn ? 'Cancelled' : 'Batal',
      lunas: isEn ? 'Paid in Full' : 'Lunas',
      belum_bayar: isEn ? 'Unpaid' : 'Belum Bayar',
      sebagian: isEn ? 'Partially Paid' : 'Sebagian',
      aktif: isEn ? 'Active' : 'Aktif',
      nonaktif: isEn ? 'Inactive' : 'Nonaktif',
      baru: isEn ? 'New' : 'Baru',
      diproses: isEn ? 'Processing' : 'Diproses',
      disiapkan: isEn ? 'Prepared' : 'Disiapkan',
      draft: 'Draft',
      final: 'Final',
    };
    if (map[s]) return map[s];
    return isEn ? s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : status;
  };

  const formatGender = (gender, isShort = false) => {
    if (!gender) return '-';
    const g = String(gender).toUpperCase().trim();
    if (g === 'L' || g === 'LAKI-LAKI' || g === 'MALE' || g === 'M') {
      return isShort ? (isEn ? 'M' : 'L') : (isEn ? 'Male' : 'Laki-laki');
    }
    if (g === 'P' || g === 'PEREMPUAN' || g === 'FEMALE' || g === 'F') {
      return isShort ? (isEn ? 'F' : 'P') : (isEn ? 'Female' : 'Perempuan');
    }
    return gender;
  };

  const formatPenjamin = (penjamin) => {
    if (!penjamin) return '-';
    const p = String(penjamin).toLowerCase().trim();
    if (p === 'umum') return isEn ? 'General / Self-pay' : 'Umum';
    if (p === 'bpjs') return 'BPJS';
    if (p === 'asuransi') return isEn ? 'Private Insurance' : 'Asuransi Swasta';
    if (p === 'corporate') return isEn ? 'Corporate' : 'Perusahaan';
    return isEn ? p.replace(/_/g, ' ') : penjamin;
  };

  const formatMaritalStatus = (status) => {
    if (!status) return '—';
    const s = String(status).toLowerCase().trim();
    if (s.includes('belum') || s === 'single') return isEn ? 'Single' : 'Belum Kawin';
    if (s === 'kawin' || s === 'menikah' || s === 'married') return isEn ? 'Married' : 'Kawin';
    if (s.includes('cerai hidup') || s === 'divorced') return isEn ? 'Divorced' : 'Cerai Hidup';
    if (s.includes('cerai mati') || s === 'widowed') return isEn ? 'Widowed' : 'Cerai Mati';
    return isEn ? s.replace(/_/g, ' ') : status;
  };

  const formatReligion = (agama) => {
    if (!agama) return '—';
    const a = String(agama).toLowerCase().trim();
    const map = {
      islam: 'Islam',
      kristen: isEn ? 'Christian' : 'Kristen',
      katolik: isEn ? 'Catholic' : 'Katolik',
      hindu: 'Hindu',
      buddha: isEn ? 'Buddhist' : 'Buddha',
      konghucu: isEn ? 'Confucian' : 'Konghucu',
    };
    return map[a] || agama;
  };

  const formatRole = (role) => {
    if (!role) return '';
    const r = String(role).toLowerCase().trim();
    if (r === 'superadmin' || r === 'super administrator') return 'Super Administrator';
    if (r.includes('dokter')) return isEn ? 'Doctor' : 'Dokter';
    if (r.includes('perawat')) return isEn ? 'Nurse' : 'Perawat';
    if (r.includes('kasir') || r.includes('billing')) return isEn ? 'Cashier / Billing' : 'Kasir / Billing';
    if (r.includes('farmasi') || r.includes('apotek')) return isEn ? 'Pharmacist' : 'Apoteker / Farmasi';
    if (r.includes('pendaftaran') || r.includes('registrasi')) return isEn ? 'Registration Officer' : 'Petugas Pendaftaran';
    if (r.includes('manajemen') || r.includes('management')) return isEn ? 'Management' : 'Manajemen';
    return role;
  };

  const formatKelompok = (kelompok) => {
    if (!kelompok) return '-';
    const k = String(kelompok).toLowerCase().trim();
    if (k.includes('umum')) return isEn ? 'General / Self-pay' : 'Umum';
    if (k.includes('perusahaan') || k.includes('corporate')) return isEn ? 'Corporate' : 'Perusahaan';
    if (k.includes('asuransi')) return isEn ? 'Insurance' : 'Asuransi';
    if (k.includes('bpjs')) return 'BPJS';
    return kelompok;
  };

  const t = (key, params = {}) => {
    const dict = TRANSLATIONS[locale] || TRANSLATIONS.id;
    const fallbackDict = TRANSLATIONS.id;
    const segments = key.split('.');
    
    let val = dict;
    for (const seg of segments) {
      if (val && typeof val === 'object' && seg in val) {
        val = val[seg];
      } else {
        val = null;
        break;
      }
    }

    if (val === null || val === undefined) {
      let fallbackVal = fallbackDict;
      for (const seg of segments) {
        if (fallbackVal && typeof fallbackVal === 'object' && seg in fallbackVal) {
          fallbackVal = fallbackVal[seg];
        } else {
          fallbackVal = null;
          break;
        }
      }
      val = fallbackVal !== null && fallbackVal !== undefined ? fallbackVal : key;
    }

    if (typeof val === 'string' && params && typeof params === 'object') {
      let replaced = val;
      for (const [pk, pv] of Object.entries(params)) {
        replaced = replaced.replace(new RegExp(`:${pk}`, 'g'), String(pv));
      }
      return replaced;
    }

    return val;
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        isEn,
        trans,
        formatTgl,
        formatStatus,
        formatGender,
        formatPenjamin,
        formatMaritalStatus,
        formatReligion,
        formatRole,
        formatKelompok,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
