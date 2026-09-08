<?php
/**
 * Registry entitas Master Data untuk mesin CRUD generik.
 * Tiap entitas mendefinisikan tabel, grup, ikon, dan daftar field.
 *
 * Tipe field: text | number | money | textarea | enum | fk | time | date | readonly
 */
require_once __DIR__ . '/../../includes/master_lib.php';
require_once __DIR__ . '/../../includes/icons.php';

function master_entities(): array
{
    $e = fn(string $slug, string $key) => t("common.master_entities.{$slug}.{$key}");
    $f = fn(string $key) => t("common.master_fields.{$key}");

    return [
        // ---------- Layanan & Tarif ----------
        'tindakan' => [
            'label' => $e('tindakan', 'label'), 'singular' => $e('tindakan', 'singular'),
            'table' => 'tindakan', 'group' => 'Layanan & Tarif', 'icon' => app_icon('syringe'), 'order' => 'nama',
            'fields' => [
                'kode'       => ['label' => $f('item_code'), 'type' => 'text', 'required' => true, 'list' => true],
                'nama'       => ['label' => $f('medical_service_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'status'     => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
                'tarif'      => ['label' => $f('initial_price'), 'type' => 'money', 'list' => true],
                'harga_jual' => ['label' => $f('selling_price'), 'type' => 'money', 'list' => true],
            ],
        ],
        'konsultasi' => [
            'label' => $e('konsultasi', 'label'), 'singular' => $e('konsultasi', 'singular'),
            'table' => 'konsultasi', 'group' => 'Layanan & Tarif', 'icon' => app_icon('user'), 'order' => 'nama',
            'code' => ['jenis' => 'konsultasi'],
            'fields' => [
                'kode'       => ['label' => $f('item_code'), 'type' => 'readonly', 'list' => true],
                'nama'       => ['label' => $f('consultation_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'status'     => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
                'tarif'      => ['label' => $f('initial_price'), 'type' => 'money', 'list' => true],
                'harga_jual' => ['label' => $f('selling_price'), 'type' => 'money', 'list' => true],
            ],
        ],
        'lab_kategori' => [
            'label' => $e('lab_kategori', 'label'), 'tab' => $e('lab_kategori', 'tab'), 'singular' => $e('lab_kategori', 'singular'),
            'table' => 'lab_kategori', 'group' => 'Layanan & Tarif', 'icon' => app_icon('flask'), 'order' => 'nama',
            'fields' => [
                'nama' => ['label' => $f('category_name'), 'type' => 'text', 'required' => true, 'list' => true],
            ],
        ],
        'lab_pemeriksaan' => [
            'label' => $e('lab_pemeriksaan', 'label'), 'tab' => $e('lab_pemeriksaan', 'tab'), 'singular' => $e('lab_pemeriksaan', 'singular'),
            'table' => 'lab_pemeriksaan', 'group' => 'Layanan & Tarif', 'icon' => app_icon('flask'), 'order' => 'nama',
            'code' => ['jenis' => 'lab'],
            'fields' => [
                'kode'          => ['label' => $f('item_code'), 'type' => 'readonly', 'list' => true],
                'kategori_id'   => ['label' => $f('category'), 'type' => 'fk', 'fk_table' => 'lab_kategori', 'fk_label' => 'nama', 'list' => true],
                'nama'          => ['label' => $f('examination_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'satuan'        => ['label' => $f('unit'), 'type' => 'text'],
                'nilai_rujukan' => ['label' => $f('reference_value'), 'type' => 'text'],
                'tarif'         => ['label' => $f('initial_price'), 'type' => 'money', 'list' => true],
                'harga_jual'    => ['label' => $f('selling_price'), 'type' => 'money', 'list' => true],
                'status'        => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],
        'rad_kategori' => [
            'label' => $e('rad_kategori', 'label'), 'tab' => $e('rad_kategori', 'tab'), 'singular' => $e('rad_kategori', 'singular'),
            'table' => 'rad_kategori', 'group' => 'Layanan & Tarif', 'icon' => app_icon('scan'), 'order' => 'nama',
            'fields' => [
                'nama' => ['label' => $f('category_name'), 'type' => 'text', 'required' => true, 'list' => true],
            ],
        ],
        'rad_pemeriksaan' => [
            'label' => $e('rad_pemeriksaan', 'label'), 'tab' => $e('rad_pemeriksaan', 'tab'), 'singular' => $e('rad_pemeriksaan', 'singular'),
            'table' => 'rad_pemeriksaan', 'group' => 'Layanan & Tarif', 'icon' => app_icon('scan'), 'order' => 'nama',
            'code' => ['jenis' => 'radiologi'],
            'fields' => [
                'kode'        => ['label' => $f('item_code'), 'type' => 'readonly', 'list' => true],
                'kategori_id' => ['label' => $f('category'), 'type' => 'fk', 'fk_table' => 'rad_kategori', 'fk_label' => 'nama', 'list' => true],
                'nama'        => ['label' => $f('examination_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'tarif'       => ['label' => $f('initial_price'), 'type' => 'money', 'list' => true],
                'harga_jual'  => ['label' => $f('selling_price'), 'type' => 'money', 'list' => true],
                'status'      => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],
        'diag_kategori' => [
            'label' => $e('diag_kategori', 'label'), 'tab' => $e('diag_kategori', 'tab'), 'singular' => $e('diag_kategori', 'singular'),
            'table' => 'diag_kategori', 'group' => 'Layanan & Tarif', 'icon' => app_icon('monitor'), 'order' => 'nama',
            'fields' => [
                'nama' => ['label' => $f('category_name'), 'type' => 'text', 'required' => true, 'list' => true],
            ],
        ],
        'diag_pemeriksaan' => [
            'label' => $e('diag_pemeriksaan', 'label'), 'tab' => $e('diag_pemeriksaan', 'tab'), 'singular' => $e('diag_pemeriksaan', 'singular'),
            'table' => 'diag_pemeriksaan', 'group' => 'Layanan & Tarif', 'icon' => app_icon('monitor'), 'order' => 'nama',
            'code' => ['jenis' => 'diagnostik'],
            'fields' => [
                'kode'        => ['label' => $f('item_code'), 'type' => 'readonly', 'list' => true],
                'kategori_id' => ['label' => $f('category'), 'type' => 'fk', 'fk_table' => 'diag_kategori', 'fk_label' => 'nama', 'list' => true],
                'nama'        => ['label' => $f('examination_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'tarif'       => ['label' => $f('initial_price'), 'type' => 'money', 'list' => true],
                'harga_jual'  => ['label' => $f('selling_price'), 'type' => 'money', 'list' => true],
                'status'      => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],
        'fisio_kategori' => [
            'label' => $e('fisio_kategori', 'label'), 'tab' => $e('fisio_kategori', 'tab'), 'singular' => $e('fisio_kategori', 'singular'),
            'table' => 'fisio_kategori', 'group' => 'Layanan & Tarif', 'icon' => app_icon('pelayanan'), 'order' => 'nama',
            'fields' => [
                'nama' => ['label' => $f('category_name'), 'type' => 'text', 'required' => true, 'list' => true],
            ],
        ],
        'fisio_pemeriksaan' => [
            'label' => $e('fisio_pemeriksaan', 'label'), 'tab' => $e('fisio_pemeriksaan', 'tab'), 'singular' => $e('fisio_pemeriksaan', 'singular'),
            'table' => 'fisio_pemeriksaan', 'group' => 'Layanan & Tarif', 'icon' => app_icon('pelayanan'), 'order' => 'nama',
            'code' => ['jenis' => 'fisioterapi'],
            'fields' => [
                'kode'        => ['label' => $f('item_code'), 'type' => 'readonly', 'list' => true],
                'kategori_id' => ['label' => $f('category'), 'type' => 'fk', 'fk_table' => 'fisio_kategori', 'fk_label' => 'nama', 'list' => true],
                'nama'        => ['label' => $f('service_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'tarif'       => ['label' => $f('initial_price'), 'type' => 'money', 'list' => true],
                'harga_jual'  => ['label' => $f('selling_price'), 'type' => 'money', 'list' => true],
                'status'      => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],

        // ---------- SDM & Poli ----------
        'spesialisasi' => [
            'label' => $e('spesialisasi', 'label'), 'singular' => $e('spesialisasi', 'singular'),
            'table' => 'spesialisasi', 'group' => 'SDM & Poli', 'icon' => app_icon('award'), 'order' => 'nama',
            'fields' => [
                'nama' => ['label' => $f('specialization_name'), 'type' => 'text', 'required' => true, 'list' => true],
            ],
        ],
        'dokter' => [
            'label' => $e('dokter', 'label'), 'singular' => $e('dokter', 'singular'),
            'table' => 'dokter', 'group' => 'SDM & Poli', 'icon' => app_icon('user'), 'order' => 'nama',
            'code' => ['jenis' => 'dokter'],
            'fields' => [
                'kode'            => ['label' => $f('code'), 'type' => 'readonly', 'list' => true],
                'nama'            => ['label' => $f('doctor_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'spesialisasi_id' => ['label' => $f('specialization'), 'type' => 'fk', 'fk_table' => 'spesialisasi', 'fk_label' => 'nama', 'list' => true],
                'poli_id'         => ['label' => $f('polyclinic'), 'type' => 'fk', 'fk_table' => 'poli', 'fk_label' => 'nama', 'list' => true],
                'no_sip'          => ['label' => $f('sip_no'), 'type' => 'text'],
                'telepon'         => ['label' => $f('phone'), 'type' => 'text'],
                'tarif_jasa'      => ['label' => $f('service_fee'), 'type' => 'money', 'list' => true],
                'status'          => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],
        'poli' => [
            'label' => $e('poli', 'label'), 'singular' => $e('poli', 'singular'),
            'table' => 'poli', 'group' => 'SDM & Poli', 'icon' => app_icon('hospital'), 'order' => 'nama',
            'fields' => [
                'kode'   => ['label' => $f('poly_code'), 'type' => 'text', 'required' => true, 'list' => true],
                'nama'   => ['label' => $f('poly_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'status' => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],
        'jadwal_dokter' => [
            'label' => $e('jadwal_dokter', 'label'), 'singular' => $e('jadwal_dokter', 'singular'),
            'table' => 'jadwal_dokter', 'group' => 'SDM & Poli', 'icon' => app_icon('calendar'), 'order' => 'id',
            'fields' => [
                'dokter_id'   => ['label' => $f('doctor'), 'type' => 'fk', 'fk_table' => 'dokter', 'fk_label' => 'nama', 'required' => true, 'list' => true],
                'poli_id'     => ['label' => $f('polyclinic'), 'type' => 'fk', 'fk_table' => 'poli', 'fk_label' => 'nama', 'required' => true, 'list' => true],
                'hari'        => ['label' => $f('day'), 'type' => 'enum', 'options' => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'], 'list' => true],
                'jam_mulai'   => ['label' => $f('start_time'), 'type' => 'time', 'list' => true],
                'jam_selesai' => ['label' => $f('end_time'), 'type' => 'time', 'list' => true],
                'kuota'       => ['label' => $f('quota'), 'type' => 'number', 'list' => true],
            ],
        ],

        // ---------- Medicine ----------
        'obat_kategori' => [
            'label' => $e('obat_kategori', 'label'), 'singular' => $e('obat_kategori', 'singular'),
            'table' => 'obat_kategori', 'group' => 'Medicine', 'icon' => app_icon('tag'), 'order' => 'nama',
            'fields' => [
                'nama' => ['label' => $f('category_name'), 'type' => 'text', 'required' => true, 'list' => true],
            ],
        ],
        'obat_satuan' => [
            'label' => $e('obat_satuan', 'label'), 'singular' => $e('obat_satuan', 'singular'),
            'table' => 'obat_satuan', 'group' => 'Medicine', 'icon' => app_icon('ruler'), 'order' => 'nama',
            'fields' => [
                'nama' => ['label' => $f('unit_name'), 'type' => 'text', 'required' => true, 'list' => true],
            ],
        ],
        'supplier' => [
            'label' => $e('supplier', 'label'), 'singular' => $e('supplier', 'singular'),
            'table' => 'supplier', 'group' => 'Medicine', 'icon' => app_icon('truck'), 'order' => 'nama',
            'fields' => [
                'nama'    => ['label' => $f('supplier_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'kontak'  => ['label' => $f('contact'), 'type' => 'text', 'list' => true],
                'telepon' => ['label' => $f('phone'), 'type' => 'text', 'list' => true],
                'alamat'  => ['label' => $f('address'), 'type' => 'textarea'],
            ],
        ],
        'obat' => [
            'label' => $e('obat', 'label'), 'singular' => $e('obat', 'singular'),
            'table' => 'obat', 'group' => 'Medicine', 'icon' => app_icon('pills'), 'order' => 'nama',
            'code' => ['jenis' => 'obat'],
            'fields' => [
                'kode'         => ['label' => $f('item_code'), 'type' => 'readonly', 'list' => true],
                'nama'         => ['label' => $f('medicine_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'kategori_id'  => ['label' => $f('category'), 'type' => 'fk', 'fk_table' => 'obat_kategori', 'fk_label' => 'nama', 'list' => true],
                'satuan_id'    => ['label' => $f('unit'), 'type' => 'fk', 'fk_table' => 'obat_satuan', 'fk_label' => 'nama'],
                'stok'         => ['label' => $f('initial_stock'), 'type' => 'number', 'list' => true],
                'harga_beli'   => ['label' => $f('purchase_price'), 'type' => 'money', 'list' => true],
                'harga_jual'   => ['label' => $f('selling_price'), 'type' => 'money', 'list' => true],
                'stok_minimal' => ['label' => $f('min_stock'), 'type' => 'number'],
                'status'       => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],

        // ---------- Penjamin & Bank ----------
        'asuransi' => [
            'label' => $e('asuransi', 'label'), 'singular' => $e('asuransi', 'singular'),
            'table' => 'asuransi', 'group' => 'Penjamin & Bank', 'icon' => app_icon('shield'), 'order' => 'nama',
            'fields' => [
                'kode'     => ['label' => $f('code'), 'type' => 'text', 'required' => true, 'list' => true],
                'nama'     => ['label' => $f('insurance_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'jenis'    => ['label' => $f('type'), 'type' => 'enum', 'options' => ['bpjs', 'swasta'], 'default' => 'swasta', 'list' => true],
                'provider' => ['label' => $f('provider'), 'type' => 'text'],
                'telepon'  => ['label' => $f('phone'), 'type' => 'text'],
                'status'   => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],
        'corporate' => [
            'label' => $e('corporate', 'label'), 'singular' => $e('corporate', 'singular'),
            'table' => 'corporate', 'group' => 'Penjamin & Bank', 'icon' => app_icon('building'), 'order' => 'nama',
            'fields' => [
                'kode'          => ['label' => $f('code'), 'type' => 'text', 'required' => true, 'list' => true],
                'nama'          => ['label' => $f('company_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'kontak'        => ['label' => $f('contact'), 'type' => 'text'],
                'telepon'       => ['label' => $f('phone'), 'type' => 'text'],
                'alamat'        => ['label' => $f('address'), 'type' => 'textarea'],
                'limit_jaminan' => ['label' => $f('coverage_limit'), 'type' => 'money', 'list' => true],
                'syarat'        => ['label' => $f('terms'), 'type' => 'textarea'],
                'status'        => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],
        'bank' => [
            'label' => $e('bank', 'label'), 'singular' => $e('bank', 'singular'),
            'table' => 'bank', 'group' => 'Penjamin & Bank', 'icon' => app_icon('bank'), 'order' => 'nama_bank',
            'fields' => [
                'nama_bank'   => ['label' => $f('bank_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'no_rekening' => ['label' => $f('account_no'), 'type' => 'text', 'required' => true, 'list' => true],
                'atas_nama'   => ['label' => $f('account_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'cabang'      => ['label' => $f('branch'), 'type' => 'text', 'list' => true],
                'status'      => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],

        // ---------- Billing ----------
        'kode_pembatalan' => [
            'label' => $e('kode_pembatalan', 'label'), 'singular' => $e('kode_pembatalan', 'singular'),
            'table' => 'kode_pembatalan', 'where' => "kode NOT LIKE 'BTL-REG%'", 'group' => 'Billing', 'icon' => app_icon('close'), 'order' => 'kode',
            'fields' => [
                'kode'       => ['label' => $f('code'), 'type' => 'text', 'required' => true, 'list' => true],
                'nama'       => ['label' => $f('reason_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'keterangan' => ['label' => $f('remarks'), 'type' => 'text', 'list' => true],
                'status'     => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],
        'kode_pembatalan_reg' => [
            'label' => $e('kode_pembatalan_reg', 'label'), 'singular' => $e('kode_pembatalan_reg', 'singular'),
            'table' => 'kode_pembatalan', 'where' => "kode LIKE 'BTL-REG%'", 'group' => 'Billing', 'icon' => app_icon('close'), 'order' => 'kode',
            'fields' => [
                'kode'       => ['label' => $f('code'), 'type' => 'text', 'required' => true, 'list' => true, 'placeholder' => 'BTL-REG...'],
                'nama'       => ['label' => $f('reason_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'keterangan' => ['label' => $f('remarks'), 'type' => 'text', 'list' => true],
                'status'     => ['label' => t('common.status'), 'type' => 'enum', 'options' => ['aktif', 'nonaktif'], 'default' => 'aktif', 'list' => true],
            ],
        ],

        // ---------- Pasien ----------
        'kelompok_pasien' => [
            'label' => $e('kelompok_pasien', 'label'), 'singular' => $e('kelompok_pasien', 'singular'),
            'table' => 'kelompok_pasien', 'group' => 'Pasien', 'icon' => app_icon('users'), 'order' => 'nama',
            'fields' => [
                'nama'       => ['label' => $f('group_name'), 'type' => 'text', 'required' => true, 'list' => true],
                'keterangan' => ['label' => $f('remarks'), 'type' => 'text', 'list' => true],
            ],
        ],
    ];
}

/** Ambil konfigurasi satu entitas, atau null bila tidak ada */
function master_entity(string $slug): ?array
{
    $all = master_entities();
    if (!isset($all[$slug])) return null;
    $e = $all[$slug];
    $e['slug'] = $slug;
    return $e;
}

/** Cache map id=>label untuk field FK (untuk tampilan daftar & pilihan form) */
function fk_map(string $table, string $labelCol): array
{
    static $cache = [];
    $key = $table . '|' . $labelCol;
    if (!isset($cache[$key])) {
        $rows = db()->query("SELECT id, {$labelCol} AS lbl FROM {$table} ORDER BY {$labelCol}")->fetchAll();
        $map = [];
        foreach ($rows as $r) $map[$r['id']] = $r['lbl'];
        $cache[$key] = $map;
    }
    return $cache[$key];
}
