<?php
/**
 * Registry laporan untuk engine laporan generik.
 * Tiap laporan: SQL dgn parameter :dari & :sampai, definisi kolom, dan kolom yang dijumlah.
 * Tipe kolom: text | number | money | date | datetime | metode | status | upper
 */
require_once __DIR__ . '/../../includes/keuangan_lib.php';
require_once __DIR__ . '/../../includes/icons.php';

function laporan_list(): array
{
    return [
        'kunjungan' => [
            'label' => t('common.reports.visit'), 'icon' => app_icon('users'), 'group' => t('common.reports.grp_operational'),
            'roles' => ['registrasi', 'dokter', 'kasir'],
            'sql' => "SELECT k.tgl_kunjungan AS tanggal, k.no_kunjungan, p.no_mr, p.nama AS pasien,
                        po.nama AS poli, d.nama AS dokter, k.jenis_penjamin AS penjamin, k.status, k.id AS action_periksa
                      FROM kunjungan k JOIN pasien p ON p.id=k.pasien_id JOIN poli po ON po.id=k.poli_id
                      LEFT JOIN dokter d ON d.id=k.dokter_id
                      WHERE k.tgl_kunjungan BETWEEN :dari AND :sampai
                      ORDER BY k.tgl_kunjungan, k.no_antrian",
            'cols' => [
                'tanggal' => [t('common.reports.col_date'), 'date'], 'no_kunjungan' => [t('common.reports.col_visit_no'), 'text'],
                'no_mr' => [t('common.reports.col_mr_no'), 'text'], 'pasien' => [t('common.reports.col_patient'), 'text'],
                'dokter' => [t('common.reports.col_doctor'), 'text'],
                'penjamin' => [t('common.reports.col_guarantor'), 'upper'], 'status' => [t('app.status'), 'status'],
                'action_periksa' => [t('common.reports.col_action'), 'action_periksa'],
            ], 'sum' => [],
        ],
        'pendapatan' => [
            'label' => t('common.reports.income'), 'icon' => app_icon('money'), 'group' => t('common.reports.grp_finance'),
            'roles' => ['kasir'],
            'sql' => "SELECT pm.tanggal, i.no_invoice, p.nama AS pasien, pm.metode, pm.jumlah
                      FROM pembayaran pm JOIN invoice i ON i.id=pm.invoice_id
                      JOIN kunjungan k ON k.id=i.kunjungan_id JOIN pasien p ON p.id=k.pasien_id
                      WHERE pm.status='valid' AND DATE(pm.tanggal) BETWEEN :dari AND :sampai
                      ORDER BY pm.tanggal",
            'cols' => [
                'tanggal' => [t('common.reports.col_time'), 'datetime'], 'no_invoice' => [t('common.reports.col_invoice_no'), 'text'],
                'pasien' => [t('common.reports.col_patient'), 'text'], 'metode' => [t('common.reports.col_method'), 'metode'], 'jumlah' => [t('common.reports.col_amount'), 'money'],
            ], 'sum' => ['jumlah'],
        ],
        'billing' => [
            'label' => t('common.reports.billing'), 'icon' => app_icon('billing'), 'group' => t('common.reports.grp_finance'),
            'roles' => ['kasir'],
            'sql' => "SELECT b.created_at AS tanggal, k.no_kunjungan, p.nama AS pasien,
                        b.subtotal, b.diskon, b.total
                      FROM billing b JOIN kunjungan k ON k.id=b.kunjungan_id JOIN pasien p ON p.id=k.pasien_id
                      WHERE b.status='final' AND k.tgl_kunjungan BETWEEN :dari AND :sampai
                      ORDER BY b.created_at",
            'cols' => [
                'tanggal' => [t('common.reports.col_date'), 'date'], 'no_kunjungan' => [t('common.reports.col_visit_no'), 'text'],
                'pasien' => [t('common.reports.col_patient'), 'text'], 'subtotal' => [t('common.reports.col_subtotal'), 'money'],
                'diskon' => [t('common.reports.col_discount'), 'money'], 'total' => [t('common.reports.col_total'), 'money'],
            ], 'sum' => ['subtotal', 'diskon', 'total'],
        ],
        'piutang' => [
            'label' => t('common.reports.receivables'), 'icon' => app_icon('clock'), 'group' => t('common.reports.grp_finance'),
            'roles' => ['kasir'],
            'sql' => "SELECT i.tanggal, i.no_invoice, p.nama AS pasien, i.total, i.terbayar,
                        (i.total - i.terbayar) AS sisa, i.status
                      FROM invoice i JOIN kunjungan k ON k.id=i.kunjungan_id JOIN pasien p ON p.id=k.pasien_id
                      WHERE i.status <> 'lunas' AND i.tanggal BETWEEN :dari AND :sampai
                      ORDER BY i.tanggal",
            'cols' => [
                'tanggal' => [t('common.reports.col_date'), 'date'], 'no_invoice' => [t('common.reports.col_invoice_no'), 'text'],
                'pasien' => [t('common.reports.col_patient'), 'text'], 'total' => [t('common.reports.col_total'), 'money'],
                'terbayar' => [t('common.reports.col_paid'), 'money'], 'sisa' => [t('common.reports.col_remaining'), 'money'], 'status' => [t('app.status'), 'status'],
            ], 'sum' => ['total', 'terbayar', 'sisa'],
        ],
        'penjamin' => [
            'label' => t('common.reports.by_guarantor'), 'icon' => app_icon('shield'), 'group' => t('common.reports.grp_finance'),
            'roles' => ['kasir'],
            'sql' => "SELECT k.jenis_penjamin AS penjamin, COUNT(k.id) AS jml,
                        COALESCE(SUM(b.total),0) AS nilai
                      FROM kunjungan k LEFT JOIN billing b ON b.kunjungan_id=k.id AND b.status='final'
                      WHERE k.tgl_kunjungan BETWEEN :dari AND :sampai
                      GROUP BY k.jenis_penjamin ORDER BY nilai DESC",
            'cols' => [
                'penjamin' => [t('common.reports.col_guarantor'), 'upper'], 'jml' => [t('common.reports.col_visit_count'), 'number'], 'nilai' => [t('common.reports.col_billing_value'), 'money'],
            ], 'sum' => ['jml', 'nilai'],
        ],
        'dokter' => [
            'label' => t('common.reports.by_doctor'), 'icon' => app_icon('user'), 'group' => t('common.reports.grp_operational'),
            'roles' => ['dokter'],
            'sql' => "SELECT d.nama AS dokter, COUNT(DISTINCT k.id) AS jml_pasien,
                        COALESCE(SUM(CASE WHEN bd.kategori='jasa_dokter' THEN bd.subtotal END),0) AS jasa
                      FROM kunjungan k JOIN dokter d ON d.id=k.dokter_id
                      LEFT JOIN billing b ON b.kunjungan_id=k.id
                      LEFT JOIN billing_detail bd ON bd.billing_id=b.id
                      WHERE k.tgl_kunjungan BETWEEN :dari AND :sampai
                      GROUP BY d.id ORDER BY jml_pasien DESC",
            'cols' => [
                'dokter' => [t('common.reports.col_doctor'), 'text'], 'jml_pasien' => [t('common.reports.col_patient_count'), 'number'], 'jasa' => [t('common.reports.col_doctor_fee'), 'money'],
            ], 'sum' => ['jml_pasien', 'jasa'],
        ],
        'poli' => [
            'label' => t('common.reports.by_poli'), 'icon' => app_icon('hospital'), 'group' => t('common.reports.grp_operational'),
            'roles' => ['registrasi', 'dokter'],
            'sql' => "SELECT po.nama AS poli, COUNT(k.id) AS jml
                      FROM kunjungan k JOIN poli po ON po.id=k.poli_id
                      WHERE k.tgl_kunjungan BETWEEN :dari AND :sampai
                      GROUP BY po.id ORDER BY jml DESC",
            'cols' => ['poli' => [t('common.reports.col_poli'), 'text'], 'jml' => [t('common.reports.col_visit_count'), 'number']],
            'sum' => ['jml'],
        ],
        'farmasi' => [
            'label' => t('common.reports.pharmacy'), 'icon' => app_icon('pills'), 'group' => t('common.reports.grp_support'),
            'roles' => ['farmasi'],
            'sql' => "SELECT o.kode, o.nama AS obat, SUM(rd.qty) AS qty, SUM(rd.subtotal) AS nilai
                      FROM resep_detail rd JOIN resep r ON r.id=rd.resep_id
                      JOIN kunjungan k ON k.id=r.kunjungan_id JOIN obat o ON o.id=rd.obat_id
                      WHERE k.tgl_kunjungan BETWEEN :dari AND :sampai
                      GROUP BY o.id ORDER BY qty DESC",
            'cols' => [
                'kode' => [t('common.reports.col_code'), 'text'], 'obat' => [t('common.reports.col_medicine'), 'text'],
                'qty' => [t('common.reports.col_qty_out'), 'number'], 'nilai' => [t('common.reports.col_value'), 'money'],
            ], 'sum' => ['qty', 'nilai'],
        ],
        'laboratorium' => [
            'label' => t('common.reports.lab'), 'icon' => app_icon('flask'), 'group' => t('common.reports.grp_support'),
            'roles' => ['dokter'],
            'sql' => "SELECT lp.kode, lp.nama AS pemeriksaan, SUM(lod.qty) AS jml, SUM(lod.subtotal) AS nilai
                      FROM lab_order_detail lod JOIN lab_order lo ON lo.id=lod.lab_order_id
                      JOIN kunjungan k ON k.id=lo.kunjungan_id JOIN lab_pemeriksaan lp ON lp.id=lod.pemeriksaan_id
                      WHERE k.tgl_kunjungan BETWEEN :dari AND :sampai
                      GROUP BY lp.id ORDER BY jml DESC",
            'cols' => [
                'kode' => [t('common.reports.col_code'), 'text'], 'pemeriksaan' => [t('common.reports.col_examination'), 'text'],
                'jml' => [t('common.reports.col_qty'), 'number'], 'nilai' => [t('common.reports.col_value'), 'money'],
            ], 'sum' => ['jml', 'nilai'],
        ],
        'radiologi' => [
            'label' => t('common.reports.radiology'), 'icon' => app_icon('scan'), 'group' => t('common.reports.grp_support'),
            'roles' => ['dokter'],
            'sql' => "SELECT rp.kode, rp.nama AS pemeriksaan, SUM(rod.qty) AS jml, SUM(rod.subtotal) AS nilai
                      FROM rad_order_detail rod JOIN rad_order ro ON ro.id=rod.rad_order_id
                      JOIN kunjungan k ON k.id=ro.kunjungan_id JOIN rad_pemeriksaan rp ON rp.id=rod.pemeriksaan_id
                      WHERE k.tgl_kunjungan BETWEEN :dari AND :sampai
                      GROUP BY rp.id ORDER BY jml DESC",
            'cols' => [
                'kode' => [t('common.reports.col_code'), 'text'], 'pemeriksaan' => [t('common.reports.col_examination'), 'text'],
                'jml' => [t('common.reports.col_qty'), 'number'], 'nilai' => [t('common.reports.col_value'), 'money'],
            ], 'sum' => ['jml', 'nilai'],
        ],
    ];
}

/** Daftar laporan yang boleh diakses sebuah role (superadmin/admin = semua) */
function laporan_list_for(?string $role): array
{
    if (in_array($role, ['superadmin', 'admin'], true)) return laporan_list();
    return array_filter(laporan_list(), fn($r) => in_array($role, $r['roles'] ?? [], true));
}

/** Apakah role boleh mengakses laporan $slug */
function laporan_can(?string $role, string $slug): bool
{
    return isset(laporan_list_for($role)[$slug]);
}

function laporan_get(string $slug): ?array
{
    $all = laporan_list();
    return isset($all[$slug]) ? $all[$slug] + ['slug' => $slug] : null;
}

/** Jalankan query laporan dengan rentang tanggal */
function laporan_run(array $cfg, string $dari, string $sampai): array
{
    $sql = $cfg['sql'];
    $params = [':dari' => $dari, ':sampai' => $sampai];

    // Dokter yang terkait sebuah poli hanya melihat data poli tersebut.
    // Admin / dokter tanpa poli melihat semua. Semua laporan untuk role dokter
    // menyaring lewat klausa tanggal pada kunjungan (alias k), jadi sisipkan
    // filter poli tepat setelah klausa itu.
    $poliId = current_role() === 'dokter' ? current_poli_id() : null;
    $tglClause = 'k.tgl_kunjungan BETWEEN :dari AND :sampai';
    if ($poliId && strpos($sql, $tglClause) !== false) {
        $sql = str_replace($tglClause, $tglClause . ' AND k.poli_id = :poli', $sql);
        $params[':poli'] = $poliId;
    }

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

/** Render nilai sel untuk tampilan HTML */
function laporan_cell_html($val, string $type): string
{
    switch ($type) {
        case 'money':    return rupiah($val);
        case 'number':   return number_format((float) $val, 0, ',', '.');
        case 'date':     return tgl_id($val);
        case 'datetime': return tgl_id($val, true);
        case 'metode':   return e(metode_label((string) $val));
        case 'upper':    return e(strtoupper((string) $val));
        case 'status':   return '<span class="badge badge-gray">' . e(ucwords(str_replace('_', ' ', (string) $val))) . '</span>';
        case 'action_periksa': return '<a href="' . legacy_url('modules/laporan/kunjungan_detail.php?id=' . $val) . '" class="btn btn-sm">Detail</a>';
        default:         return e((string) $val);
    }
}

/** Render nilai sel untuk CSV (tanpa format ribuan agar mudah diolah Excel) */
function laporan_cell_csv($val, string $type): string
{
    switch ($type) {
        case 'money':
        case 'number':   return (string) (0 + $val);
        case 'date':     return $val ? date('Y-m-d', strtotime($val)) : '';
        case 'datetime': return $val ? date('Y-m-d H:i', strtotime($val)) : '';
        case 'metode':   return metode_label((string) $val);
        case 'upper':    return strtoupper((string) $val);
        case 'action_periksa': return '';
        default:         return (string) $val;
    }
}
