<?php

/**
 * Registry entitas Master Data SIM Klinik untuk mesin CRUD generik.
 *
 * Tipe field yang didukung:
 * - text      : Input teks standar
 * - number    : Input angka numerik
 * - money     : Input mata uang / tarif (terformat angka)
 * - textarea  : Input teks panjang / multi-line
 * - enum      : Pilihan dropdown statis
 * - fk        : Pilihan dropdown dinamis terhubung foreign key ke tabel lain
 * - time      : Input waktu (jam:menit)
 * - date      : Input tanggal (YYYY-MM-DD)
 * - readonly  : Field hanya-baca / auto-generated
 */

return [
    // ---------- Layanan & Tarif ----------
    'tindakan' => [
        'label' => 'Tindakan Medis',
        'singular' => 'Tindakan Medis',
        'table' => 'tindakan',
        'group' => 'Layanan & Tarif',
        'icon_name' => 'syringe',
        'order' => 'nama',
        'code_prefix' => 'GCMS',
        'fields' => [
            'kode'       => ['label' => 'Kode Tindakan', 'type' => 'readonly', 'list' => true],
            'nama'       => ['label' => 'Nama Tindakan', 'type' => 'text', 'required' => true, 'list' => true],
            'status'     => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            'tarif'      => ['label' => 'Tarif Dasar', 'type' => 'money', 'list' => true],
            'harga_jual' => ['label' => 'Tarif Jual', 'type' => 'money', 'list' => true],
        ],
    ],
    'konsultasi' => [
        'label' => 'Konsultasi Dokter',
        'singular' => 'Konsultasi Dokter',
        'table' => 'konsultasi',
        'group' => 'Layanan & Tarif',
        'icon_name' => 'user',
        'order' => 'nama',
        'code_prefix' => 'GCCN',
        'fields' => [
            'kode'       => ['label' => 'Kode', 'type' => 'readonly', 'list' => true],
            'nama'       => ['label' => 'Nama Konsultasi', 'type' => 'text', 'required' => true, 'list' => true],
            'status'     => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            'tarif'      => ['label' => 'Tarif Dasar', 'type' => 'money', 'list' => true],
            'harga_jual' => ['label' => 'Tarif Jual', 'type' => 'money', 'list' => true],
        ],
    ],
    'lab_kategori' => [
        'label' => 'Kategori Lab',
        'tab' => 'Kategori Lab',
        'singular' => 'Kategori Lab',
        'table' => 'lab_kategori',
        'group' => 'Layanan & Tarif',
        'icon_name' => 'flask',
        'order' => 'nama',
        'fields' => [
            'nama' => ['label' => 'Nama Kategori', 'type' => 'text', 'required' => true, 'list' => true],
        ],
    ],
    'lab_pemeriksaan' => [
        'label' => 'Pemeriksaan Lab',
        'tab' => 'Pemeriksaan Lab',
        'singular' => 'Pemeriksaan Lab',
        'table' => 'lab_pemeriksaan',
        'group' => 'Layanan & Tarif',
        'icon_name' => 'flask',
        'order' => 'nama',
        'code_prefix' => 'GCLA',
        'fields' => [
            'kode'          => ['label' => 'Kode', 'type' => 'readonly', 'list' => true],
            'kategori_id'   => ['label' => 'Kategori', 'type' => 'fk', 'fk_table' => 'lab_kategori', 'fk_label' => 'nama', 'list' => true],
            'nama'          => ['label' => 'Nama Pemeriksaan', 'type' => 'text', 'required' => true, 'list' => true],
            'satuan'        => ['label' => 'Satuan', 'type' => 'text'],
            'nilai_rujukan' => ['label' => 'Nilai Rujukan', 'type' => 'text'],
            'tarif'         => ['label' => 'Tarif Dasar', 'type' => 'money', 'list' => true],
            'harga_jual'    => ['label' => 'Tarif Jual', 'type' => 'money', 'list' => true],
            'status'        => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],
    'rad_kategori' => [
        'label' => 'Kategori Radiologi',
        'tab' => 'Kategori Radiologi',
        'singular' => 'Kategori Radiologi',
        'table' => 'rad_kategori',
        'group' => 'Layanan & Tarif',
        'icon_name' => 'scan',
        'order' => 'nama',
        'fields' => [
            'nama' => ['label' => 'Nama Kategori', 'type' => 'text', 'required' => true, 'list' => true],
        ],
    ],
    'rad_pemeriksaan' => [
        'label' => 'Pemeriksaan Radiologi',
        'tab' => 'Pemeriksaan Radiologi',
        'singular' => 'Pemeriksaan Radiologi',
        'table' => 'rad_pemeriksaan',
        'group' => 'Layanan & Tarif',
        'icon_name' => 'scan',
        'order' => 'nama',
        'code_prefix' => 'GCRA',
        'fields' => [
            'kode'        => ['label' => 'Kode', 'type' => 'readonly', 'list' => true],
            'kategori_id' => ['label' => 'Kategori', 'type' => 'fk', 'fk_table' => 'rad_kategori', 'fk_label' => 'nama', 'list' => true],
            'nama'        => ['label' => 'Nama Pemeriksaan', 'type' => 'text', 'required' => true, 'list' => true],
            'tarif'       => ['label' => 'Tarif Dasar', 'type' => 'money', 'list' => true],
            'harga_jual'  => ['label' => 'Tarif Jual', 'type' => 'money', 'list' => true],
            'status'      => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],
    'diag_kategori' => [
        'label' => 'Kategori Diagnostik',
        'tab' => 'Kategori Diagnostik',
        'singular' => 'Kategori Diagnostik',
        'table' => 'diag_kategori',
        'group' => 'Layanan & Tarif',
        'icon_name' => 'monitor',
        'order' => 'nama',
        'fields' => [
            'nama' => ['label' => 'Nama Kategori', 'type' => 'text', 'required' => true, 'list' => true],
        ],
    ],
    'diag_pemeriksaan' => [
        'label' => 'Pemeriksaan Diagnostik',
        'tab' => 'Pemeriksaan Diagnostik',
        'singular' => 'Pemeriksaan Diagnostik',
        'table' => 'diag_pemeriksaan',
        'group' => 'Layanan & Tarif',
        'icon_name' => 'monitor',
        'order' => 'nama',
        'code_prefix' => 'GCDC',
        'fields' => [
            'kode'        => ['label' => 'Kode', 'type' => 'readonly', 'list' => true],
            'kategori_id' => ['label' => 'Kategori', 'type' => 'fk', 'fk_table' => 'diag_kategori', 'fk_label' => 'nama', 'list' => true],
            'nama'        => ['label' => 'Nama Pemeriksaan', 'type' => 'text', 'required' => true, 'list' => true],
            'tarif'       => ['label' => 'Tarif Dasar', 'type' => 'money', 'list' => true],
            'harga_jual'  => ['label' => 'Tarif Jual', 'type' => 'money', 'list' => true],
            'status'      => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],
    'fisio_kategori' => [
        'label' => 'Kategori Fisioterapi',
        'tab' => 'Kategori Fisioterapi',
        'singular' => 'Kategori Fisioterapi',
        'table' => 'fisio_kategori',
        'group' => 'Layanan & Tarif',
        'icon_name' => 'pelayanan',
        'order' => 'nama',
        'fields' => [
            'nama' => ['label' => 'Nama Kategori', 'type' => 'text', 'required' => true, 'list' => true],
        ],
    ],
    'fisio_pemeriksaan' => [
        'label' => 'Layanan Fisioterapi',
        'tab' => 'Layanan Fisioterapi',
        'singular' => 'Layanan Fisioterapi',
        'table' => 'fisio_pemeriksaan',
        'group' => 'Layanan & Tarif',
        'icon_name' => 'pelayanan',
        'order' => 'nama',
        'code_prefix' => 'GCPT',
        'fields' => [
            'kode'        => ['label' => 'Kode', 'type' => 'readonly', 'list' => true],
            'kategori_id' => ['label' => 'Kategori', 'type' => 'fk', 'fk_table' => 'fisio_kategori', 'fk_label' => 'nama', 'list' => true],
            'nama'        => ['label' => 'Nama Layanan', 'type' => 'text', 'required' => true, 'list' => true],
            'tarif'       => ['label' => 'Tarif Dasar', 'type' => 'money', 'list' => true],
            'harga_jual'  => ['label' => 'Tarif Jual', 'type' => 'money', 'list' => true],
            'status'      => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],

    // ---------- SDM & Poli ----------
    'spesialisasi' => [
        'label' => 'Spesialisasi Dokter',
        'singular' => 'Spesialisasi Dokter',
        'table' => 'spesialisasi',
        'group' => 'SDM & Poli',
        'icon_name' => 'award',
        'order' => 'nama',
        'fields' => [
            'nama' => ['label' => 'Nama Spesialisasi', 'type' => 'text', 'required' => true, 'list' => true],
        ],
    ],
    'dokter' => [
        'label' => 'Dokter',
        'singular' => 'Dokter',
        'table' => 'dokter',
        'group' => 'SDM & Poli',
        'icon_name' => 'user',
        'order' => 'nama',
        'code_prefix' => 'GBKDR',
        'fields' => [
            'kode'            => ['label' => 'Kode Dokter', 'type' => 'readonly', 'list' => true],
            'nama'            => ['label' => 'Nama Dokter', 'type' => 'text', 'required' => true, 'list' => true],
            'spesialisasi_id' => ['label' => 'Spesialisasi', 'type' => 'fk', 'fk_table' => 'spesialisasi', 'fk_label' => 'nama', 'list' => true],
            'poli_id'         => ['label' => 'Poliklinik', 'type' => 'fk', 'fk_table' => 'poli', 'fk_label' => 'nama', 'list' => true],
            'no_sip'          => ['label' => 'No. SIP', 'type' => 'text'],
            'telepon'         => ['label' => 'No. Telepon', 'type' => 'text'],
            'tarif_jasa'      => ['label' => 'Tarif Jasa Medis', 'type' => 'money', 'list' => true],
            'status'          => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],
    'poli' => [
        'label' => 'Poliklinik',
        'singular' => 'Poliklinik',
        'table' => 'poli',
        'group' => 'SDM & Poli',
        'icon_name' => 'hospital',
        'order' => 'nama',
        'fields' => [
            'kode'   => ['label' => 'Kode Poli', 'type' => 'text', 'required' => true, 'list' => true],
            'nama'   => ['label' => 'Nama Poli', 'type' => 'text', 'required' => true, 'list' => true],
            'status' => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],
    'jadwal_dokter' => [
        'label' => 'Jadwal Dokter',
        'singular' => 'Jadwal Dokter',
        'table' => 'jadwal_dokter',
        'group' => 'SDM & Poli',
        'icon_name' => 'calendar',
        'order' => 'id',
        'fields' => [
            'dokter_id'   => ['label' => 'Dokter', 'type' => 'fk', 'fk_table' => 'dokter', 'fk_label' => 'nama', 'required' => true, 'list' => true],
            'poli_id'     => ['label' => 'Poliklinik', 'type' => 'fk', 'fk_table' => 'poli', 'fk_label' => 'nama', 'required' => true, 'list' => true],
            'hari'        => ['label' => 'Hari Praktik', 'type' => 'enum', 'options' => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'], 'list' => true],
            'jam_mulai'   => ['label' => 'Jam Mulai', 'type' => 'time', 'list' => true],
            'jam_selesai' => ['label' => 'Jam Selesai', 'type' => 'time', 'list' => true],
            'kuota'       => ['label' => 'Kuota Pasien', 'type' => 'number', 'list' => true],
        ],
    ],

    // ---------- Medicine ----------
    'obat_kategori' => [
        'label' => 'Kategori Obat',
        'singular' => 'Kategori Obat',
        'table' => 'obat_kategori',
        'group' => 'Medicine',
        'icon_name' => 'tag',
        'order' => 'nama',
        'fields' => [
            'nama' => ['label' => 'Nama Kategori', 'type' => 'text', 'required' => true, 'list' => true],
        ],
    ],
    'obat_satuan' => [
        'label' => 'Satuan Obat',
        'singular' => 'Satuan Obat',
        'table' => 'obat_satuan',
        'group' => 'Medicine',
        'icon_name' => 'ruler',
        'order' => 'nama',
        'fields' => [
            'nama' => ['label' => 'Nama Satuan', 'type' => 'text', 'required' => true, 'list' => true],
        ],
    ],
    'supplier' => [
        'label' => 'Pemasok (Supplier)',
        'singular' => 'Pemasok',
        'table' => 'supplier',
        'group' => 'Medicine',
        'icon_name' => 'truck',
        'order' => 'nama',
        'fields' => [
            'nama'    => ['label' => 'Nama Pemasok', 'type' => 'text', 'required' => true, 'list' => true],
            'kontak'  => ['label' => 'Kontak Person', 'type' => 'text', 'list' => true],
            'telepon' => ['label' => 'No. Telepon', 'type' => 'text', 'list' => true],
            'alamat'  => ['label' => 'Alamat', 'type' => 'textarea'],
        ],
    ],
    'obat' => [
        'label' => 'Data Obat & Alkes',
        'singular' => 'Obat',
        'table' => 'obat',
        'group' => 'Medicine',
        'icon_name' => 'pills',
        'order' => 'nama',
        'code_prefix' => 'FA',
        'fields' => [
            'kode'         => ['label' => 'Kode Obat', 'type' => 'readonly', 'list' => true],
            'nama'         => ['label' => 'Nama Obat', 'type' => 'text', 'required' => true, 'list' => true],
            'kategori_id'  => ['label' => 'Kategori', 'type' => 'fk', 'fk_table' => 'obat_kategori', 'fk_label' => 'nama', 'list' => true],
            'satuan_id'    => ['label' => 'Satuan', 'type' => 'fk', 'fk_table' => 'obat_satuan', 'fk_label' => 'nama'],
            'stok'         => ['label' => 'Stok Awal', 'type' => 'number', 'list' => true],
            'harga_beli'   => ['label' => 'Harga Beli (HPP)', 'type' => 'money', 'list' => true],
            'harga_jual'   => ['label' => 'Harga Jual', 'type' => 'money', 'list' => true],
            'stok_minimal' => ['label' => 'Stok Minimal', 'type' => 'number'],
            'status'       => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],

    // ---------- Penjamin & Bank ----------
    'asuransi' => [
        'label' => 'Penjamin Asuransi',
        'singular' => 'Asuransi',
        'table' => 'asuransi',
        'group' => 'Penjamin & Bank',
        'icon_name' => 'shield',
        'order' => 'nama',
        'fields' => [
            'kode'     => ['label' => 'Kode Penjamin', 'type' => 'text', 'required' => true, 'list' => true],
            'nama'     => ['label' => 'Nama Asuransi', 'type' => 'text', 'required' => true, 'list' => true],
            'jenis'    => ['label' => 'Jenis Penjamin', 'type' => 'enum', 'options' => ['bpjs', 'swasta'], 'default' => 'swasta', 'list' => true],
            'provider' => ['label' => 'Nama Provider', 'type' => 'text'],
            'telepon'  => ['label' => 'No. Telepon', 'type' => 'text'],
            'status'   => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],
    'corporate' => [
        'label' => 'Kerjasama Perusahaan',
        'singular' => 'Perusahaan',
        'table' => 'corporate',
        'group' => 'Penjamin & Bank',
        'icon_name' => 'building',
        'order' => 'nama',
        'fields' => [
            'kode'          => ['label' => 'Kode Perusahaan', 'type' => 'text', 'required' => true, 'list' => true],
            'nama'          => ['label' => 'Nama Perusahaan', 'type' => 'text', 'required' => true, 'list' => true],
            'kontak'        => ['label' => 'Kontak PIC', 'type' => 'text'],
            'telepon'       => ['label' => 'No. Telepon', 'type' => 'text'],
            'alamat'        => ['label' => 'Alamat', 'type' => 'textarea'],
            'limit_jaminan' => ['label' => 'Limit Plafon Jaminan', 'type' => 'money', 'list' => true],
            'syarat'        => ['label' => 'Syarat & Ketentuan', 'type' => 'textarea'],
            'status'        => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],
    'bank' => [
        'label' => 'Rekening Bank Klinik',
        'singular' => 'Rekening Bank',
        'table' => 'bank',
        'group' => 'Penjamin & Bank',
        'icon_name' => 'bank',
        'order' => 'nama_bank',
        'fields' => [
            'nama_bank'   => ['label' => 'Nama Bank', 'type' => 'text', 'required' => true, 'list' => true],
            'no_rekening' => ['label' => 'Nomor Rekening', 'type' => 'text', 'required' => true, 'list' => true],
            'atas_nama'   => ['label' => 'Atas Nama (Pemilik)', 'type' => 'text', 'required' => true, 'list' => true],
            'cabang'      => ['label' => 'Kantor Cabang', 'type' => 'text', 'list' => true],
            'status'      => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],

    // ---------- Billing ----------
    'kode_pembatalan' => [
        'label' => 'Alasan Pembatalan Kunjungan',
        'singular' => 'Alasan Pembatalan',
        'table' => 'kode_pembatalan',
        'where' => "kode NOT LIKE 'BTL-REG%'",
        'group' => 'Billing',
        'icon_name' => 'close',
        'order' => 'kode',
        'fields' => [
            'kode'       => ['label' => 'Kode Pembatalan', 'type' => 'text', 'required' => true, 'list' => true],
            'nama'       => ['label' => 'Alasan Pembatalan', 'type' => 'text', 'required' => true, 'list' => true],
            'keterangan' => ['label' => 'Keterangan', 'type' => 'text', 'list' => true],
            'status'     => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],
    'kode_pembatalan_reg' => [
        'label' => 'Alasan Pembatalan Registrasi',
        'singular' => 'Alasan Pembatalan',
        'table' => 'kode_pembatalan',
        'where' => "kode LIKE 'BTL-REG%'",
        'group' => 'Billing',
        'icon_name' => 'close',
        'order' => 'kode',
        'fields' => [
            'kode'       => ['label' => 'Kode Pembatalan', 'type' => 'text', 'required' => true, 'list' => true, 'placeholder' => 'BTL-REG...'],
            'nama'       => ['label' => 'Alasan Pembatalan', 'type' => 'text', 'required' => true, 'list' => true],
            'keterangan' => ['label' => 'Keterangan', 'type' => 'text', 'list' => true],
            'status'     => ['label' => 'Status', 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
        ],
    ],

    // ---------- Pasien ----------
    'kelompok_pasien' => [
        'label' => 'Kelompok / Kategori Pasien',
        'singular' => 'Kelompok Pasien',
        'table' => 'kelompok_pasien',
        'group' => 'Pasien',
        'icon_name' => 'users',
        'order' => 'nama',
        'fields' => [
            'nama'       => ['label' => 'Nama Kelompok Pasien', 'type' => 'text', 'required' => true, 'list' => true],
            'keterangan' => ['label' => 'Keterangan', 'type' => 'text', 'list' => true],
        ],
    ],
];
