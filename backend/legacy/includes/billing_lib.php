<?php
/**
 * Library billing: agregasi seluruh layanan satu kunjungan menjadi
 * baris-baris tagihan (jasa dokter, tindakan, lab, radiologi, farmasi).
 * Tiap baris membawa item_code (kode item) untuk ditampilkan di struk,
 * mengikuti format receipt resmi client.
 * Komponen 'administrasi' & 'diskon' ditambahkan terpisah oleh modul billing.
 */
require_once __DIR__ . '/functions.php';

/**
 * Kumpulkan baris layanan dari sumber transaksi.
 * @return array<int,array{kategori:string,item_code:string,deskripsi:string,qty:int,tarif:float,subtotal:float}>
 */
function collect_billing_lines(int $kunjunganId): array
{
    $lines = [];

    // 2) Tindakan medis & Konsultasi (item_code = kode tindakan / konsultasi)
    $s = db()->prepare(
        "SELECT COALESCE(rt.tgl_layanan, kj.tgl_kunjungan) AS tgl_layanan,
                COALESCE(t.kode, k.kode, '') AS kode, rt.nama_tindakan, rt.qty, rt.tarif AS rt_tarif,
                COALESCE(t.tarif, k.tarif, 0) AS base_tarif, COALESCE(t.harga_jual, k.harga_jual, 0) AS harga_jual,
                rt.tindakan_id, rt.konsultasi_id FROM rm_tindakan rt
         JOIN rekam_medis rm ON rm.id = rt.rekam_medis_id
         JOIN kunjungan kj ON kj.id = rm.kunjungan_id
         LEFT JOIN tindakan t ON t.id = rt.tindakan_id
         LEFT JOIN konsultasi k ON k.id = rt.konsultasi_id
         WHERE rm.kunjungan_id = ?");
    $s->execute([$kunjunganId]);
    foreach ($s->fetchAll() as $r) {
        $rtT = (float) ($r['rt_tarif'] ?? 0);
        $hj = (float) ($r['harga_jual'] ?? 0);
        $base = (float) ($r['base_tarif'] ?? 0);
        $calcTarif = $rtT > 0 ? $rtT : ($hj > 0 ? $hj : round($base * 1.40, 2));
        $qty = (int) $r['qty'];
        $kat = !empty($r['konsultasi_id']) ? 'konsultasi' : 'tindakan';
        $lines[] = ['tgl_layanan' => $r['tgl_layanan'] ?? null, 'kategori' => $kat, 'item_code' => $r['kode'] ?? '',
            'deskripsi' => $r['nama_tindakan'],
            'qty' => $qty, 'tarif' => $calcTarif, 'subtotal' => $calcTarif * $qty];
    }

    // 3) Laboratorium (item_code = kode pemeriksaan lab)
    $s = db()->prepare(
        "SELECT COALESCE(lod.tgl_layanan, kj.tgl_kunjungan) AS tgl_layanan,
                lp.kode, lp.nama, lod.qty, lod.hasil, lod.tarif AS lod_tarif, lp.tarif AS base_tarif, lp.harga_jual FROM lab_order_detail lod
         JOIN lab_order lo ON lo.id = lod.lab_order_id
         JOIN kunjungan kj ON kj.id = lo.kunjungan_id
         JOIN lab_pemeriksaan lp ON lp.id = lod.pemeriksaan_id
         WHERE lo.kunjungan_id = ?");
    $s->execute([$kunjunganId]);
    foreach ($s->fetchAll() as $r) {
        $lodT = (float) ($r['lod_tarif'] ?? 0);
        $hj = (float) ($r['harga_jual'] ?? 0);
        $base = (float) ($r['base_tarif'] ?? 0);
        $calcTarif = $lodT > 0 ? $lodT : ($hj > 0 ? $hj : round($base * 1.40, 2));
        $qty = (int) $r['qty'];
        $lines[] = ['tgl_layanan' => $r['tgl_layanan'] ?? null, 'kategori' => 'laboratorium', 'item_code' => $r['kode'],
            'deskripsi' => $r['nama'], 'hasil' => $r['hasil'] ?? null,
            'qty' => $qty, 'tarif' => $calcTarif, 'subtotal' => $calcTarif * $qty];
    }

    // 4) Radiologi (item_code = kode pemeriksaan radiologi)
    $s = db()->prepare(
        "SELECT COALESCE(rod.tgl_layanan, kj.tgl_kunjungan) AS tgl_layanan,
                rp.kode, rp.nama, rod.qty, rod.hasil, rod.tarif AS rod_tarif, rp.tarif AS base_tarif, rp.harga_jual FROM rad_order_detail rod
         JOIN rad_order ro ON ro.id = rod.rad_order_id
         JOIN kunjungan kj ON kj.id = ro.kunjungan_id
         JOIN rad_pemeriksaan rp ON rp.id = rod.pemeriksaan_id
         WHERE ro.kunjungan_id = ?");
    $s->execute([$kunjunganId]);
    foreach ($s->fetchAll() as $r) {
        $rodT = (float) ($r['rod_tarif'] ?? 0);
        $hj = (float) ($r['harga_jual'] ?? 0);
        $base = (float) ($r['base_tarif'] ?? 0);
        $calcTarif = $rodT > 0 ? $rodT : ($hj > 0 ? $hj : round($base * 1.40, 2));
        $qty = (int) $r['qty'];
        $lines[] = ['tgl_layanan' => $r['tgl_layanan'] ?? null, 'kategori' => 'radiologi', 'item_code' => $r['kode'],
            'deskripsi' => $r['nama'], 'hasil' => $r['hasil'] ?? null,
            'qty' => $qty, 'tarif' => $calcTarif, 'subtotal' => $calcTarif * $qty];
    }

    // 4b) Diagnostik (item_code = kode pemeriksaan diagnostik)
    $s = db()->prepare(
        "SELECT COALESCE(dod.tgl_layanan, kj.tgl_kunjungan) AS tgl_layanan,
                dp.kode, dp.nama, dod.tarif AS dod_tarif, dod.qty, dod.hasil, dp.tarif AS base_tarif, dp.harga_jual FROM diag_order_detail dod
         JOIN diag_order do2 ON do2.id = dod.diag_order_id
         JOIN kunjungan kj ON kj.id = do2.kunjungan_id
         JOIN diag_pemeriksaan dp ON dp.id = dod.pemeriksaan_id
         WHERE do2.kunjungan_id = ?");
    $s->execute([$kunjunganId]);
    foreach ($s->fetchAll() as $r) {
        $dodT = (float) ($r['dod_tarif'] ?? 0);
        $hj = (float) ($r['harga_jual'] ?? 0);
        $base = (float) ($r['base_tarif'] ?? 0);
        $calcTarif = $dodT > 0 ? $dodT : ($hj > 0 ? $hj : round($base * 1.40, 2));
        $qty = (int) $r['qty'];
        $lines[] = ['tgl_layanan' => $r['tgl_layanan'] ?? null, 'kategori' => 'diagnostik', 'item_code' => $r['kode'],
            'deskripsi' => $r['nama'], 'hasil' => $r['hasil'] ?? null,
            'qty' => $qty, 'tarif' => $calcTarif, 'subtotal' => $calcTarif * $qty];
    }

    // 4c) Fisioterapi (item_code = kode layanan fisioterapi)
    $s = db()->prepare(
        "SELECT COALESCE(fod.tgl_layanan, kj.tgl_kunjungan) AS tgl_layanan,
                fp.kode, fp.nama, fod.tarif AS fod_tarif, fod.qty, fod.hasil, fp.tarif AS base_tarif, fp.harga_jual FROM fisio_order_detail fod
         JOIN fisio_order fo ON fo.id = fod.fisio_order_id
         JOIN kunjungan kj ON kj.id = fo.kunjungan_id
         JOIN fisio_pemeriksaan fp ON fp.id = fod.pemeriksaan_id
         WHERE fo.kunjungan_id = ?");
    $s->execute([$kunjunganId]);
    foreach ($s->fetchAll() as $r) {
        $fodT = (float) ($r['fod_tarif'] ?? 0);
        $hj = (float) ($r['harga_jual'] ?? 0);
        $base = (float) ($r['base_tarif'] ?? 0);
        $calcTarif = $fodT > 0 ? $fodT : ($hj > 0 ? $hj : round($base * 1.40, 2));
        $qty = (int) $r['qty'];
        $lines[] = ['tgl_layanan' => $r['tgl_layanan'] ?? null, 'kategori' => 'fisioterapi', 'item_code' => $r['kode'],
            'deskripsi' => $r['nama'], 'hasil' => $r['hasil'] ?? null,
            'qty' => $qty, 'tarif' => $calcTarif, 'subtotal' => $calcTarif * $qty];
    }

    // 5) Farmasi / obat (item_code = kode obat)
    $s = db()->prepare(
        "SELECT COALESCE(rd.tgl_layanan, kj.tgl_kunjungan) AS tgl_layanan,
                o.kode, o.nama, rd.qty, rd.harga AS rd_harga, o.harga_beli, o.harga_jual FROM resep_detail rd
         JOIN resep r ON r.id = rd.resep_id
         JOIN kunjungan kj ON kj.id = r.kunjungan_id
         JOIN obat o ON o.id = rd.obat_id
         WHERE r.kunjungan_id = ?");
    $s->execute([$kunjunganId]);
    foreach ($s->fetchAll() as $r) {
        $rdH = (float) ($r['rd_harga'] ?? 0);
        $hj = (float) ($r['harga_jual'] ?? 0);
        $base = (float) ($r['harga_beli'] ?? 0);
        $calcTarif = $rdH > 0 ? $rdH : ($hj > 0 ? $hj : round($base * 1.40, 2));
        $qty = (int) $r['qty'];
        $lines[] = ['tgl_layanan' => $r['tgl_layanan'] ?? null, 'kategori' => 'farmasi', 'item_code' => $r['kode'],
            'deskripsi' => $r['nama'],
            'qty' => $qty, 'tarif' => $calcTarif, 'subtotal' => $calcTarif * $qty];
    }

    return $lines;
}

/** Label kategori untuk tampilan (Dinamis EN/ID) */
function billing_kategori_label(string $k): string
{
    $key = 'common.billing_categories.' . strtolower($k);
    $trans = t($key);
    if ($trans !== $key) {
        return $trans;
    }

    return [
        'jasa_dokter'  => 'Jasa Dokter', 'tindakan' => 'Medical Service',
        'konsultasi'   => 'Konsultasi', 'laboratorium' => 'Laboratorium',
        'radiologi'    => 'Radiologi', 'diagnostik' => 'Diagnostik',
        'fisioterapi'  => 'Fisioterapi', 'farmasi' => 'Medicine',
        'administrasi' => 'Administrasi',
    ][$k] ?? ucfirst($k);
}

/** Grup struk & invoice mengikuti format receipt resmi (heading kapital) */
function struk_grup_label(string $kategori): string
{
    return [
        'consultasi'   => 'CONSULTATION',
        'konsultasi'   => 'CONSULTATION',
        'jasa_dokter'  => 'CONSULTATION',
        'laboratorium' => 'LABORATORY',
        'radiologi'    => 'RADIOLOGY',
        'diagnostik'   => 'DIAGNOSTIC',
        'fisioterapi'  => 'PHYSIOTHERAPY',
        'tindakan'     => 'MEDICAL SERVICE',
        'administrasi' => 'MEDICAL SERVICE',
        'farmasi'      => 'MEDICINE',
    ][$kategori] ?? 'LAINNYA';
}

/** Urutan tampil grup di struk & invoice */
function struk_grup_urutan(): array
{
    return ['CONSULTATION', 'LABORATORY', 'RADIOLOGY', 'DIAGNOSTIC', 'PHYSIOTHERAPY', 'MEDICAL SERVICE', 'MEDICINE', 'LAINNYA'];
}

/**
 * Pengelompokan item billing berdasarkan kategori header (CONSULTATION, LABORATORY, MEDICINE, dll)
 * @return array<string, array>
 */
function group_billing_items(array $items, string $kunjunganTgl = ''): array
{
    $filtered = array_values(array_filter($items, fn($item) => ($item['kategori'] ?? '') !== 'administrasi'));
    $groupOrder = struk_grup_urutan();
    $groupPriority = array_flip($groupOrder);

    $grouped = [];
    foreach ($filtered as $item) {
        $groupKey = struk_grup_label($item['kategori'] ?? '');
        $grouped[$groupKey][] = $item;
    }

    // Urutkan item dalam tiap grup berdasarkan tgl_layanan (ascending)
    foreach ($grouped as $groupKey => &$gItems) {
        usort($gItems, function($a, $b) use ($kunjunganTgl) {
            $tA = !empty($a['tgl_layanan']) ? strtotime($a['tgl_layanan']) : ($kunjunganTgl ? strtotime($kunjunganTgl) : 0);
            $tB = !empty($b['tgl_layanan']) ? strtotime($b['tgl_layanan']) : ($kunjunganTgl ? strtotime($kunjunganTgl) : 0);
            if ($tA === $tB) {
                return ($a['id'] ?? 0) <=> ($b['id'] ?? 0);
            }
            return $tA <=> $tB;
        });
    }
    unset($gItems);

    // Urutkan grup berdasarkan tanggal layanan terawal pada grup tersebut (ascending)
    // Jika tanggal terawal sama, gunakan prioritas urutan kategori default
    uksort($grouped, function($groupA, $groupB) use ($grouped, $kunjunganTgl, $groupPriority) {
        $firstA = $grouped[$groupA][0] ?? [];
        $firstB = $grouped[$groupB][0] ?? [];

        $tA = !empty($firstA['tgl_layanan']) ? strtotime($firstA['tgl_layanan']) : ($kunjunganTgl ? strtotime($kunjunganTgl) : 0);
        $tB = !empty($firstB['tgl_layanan']) ? strtotime($firstB['tgl_layanan']) : ($kunjunganTgl ? strtotime($kunjunganTgl) : 0);

        if ($tA !== $tB) {
            return $tA <=> $tB;
        }

        $prioA = $groupPriority[$groupA] ?? 999;
        $prioB = $groupPriority[$groupB] ?? 999;
        return $prioA <=> $prioB;
    });

    return $grouped;
}

/**
 * Pembulatan billing ke atas (misal step 500: 100.347 -> 100.500)
 */
function pembulatan_billing(float $amount, int $step = 500): float
{
    if ($amount <= 0 || $step <= 0) {
        return max(0, $amount);
    }
    return ceil($amount / $step) * $step;
}

