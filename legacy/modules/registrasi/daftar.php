<?php
require_once __DIR__ . '/../../includes/auth.php';
require_role('registrasi', 'admin', 'superadmin');

$user = current_user();

$id = (int) ($_GET['id'] ?? $_POST['id'] ?? 0);
$kunjungan = null;
if ($id) {
    $stmt = db()->prepare("SELECT * FROM kunjungan WHERE id = ?");
    $stmt->execute([$id]);
    $kunjungan = $stmt->fetch() ?: null;
    if ($kunjungan && in_array($kunjungan['status'], ['pembayaran', 'selesai', 'batal'], true)) {
        set_flash('danger', t('common.err_cannot_edit_processed'));
        legacy_redirect('modules/registrasi/index.php');
    }
}

$pageTitle = $kunjungan ? t('common.edit_visit_registration') : t('pages.new_registration');

$poli      = db()->query("SELECT id, kode, nama FROM poli WHERE status='aktif' ORDER BY nama")->fetchAll();
$dokter    = db()->query("SELECT id, nama, poli_id FROM dokter WHERE status='aktif' ORDER BY nama")->fetchAll();
$asuransi  = db()->query("SELECT id, nama FROM asuransi WHERE status='aktif' ORDER BY nama")->fetchAll();
$corporate = db()->query("SELECT id, nama FROM corporate WHERE status='aktif' ORDER BY nama")->fetchAll();

// Master data for service tables
$mTindakan   = db()->query("SELECT id,nama,tarif,harga_jual FROM tindakan WHERE status='aktif' ORDER BY nama")->fetchAll();
$mKonsultasi = db()->query("SELECT id,nama,tarif,harga_jual FROM konsultasi WHERE status='aktif' ORDER BY nama")->fetchAll();
$mObat       = db()->query("SELECT id,nama,harga_beli,harga_jual,stok FROM obat WHERE status='aktif' ORDER BY nama")->fetchAll();
$mLab        = db()->query("SELECT id,nama,nilai_rujukan,tarif,harga_jual FROM lab_pemeriksaan WHERE status='aktif' ORDER BY nama")->fetchAll();
$mRad        = db()->query("SELECT id,nama,tarif,harga_jual FROM rad_pemeriksaan WHERE status='aktif' ORDER BY nama")->fetchAll();
$mDiag       = db()->query("SELECT id,nama,tarif,harga_jual FROM diag_pemeriksaan WHERE status='aktif' ORDER BY nama")->fetchAll();
$mFisio      = db()->query("SELECT id,nama,tarif,harga_jual FROM fisio_pemeriksaan WHERE status='aktif' ORDER BY nama")->fetchAll();

// Pasien terpilih (dari ?pasien_id, POST pasien_id, atau dari data kunjungan jika mode edit)
$pasienId = $kunjungan ? (int)$kunjungan['pasien_id'] : (int) ($_GET['pasien_id'] ?? $_POST['pasien_id'] ?? 0);
$pasien = null;
if ($pasienId) {
    $stmt = db()->prepare("SELECT * FROM pasien WHERE id = ?");
    $stmt->execute([$pasienId]);
    $pasien = $stmt->fetch() ?: null;
}

// Existing items if in edit mode
$rmId = null;
$existingTind = [];
$existingKons = [];
$labOrderId = null;
$existingLab = [];
$radOrderId = null;
$existingRad = [];
$diagOrderId = null;
$existingDiag = [];
$fisioOrderId = null;
$existingFisio = [];
$resepId = null;
$existingObat = [];

$dataPerTgl = [];
$activeTglReq = trim($_GET['active_tgl'] ?? '');
$defaultTgl = (!empty($activeTglReq) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $activeTglReq)) ? $activeTglReq : ($kunjungan['tgl_kunjungan'] ?? date('Y-m-d'));

if ($kunjungan) {
    // 1. rm_tindakan
    $rmStmt = db()->prepare("SELECT id FROM rekam_medis WHERE kunjungan_id = ?");
    $rmStmt->execute([$id]);
    $rmId = (int) $rmStmt->fetchColumn();
    if ($rmId) {
        $trRows = db()->query("SELECT * FROM rm_tindakan WHERE rekam_medis_id = {$rmId}")->fetchAll();
        foreach ($trRows as $tr) {
            $dtKey = !empty($tr['tgl_layanan']) ? $tr['tgl_layanan'] : $defaultTgl;
            if (!isset($dataPerTgl[$dtKey])) {
                $dataPerTgl[$dtKey] = ['tind' => [], 'kons' => [], 'lab' => [], 'rad' => [], 'diag' => [], 'fisio' => [], 'obat' => []];
            }
            if (!empty($tr['tindakan_id'])) {
                $dataPerTgl[$dtKey]['tind'][] = ['tindakan_id' => (int)$tr['tindakan_id'], 'qty' => (int)$tr['qty']];
                if ($dtKey === $defaultTgl) $existingTind[] = $tr;
            } elseif (!empty($tr['konsultasi_id'])) {
                $dataPerTgl[$dtKey]['kons'][] = ['konsultasi_id' => (int)$tr['konsultasi_id'], 'qty' => (int)$tr['qty']];
                if ($dtKey === $defaultTgl) $existingKons[] = $tr;
            }
        }
    }

    // 2. lab_order_detail
    $labStmt = db()->prepare("SELECT id FROM lab_order WHERE kunjungan_id = ?");
    $labStmt->execute([$id]);
    $labOrderId = (int) $labStmt->fetchColumn();
    if ($labOrderId) {
        $lrRows = db()->query("SELECT * FROM lab_order_detail WHERE lab_order_id = {$labOrderId}")->fetchAll();
        foreach ($lrRows as $lr) {
            $dtKey = !empty($lr['tgl_layanan']) ? $lr['tgl_layanan'] : $defaultTgl;
            if (!isset($dataPerTgl[$dtKey])) {
                $dataPerTgl[$dtKey] = ['tind' => [], 'kons' => [], 'lab' => [], 'rad' => [], 'diag' => [], 'fisio' => [], 'obat' => []];
            }
            $dataPerTgl[$dtKey]['lab'][] = [
                'pemeriksaan_id' => (int)$lr['pemeriksaan_id'],
                'qty' => (int)$lr['qty'],
                'hasil' => $lr['hasil'] ?? ''
            ];
            if ($dtKey === $defaultTgl) $existingLab[] = $lr;
        }
    }

    // 3. rad_order_detail
    $radStmt = db()->prepare("SELECT id FROM rad_order WHERE kunjungan_id = ?");
    $radStmt->execute([$id]);
    $radOrderId = (int) $radStmt->fetchColumn();
    if ($radOrderId) {
        $rrRows = db()->query("SELECT * FROM rad_order_detail WHERE rad_order_id = {$radOrderId}")->fetchAll();
        foreach ($rrRows as $rr) {
            $dtKey = !empty($rr['tgl_layanan']) ? $rr['tgl_layanan'] : $defaultTgl;
            if (!isset($dataPerTgl[$dtKey])) {
                $dataPerTgl[$dtKey] = ['tind' => [], 'kons' => [], 'lab' => [], 'rad' => [], 'diag' => [], 'fisio' => [], 'obat' => []];
            }
            $dataPerTgl[$dtKey]['rad'][] = [
                'pemeriksaan_id' => (int)$rr['pemeriksaan_id'],
                'qty' => (int)$rr['qty'],
                'hasil' => $rr['hasil'] ?? ''
            ];
            if ($dtKey === $defaultTgl) $existingRad[] = $rr;
        }
    }

    // 4. diag_order_detail
    $diagStmt = db()->prepare("SELECT id FROM diag_order WHERE kunjungan_id = ?");
    $diagStmt->execute([$id]);
    $diagOrderId = (int) $diagStmt->fetchColumn();
    if ($diagOrderId) {
        $drRows = db()->query("SELECT * FROM diag_order_detail WHERE diag_order_id = {$diagOrderId}")->fetchAll();
        foreach ($drRows as $dr) {
            $dtKey = !empty($dr['tgl_layanan']) ? $dr['tgl_layanan'] : $defaultTgl;
            if (!isset($dataPerTgl[$dtKey])) {
                $dataPerTgl[$dtKey] = ['tind' => [], 'kons' => [], 'lab' => [], 'rad' => [], 'diag' => [], 'fisio' => [], 'obat' => []];
            }
            $dataPerTgl[$dtKey]['diag'][] = [
                'pemeriksaan_id' => (int)$dr['pemeriksaan_id'],
                'qty' => (int)$dr['qty'],
                'hasil' => $dr['hasil'] ?? ''
            ];
            if ($dtKey === $defaultTgl) $existingDiag[] = $dr;
        }
    }

    // 5. fisio_order_detail
    $fisioStmt = db()->prepare("SELECT id FROM fisio_order WHERE kunjungan_id = ?");
    $fisioStmt->execute([$id]);
    $fisioOrderId = (int) $fisioStmt->fetchColumn();
    if ($fisioOrderId) {
        $frRows = db()->query("SELECT * FROM fisio_order_detail WHERE fisio_order_id = {$fisioOrderId}")->fetchAll();
        foreach ($frRows as $fr) {
            $dtKey = !empty($fr['tgl_layanan']) ? $fr['tgl_layanan'] : $defaultTgl;
            if (!isset($dataPerTgl[$dtKey])) {
                $dataPerTgl[$dtKey] = ['tind' => [], 'kons' => [], 'lab' => [], 'rad' => [], 'diag' => [], 'fisio' => [], 'obat' => []];
            }
            $dataPerTgl[$dtKey]['fisio'][] = [
                'pemeriksaan_id' => (int)$fr['pemeriksaan_id'],
                'qty' => (int)$fr['qty'],
                'hasil' => $fr['hasil'] ?? ''
            ];
            if ($dtKey === $defaultTgl) $existingFisio[] = $fr;
        }
    }

    // 6. resep_detail
    $resepStmt = db()->prepare("SELECT id FROM resep WHERE kunjungan_id = ?");
    $resepStmt->execute([$id]);
    $resepId = (int) $resepStmt->fetchColumn();
    if ($resepId) {
        $eoRows = db()->query("SELECT * FROM resep_detail WHERE resep_id = {$resepId}")->fetchAll();
        foreach ($eoRows as $eo) {
            $dtKey = !empty($eo['tgl_layanan']) ? $eo['tgl_layanan'] : $defaultTgl;
            if (!isset($dataPerTgl[$dtKey])) {
                $dataPerTgl[$dtKey] = ['tind' => [], 'kons' => [], 'lab' => [], 'rad' => [], 'diag' => [], 'fisio' => [], 'obat' => []];
            }
            $dataPerTgl[$dtKey]['obat'][] = [
                'obat_id' => (int)$eo['obat_id'],
                'qty' => (int)$eo['qty'],
                'dosis' => $eo['dosis'] ?? '',
                'aturan_pakai' => $eo['aturan_pakai'] ?? ''
            ];
            if ($dtKey === $defaultTgl) $existingObat[] = $eo;
        }
    }
}
if (!isset($dataPerTgl[$defaultTgl])) {
    $dataPerTgl[$defaultTgl] = ['tind' => [], 'kons' => [], 'lab' => [], 'rad' => [], 'diag' => [], 'fisio' => [], 'obat' => []];
}

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    sim_csrf_verify();
    $poliId   = (int) ($_POST['poli_id'] ?? 0);
    $dokterId = (int) ($_POST['dokter_id'] ?? 0) ?: null;
    $jenisRegistrasi = $_POST['jenis_registrasi'] ?? 'rawat_jalan';
    if (!in_array($jenisRegistrasi, ['rawat_jalan', 'rawat_inap'], true)) {
        $jenisRegistrasi = 'rawat_jalan';
    }
    $tgl      = $_POST['tgl_kunjungan'] ?? ($kunjungan['tgl_kunjungan'] ?? date('Y-m-d'));
    $tglKeluar = null;
    $lamaRawat = 1;
    if ($jenisRegistrasi === 'rawat_inap') {
        $lamaRawat = max(1, (int) ($_POST['lama_rawat'] ?? 1));
        if (!empty($_POST['tgl_keluar'])) {
            $tglKeluar = $_POST['tgl_keluar'];
        } else {
            $tglKeluar = date('Y-m-d', strtotime($tgl . " + " . ($lamaRawat - 1) . " days"));
        }
    }
    $jenis    = $_POST['jenis_penjamin'] ?? 'umum';
    $keluhan  = trim($_POST['keluhan_awal'] ?? '');
    $asuransiId  = $jenis === 'asuransi' ? ((int) ($_POST['asuransi_id'] ?? 0) ?: null) : null;
    $corporateId = $jenis === 'corporate' ? ((int) ($_POST['corporate_id'] ?? 0) ?: null) : null;
    $noJaminan   = trim($_POST['no_jaminan'] ?? '') ?: null;

    if (!$pasien)  $errors[] = t('common.err_patient_not_selected');
    if (!$poliId)  $errors[] = t('common.err_clinic_required');

    if (!$errors) {
        try {
            db()->beginTransaction();

            if ($kunjungan) {
                // Mode Update Kunjungan
                $kunjunganId = $id;
                db()->prepare("UPDATE kunjungan SET poli_id=?, dokter_id=?, jenis_registrasi=?, tgl_kunjungan=?, keluhan_awal=? WHERE id=?")
                  ->execute([$poliId, $dokterId, $jenisRegistrasi, $tgl, $keluhan, $id]);
            } else {
                // Mode Tambah Kunjungan Baru
                $stmt = db()->prepare("SELECT COALESCE(MAX(no_antrian),0)+1 FROM kunjungan WHERE poli_id=? AND tgl_kunjungan=?");
                $stmt->execute([$poliId, $tgl]);
                $noAntrian = (int) $stmt->fetchColumn();
                $noKunjungan = generate_no('KJ', 'kunjungan', 'no_kunjungan');

                db()->prepare("INSERT INTO kunjungan (no_kunjungan, pasien_id, poli_id, dokter_id, jenis_registrasi, tgl_kunjungan, no_antrian, jenis_penjamin, asuransi_id, corporate_id, no_jaminan, status, keluhan_awal, user_id) VALUES (?,?,?,?,?,?,?, 'umum', NULL, NULL, NULL, 'billing', ?, ?)")
                  ->execute([$noKunjungan, $pasien['id'], $poliId, $dokterId, $jenisRegistrasi, $tgl, $noAntrian, $keluhan, $user['id']]);
                $kunjunganId = (int) db()->lastInsertId();
            }

            // --- Build Master Data Maps ---
            $mTindakanMap = []; foreach ($mTindakan as $t) { $hj=(float)($t['harga_jual']??0); $b=(float)($t['tarif']??0); $mTindakanMap[$t['id']] = ['nama' => $t['nama'], 'tarif' => $hj>0?$hj:round($b*1.40,2)]; }
            $mKonsultasiMap = []; foreach ($mKonsultasi as $k) { $hj=(float)($k['harga_jual']??0); $b=(float)($k['tarif']??0); $mKonsultasiMap[$k['id']] = ['nama' => $k['nama'], 'tarif' => $hj>0?$hj:round($b*1.40,2)]; }
            $mLabMap = []; foreach ($mLab as $l) $mLabMap[$l['id']] = $l;
            $mRadMap = []; foreach ($mRad as $r) $mRadMap[$r['id']] = $r;
            $mDiagMap = []; foreach ($mDiag as $d) $mDiagMap[$d['id']] = $d;
            $mFisioMap = []; foreach ($mFisio as $f) $mFisioMap[$f['id']] = $f;
            $mObatMap = []; foreach ($mObat as $o) $mObatMap[$o['id']] = $o;

            // --- Parse tgl_layanan_json payload ---
            $tglJsonRaw = $_POST['tgl_layanan_json'] ?? '';
            $tglData = json_decode($tglJsonRaw, true);
            if (!is_array($tglData) || empty($tglData)) {
                // Fallback from standard single-day POST fields
                $tglData = [
                    $tgl => [
                        'tind' => array_map(function($tid, $qty) { return ['tindakan_id' => (int)$tid, 'qty' => (int)$qty]; }, $_POST['tind_id'] ?? [], $_POST['tind_qty'] ?? []),
                        'kons' => array_map(function($kid, $qty) { return ['konsultasi_id' => (int)$kid, 'qty' => (int)$qty]; }, $_POST['kons_id'] ?? [], $_POST['kons_qty'] ?? []),
                        'lab'  => array_combine($_POST['lab_pick'] ?? [], array_map(function($pid) { return ['qty' => (int)($_POST['lab_qty'][$pid] ?? 1), 'hasil' => trim($_POST['lab_hasil'][$pid] ?? '')]; }, $_POST['lab_pick'] ?? [])),
                        'rad'  => array_combine($_POST['rad_pick'] ?? [], array_map(function($pid) { return ['qty' => (int)($_POST['rad_qty'][$pid] ?? 1), 'hasil' => trim($_POST['rad_hasil'][$pid] ?? '')]; }, $_POST['rad_pick'] ?? [])),
                        'diag' => array_combine($_POST['diag_pick'] ?? [], array_map(function($pid) { return ['qty' => (int)($_POST['diag_qty'][$pid] ?? 1), 'hasil' => trim($_POST['diag_hasil'][$pid] ?? '')]; }, $_POST['diag_pick'] ?? [])),
                        'fisio'=> array_combine($_POST['fisio_pick'] ?? [], array_map(function($pid) { return ['qty' => (int)($_POST['fisio_qty'][$pid] ?? 1), 'hasil' => trim($_POST['fisio_hasil'][$pid] ?? '')]; }, $_POST['fisio_pick'] ?? [])),
                        'obat' => array_map(function($oid, $qty, $dosis, $aturan) { return ['obat_id' => (int)$oid, 'qty' => (int)$qty, 'dosis' => trim($dosis ?? ''), 'aturan_pakai' => trim($aturan ?? '')]; }, $_POST['obat_id'] ?? [], $_POST['obat_qty'] ?? [], $_POST['obat_dosis'] ?? [], $_POST['obat_aturan'] ?? [])
                    ]
                ];
            }

            // Prepare/Reset Parent Orders
            if (!$rmId) {
                db()->prepare("INSERT INTO rekam_medis (kunjungan_id,dokter_id) VALUES (?,?)")->execute([$kunjunganId, $dokterId]);
                $rmId = (int) db()->lastInsertId();
            } else {
                db()->prepare("UPDATE rekam_medis SET dokter_id=? WHERE id=?")->execute([$dokterId, $rmId]);
                db()->prepare("DELETE FROM rm_tindakan WHERE rekam_medis_id=?")->execute([$rmId]);
            }

            if (!$labOrderId) {
                db()->prepare("INSERT INTO lab_order (kunjungan_id,status) VALUES (?, 'permintaan')")->execute([$kunjunganId]);
                $labOrderId = (int) db()->lastInsertId();
            } else {
                db()->prepare("DELETE FROM lab_order_detail WHERE lab_order_id=?")->execute([$labOrderId]);
            }

            if (!$radOrderId) {
                db()->prepare("INSERT INTO rad_order (kunjungan_id,status) VALUES (?, 'permintaan')")->execute([$kunjunganId]);
                $radOrderId = (int) db()->lastInsertId();
            } else {
                db()->prepare("DELETE FROM rad_order_detail WHERE rad_order_id=?")->execute([$radOrderId]);
            }

            if (!$diagOrderId) {
                db()->prepare("INSERT INTO diag_order (kunjungan_id,status) VALUES (?, 'permintaan')")->execute([$kunjunganId]);
                $diagOrderId = (int) db()->lastInsertId();
            } else {
                db()->prepare("DELETE FROM diag_order_detail WHERE diag_order_id=?")->execute([$diagOrderId]);
            }

            if (!$fisioOrderId) {
                db()->prepare("INSERT INTO fisio_order (kunjungan_id,status) VALUES (?, 'permintaan')")->execute([$kunjunganId]);
                $fisioOrderId = (int) db()->lastInsertId();
            } else {
                db()->prepare("DELETE FROM fisio_order_detail WHERE fisio_order_id=?")->execute([$fisioOrderId]);
            }

            if (!$resepId) {
                db()->prepare("INSERT INTO resep (kunjungan_id,dokter_id,status) VALUES (?,?,'baru')")->execute([$kunjunganId, $dokterId]);
                $resepId = (int) db()->lastInsertId();
            } else {
                db()->prepare("DELETE FROM resep_detail WHERE resep_id=?")->execute([$resepId]);
            }

            // Prepared Statements for Details
            $insTind  = db()->prepare("INSERT INTO rm_tindakan (rekam_medis_id, tgl_layanan, tindakan_id, nama_tindakan, qty, tarif, subtotal) VALUES (?,?,?,?,?,?,?)");
            $insKons  = db()->prepare("INSERT INTO rm_tindakan (rekam_medis_id, tgl_layanan, konsultasi_id, nama_tindakan, qty, tarif, subtotal) VALUES (?,?,?,?,?,?,?)");
            $insLab   = db()->prepare("INSERT INTO lab_order_detail (lab_order_id, tgl_layanan, pemeriksaan_id, hasil, nilai_rujukan, tarif, qty, subtotal) VALUES (?,?,?,?,?,?,?,?)");
            $insRad   = db()->prepare("INSERT INTO rad_order_detail (rad_order_id, tgl_layanan, pemeriksaan_id, hasil, tarif, qty, subtotal) VALUES (?,?,?,?,?,?,?)");
            $insDiag  = db()->prepare("INSERT INTO diag_order_detail (diag_order_id, tgl_layanan, pemeriksaan_id, hasil, tarif, qty, subtotal) VALUES (?,?,?,?,?,?,?)");
            $insFisio = db()->prepare("INSERT INTO fisio_order_detail (fisio_order_id, tgl_layanan, pemeriksaan_id, hasil, tarif, qty, subtotal) VALUES (?,?,?,?,?,?,?)");
            $insResep = db()->prepare("INSERT INTO resep_detail (resep_id, tgl_layanan, obat_id, qty, dosis, aturan_pakai, harga, subtotal) VALUES (?,?,?,?,?,?,?,?)");

            $recordedDates = [];

            foreach ($tglData as $dtKey => $dtContent) {
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dtKey)) continue;
                $hasItem = false;

                // Tindakan
                foreach ($dtContent['tind'] ?? [] as $titem) {
                    $tid = (int)($titem['tindakan_id'] ?? 0);
                    if (!$tid || !isset($mTindakanMap[$tid])) continue;
                    $qty = max(1, (int)($titem['qty'] ?? 1));
                    $tarif = (float)$mTindakanMap[$tid]['tarif'];
                    $insTind->execute([$rmId, $dtKey, $tid, $mTindakanMap[$tid]['nama'], $qty, $tarif, $tarif * $qty]);
                    $hasItem = true;
                }

                // Konsultasi
                foreach ($dtContent['kons'] ?? [] as $kitem) {
                    $kid = (int)($kitem['konsultasi_id'] ?? 0);
                    if (!$kid || !isset($mKonsultasiMap[$kid])) continue;
                    $qty = max(1, (int)($kitem['qty'] ?? 1));
                    $tarif = (float)$mKonsultasiMap[$kid]['tarif'];
                    $insKons->execute([$rmId, $dtKey, $kid, $mKonsultasiMap[$kid]['nama'], $qty, $tarif, $tarif * $qty]);
                    $hasItem = true;
                }

                // Lab
                foreach ($dtContent['lab'] ?? [] as $k => $litem) {
                    $pid = (int)($litem['pemeriksaan_id'] ?? ($litem['lab_id'] ?? (is_numeric($k) ? $k : 0)));
                    if (!$pid || !isset($mLabMap[$pid])) continue;
                    $qty = max(1, (int)($litem['qty'] ?? 1));
                    $hasil = trim($litem['hasil'] ?? '');
                    $hj = (float)($mLabMap[$pid]['harga_jual'] ?? 0);
                    $base = (float)($mLabMap[$pid]['tarif'] ?? 0);
                    $tarif = $hj > 0 ? $hj : round($base * 1.40, 2);
                    $insLab->execute([$labOrderId, $dtKey, $pid, ($hasil !== '' ? $hasil : null), $mLabMap[$pid]['nilai_rujukan'], $tarif, $qty, $tarif * $qty]);
                    $hasItem = true;
                }

                // Radiologi
                foreach ($dtContent['rad'] ?? [] as $k => $ritem) {
                    $pid = (int)($ritem['pemeriksaan_id'] ?? ($ritem['rad_id'] ?? (is_numeric($k) ? $k : 0)));
                    if (!$pid || !isset($mRadMap[$pid])) continue;
                    $qty = max(1, (int)($ritem['qty'] ?? 1));
                    $hasil = trim($ritem['hasil'] ?? '');
                    $hj = (float)($mRadMap[$pid]['harga_jual'] ?? 0);
                    $base = (float)($mRadMap[$pid]['tarif'] ?? 0);
                    $tarif = $hj > 0 ? $hj : round($base * 1.40, 2);
                    $insRad->execute([$radOrderId, $dtKey, $pid, ($hasil !== '' ? $hasil : null), $tarif, $qty, $tarif * $qty]);
                    $hasItem = true;
                }

                // Diagnostik
                foreach ($dtContent['diag'] ?? [] as $k => $ditem) {
                    $pid = (int)($ditem['pemeriksaan_id'] ?? ($ditem['diag_id'] ?? (is_numeric($k) ? $k : 0)));
                    if (!$pid || !isset($mDiagMap[$pid])) continue;
                    $qty = max(1, (int)($ditem['qty'] ?? 1));
                    $hasil = trim($ditem['hasil'] ?? '');
                    $hj = (float)($mDiagMap[$pid]['harga_jual'] ?? 0);
                    $base = (float)($mDiagMap[$pid]['tarif'] ?? 0);
                    $tarif = $hj > 0 ? $hj : round($base * 1.40, 2);
                    $insDiag->execute([$diagOrderId, $dtKey, $pid, ($hasil !== '' ? $hasil : null), $tarif, $qty, $tarif * $qty]);
                    $hasItem = true;
                }

                // Fisioterapi
                foreach ($dtContent['fisio'] ?? [] as $k => $fitem) {
                    $pid = (int)($fitem['pemeriksaan_id'] ?? ($fitem['fisio_id'] ?? (is_numeric($k) ? $k : 0)));
                    if (!$pid || !isset($mFisioMap[$pid])) continue;
                    $qty = max(1, (int)($fitem['qty'] ?? 1));
                    $hasil = trim($fitem['hasil'] ?? '');
                    $hj = (float)($mFisioMap[$pid]['harga_jual'] ?? 0);
                    $base = (float)($mFisioMap[$pid]['tarif'] ?? 0);
                    $tarif = $hj > 0 ? $hj : round($base * 1.40, 2);
                    $insFisio->execute([$fisioOrderId, $dtKey, $pid, ($hasil !== '' ? $hasil : null), $tarif, $qty, $tarif * $qty]);
                    $hasItem = true;
                }

                // Resep
                foreach ($dtContent['obat'] ?? [] as $oitem) {
                    $oid = (int)($oitem['obat_id'] ?? 0);
                    if (!$oid || !isset($mObatMap[$oid])) continue;
                    $qty = max(1, (int)($oitem['qty'] ?? 1));
                    $dosis = trim($oitem['dosis'] ?? '');
                    $aturan = trim($oitem['aturan_pakai'] ?? '');
                    $hj = (float)($mObatMap[$oid]['harga_jual'] ?? 0);
                    $base = (float)($mObatMap[$oid]['harga_beli'] ?? 0);
                    $harga = $hj > 0 ? $hj : round($base * 1.40, 2);
                    $insResep->execute([$resepId, $dtKey, $oid, $qty, $dosis ?: null, $aturan ?: null, $harga, $harga * $qty]);
                    $hasItem = true;
                }

                if ($hasItem) {
                    $recordedDates[] = $dtKey;
                }
            }

            // Auto calculate tgl_keluar and lama_rawat
            if ($jenisRegistrasi === 'rawat_inap') {
                if ($recordedDates) {
                    $minDate = min($recordedDates);
                    $maxDate = max($recordedDates);
                    $tglKeluar = $maxDate;
                    $diffSecs = strtotime($maxDate) - strtotime($minDate);
                    $lamaRawat = max(1, (int)round($diffSecs / 86400) + 1);
                } else {
                    $tglKeluar = $tgl;
                    $lamaRawat = 1;
                }
            } else {
                $tglKeluar = null;
                $lamaRawat = 1;
            }

            db()->prepare("UPDATE kunjungan SET tgl_keluar=?, lama_rawat=? WHERE id=?")->execute([$tglKeluar, $lamaRawat, $kunjunganId]);

            db()->commit();
            if ($kunjungan) {
                set_flash('success', t('common.visit_updated_flash', ['no' => $kunjungan['no_kunjungan']]));
            } else {
                set_flash('success', t('common.visit_registered_flash', ['no' => $noKunjungan, 'queue' => str_pad((string) $noAntrian, 3, '0', STR_PAD_LEFT)]));
            }
            $activeTgl = trim($_POST['active_tgl_layanan'] ?? '');
            $redirectUrl = 'modules/registrasi/daftar.php?id=' . $kunjunganId;
            if (!empty($activeTgl) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $activeTgl)) {
                $redirectUrl .= '&active_tgl=' . urlencode($activeTgl);
            }
            legacy_redirect($redirectUrl);
        } catch (Throwable $ex) {
            if (db()->inTransaction()) db()->rollBack();
            $errors[] = t('common.err_save_visit', ['msg' => $ex->getMessage()]);
        }
    }
}

require_once __DIR__ . '/../../includes/header.php';
?>
<div class="page-toolbar">
  <div>
    <div class="pt-title"><?= $kunjungan ? e(t('common.edit_visit_registration')) . ' — ' . e($kunjungan['no_kunjungan']) : e(t('pages.new_registration')) ?></div>
    <div class="pt-sub"><?= $kunjungan ? e(t('common.queue_no_label')) . ': <b>' . e($kunjungan['no_antrian']) . '</b> &middot; ' . e(t('app.patient')) . ': <b>' . e($pasien['nama'] ?? '') . '</b> (' . e($pasien['no_mr'] ?? '') . ')' : e(t('common.registration_sub')) ?></div>
  </div>
  <div class="pt-actions">
    <a class="btn-back" href="<?= legacy_url('modules/registrasi/index.php') ?>"><?= app_icon('chevron') ?> <?= e(t('common.back_to_list')) ?></a>
  </div>
</div>

<?php if ($errors): ?>
  <div class="alert alert-danger" style="margin-top:14px"><?= implode('<br>', array_map('e', $errors)) ?></div>
<?php endif; ?>

<!-- STEP 1: Pilih Pasien -->
<div class="card" style="margin-top:14px">
  <div class="step-head">
    <div class="step-num">1</div>
    <div><div class="st-title"><?= e(t('common.select_patient_step')) ?></div><div class="st-sub"><?= e(t('common.select_patient_sub')) ?></div></div>
  </div>
  <?php if ($pasien): ?>
    <div class="patient-box">
      <div class="pname">
        <span class="av"><?= strtoupper(substr($pasien['nama'], 0, 1)) ?></span>
        <?= e($pasien['nama']) ?>
      </div>
      <div class="patient-meta">
        <?= t('common.mr_no') ?>: <b><?= e($pasien['no_mr']) ?></b><br>
        <?= $pasien['jenis_kelamin'] === 'L' ? e(t('common.male')) : e(t('common.female')) ?> &middot;
        <?= tgl_id($pasien['tgl_lahir']) ?>
        <?php if (!empty($pasien['alergi'])): ?>
          <br><span class="badge badge-red"><?= e(t('common.allergy')) ?>: <?= e($pasien['alergi']) ?></span>
        <?php endif; ?>
      </div>
      <?php if (!$kunjungan): ?>
        <a class="btn btn-sm btn-light" style="margin-top:12px" href="<?= legacy_url('modules/registrasi/daftar.php') ?>"><?= app_icon('search') ?> <?= e(t('common.change_patient')) ?></a>
      <?php endif; ?>
    </div>
  <?php else: ?>
    <form method="get" class="search-inline">
      <input type="text" name="q" value="<?= e($_GET['q'] ?? '') ?>" class="form-control" placeholder="<?= e(t('common.search_patient_placeholder')) ?>" autofocus>
      <button class="btn" type="submit"><?= app_icon('search') ?></button>
    </form>
    <?php
      $q = trim($_GET['q'] ?? '');
      if ($q !== '') {
          $s = db()->prepare("SELECT id, no_mr, nama FROM pasien WHERE no_mr LIKE ? OR nama LIKE ? OR nik LIKE ? ORDER BY nama LIMIT 20");
          $like = "%$q%"; $s->execute([$like, $like, $like]);
          $hasil = $s->fetchAll();
          if (!$hasil) {
              echo '<div class="result-empty">'
                 . '<p>' . e(t('common.patient_not_found')) . '</p>'
                 . '<a class="btn btn-sm" href="' . legacy_url('modules/registrasi/pasien_form.php') . '">'
                 . app_icon('plus') . ' ' . e(t('common.add_new_patient'))
                 . '</a></div>';
          }
          foreach ($hasil as $h) {
              echo '<a class="result-item" href="' . legacy_url('modules/registrasi/daftar.php?pasien_id=' . $h['id']) . '">'
                 . '<span class="av">' . strtoupper(substr($h['nama'], 0, 1)) . '</span>'
                 . '<span><span class="ri-name">' . e($h['nama']) . '</span>'
                 . '<span class="ri-meta">' . e($h['no_mr']) . '</span></span></a>';
          }
      } else {
          echo '<p class="result-empty">' . e(t('common.search_patient_hint')) . '</p>';
      }
    ?>
  <?php endif; ?>
</div>

<!-- STEP 2 onwards: full form (disabled when no patient) -->
<form method="post" id="formDaftar" <?= $pasien ? '' : 'style="opacity:.5;pointer-events:none"' ?> onsubmit="prepareFormSubmit()">
  <?= sim_csrf_field() ?>
  <input type="hidden" name="id" value="<?= $id ?>">
  <input type="hidden" name="pasien_id" value="<?= (int) ($pasien['id'] ?? 0) ?>">
  <input type="hidden" name="tgl_layanan_json" id="tglLayananJson">
  <input type="hidden" name="active_tgl_layanan" id="activeTglLayanan">

  <!-- Poli, Dokter & Penjamin -->
  <div class="card" style="margin-top:14px">
    <div class="step-head" style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="step-num">2</div>
        <div><div class="st-title"><?= e(t('common.visit_clinic_step')) ?></div><div class="st-sub"><?= e(t('common.visit_clinic_step_sub')) ?></div></div>
      </div>
      <div id="tglLayananHeader" style="display:none;align-items:center;gap:8px">
        <label style="margin:0;font-weight:600;font-size:13px;color:var(--text);white-space:nowrap"><?= e(t('common.service_date')) ?>:</label>
        <input type="date" id="tglLayananSelect" class="form-control" style="width:160px;padding:4px 8px" value="<?= e($defaultTgl) ?>" onchange="onTglLayananChange(this.value)">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label><?= e(t('common.visit_date')) ?></label>
        <input type="date" name="tgl_kunjungan" class="form-control" value="<?= e($kunjungan['tgl_kunjungan'] ?? date('Y-m-d')) ?>" onchange="onTglKunjunganChange(this.value)">
      </div>
      <div class="form-group">
        <label><?= e(t('common.target_clinic')) ?> *</label>
        <select name="poli_id" id="poliSelect" class="form-control" required onchange="filterDokter()">
          <option value=""><?= e(t('common.select_clinic')) ?></option>
          <?php foreach ($poli as $po): ?>
            <option value="<?= $po['id'] ?>" <?= $kunjungan && (int)$kunjungan['poli_id'] === (int)$po['id'] ? 'selected' : '' ?>><?= e($po['nama']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label><?= e(t('common.doctor')) ?></label>
        <select name="dokter_id" id="dokterSelect" class="form-control">
          <option value=""><?= e(t('common.select_doctor_optional')) ?></option>
          <?php foreach ($dokter as $d): ?>
            <option value="<?= $d['id'] ?>" data-poli="<?= (int) $d['poli_id'] ?>" <?= $kunjungan && (int)$kunjungan['dokter_id'] === (int)$d['id'] ? 'selected' : '' ?>><?= e($d['nama']) ?></option>
          <?php endforeach; ?>
        </select>
        <small id="dokterHint" style="color:var(--muted);font-size:12.5px;display:none"><?= e(t('common.select_clinic_first_hint')) ?></small>
      </div>
      <div class="form-group">
        <label><?= e(t('common.registration_type')) ?></label>
        <select name="jenis_registrasi" id="jenis_registrasi" class="form-control" onchange="toggleRawatInapPanel()">
          <option value="rawat_jalan" <?= $kunjungan && $kunjungan['jenis_registrasi'] === 'rawat_jalan' ? 'selected' : '' ?>><?= e(t('common.outpatient')) ?></option>
          <option value="rawat_inap" <?= $kunjungan && $kunjungan['jenis_registrasi'] === 'rawat_inap' ? 'selected' : '' ?>><?= e(t('common.inpatient')) ?></option>
        </select>
      </div>
    </div>

    <div class="form-group" style="margin-top:14px">
      <label><?= e(t('common.initial_complaint')) ?></label>
      <textarea name="keluhan_awal" class="form-control" rows="2" placeholder="<?= e(t('common.complaint_placeholder')) ?>"><?= e($kunjungan['keluhan_awal'] ?? '') ?></textarea>
    </div>
  </div>

  <!-- Medical Service & Konsultasi -->
  <div class="form-row" style="margin-top:14px">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3>Medical Service</h3>
        <button type="button" class="btn btn-sm" onclick="addTind()"><?= app_icon('plus') ?> <?= e(t('common.add_medical_service')) ?></button>
      </div>
      <table style="width:100%"><thead><tr><th>Medical Service</th><th style="width:110px;text-align:center">Qty</th><th style="width:36px"></th></tr></thead>
        <tbody id="tindBody">
          <?php foreach ($existingTind as $et): ?>
            <tr>
              <td>
                <select class="form-control searchable-select" name="tind_id[]">
                  <?php foreach ($mTindakan as $m): ?>
                    <option value="<?= $m['id'] ?>" <?= (int)$et['tindakan_id'] === (int)$m['id'] ? 'selected' : '' ?>><?= e($m['nama']) ?> — <?= rupiah(($m['harga_jual'] ?? 0) > 0 ? $m['harga_jual'] : round($m['tarif'] * 1.40, 2)) ?></option>
                  <?php endforeach; ?>
                </select>
              </td>
              <td><input type="number" min="1" class="form-control" style="width:75px;text-align:center;padding:6px 4px;margin:0 auto;" name="tind_qty[]" value="<?= (int)$et['qty'] ?>"></td>
              <td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3><?= e(t('common.consultation')) ?></h3>
        <button type="button" class="btn btn-sm" onclick="addKons()"><?= app_icon('plus') ?> <?= e(t('common.add_consultation')) ?></button>
      </div>
      <table style="width:100%"><thead><tr><th><?= e(t('common.consultation')) ?></th><th style="width:110px;text-align:center">Qty</th><th style="width:36px"></th></tr></thead>
        <tbody id="konsBody">
          <?php foreach ($existingKons as $ek): ?>
            <tr>
              <td>
                <select class="form-control searchable-select" name="kons_id[]">
                  <?php foreach ($mKonsultasi as $m): ?>
                    <option value="<?= $m['id'] ?>" <?= (int)$ek['konsultasi_id'] === (int)$m['id'] ? 'selected' : '' ?>><?= e($m['nama']) ?> — <?= rupiah(($m['harga_jual'] ?? 0) > 0 ? $m['harga_jual'] : round($m['tarif'] * 1.40, 2)) ?></option>
                  <?php endforeach; ?>
                </select>
              </td>
              <td><input type="number" min="1" class="form-control" style="width:75px;text-align:center;padding:6px 4px;margin:0 auto;" name="kons_qty[]" value="<?= (int)$ek['qty'] ?>"></td>
              <td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Lab & Radiologi -->
  <div class="form-row" style="margin-top:14px">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3><?= e(t('common.lab_request')) ?></h3>
        <button type="button" class="btn btn-sm" onclick="addLab()"><?= app_icon('plus') ?> <?= e(t('common.add_lab')) ?></button>
      </div>
      <table style="width:100%"><thead><tr><th>Pemeriksaan Lab</th><th style="width:55px;text-align:center">Qty</th><th style="width:200px">Hasil / Catatan</th><th style="width:36px"></th></tr></thead>
        <tbody id="labBody">
          <?php foreach ($existingLab as $el): ?>
            <tr>
              <td>
                <select class="form-control searchable-select" name="lab_id[]">
                  <?php foreach ($mLab as $m): ?>
                    <option value="<?= $m['id'] ?>" <?= (int)$el['pemeriksaan_id'] === (int)$m['id'] ? 'selected' : '' ?>><?= e($m['nama']) ?> <?= !empty($m['nilai_rujukan']) ? '('.e($m['nilai_rujukan']).')' : '' ?></option>
                  <?php endforeach; ?>
                </select>
              </td>
              <td><input type="number" min="1" class="form-control" style="width:50px;text-align:center;padding:6px 2px;" name="lab_qty[]" value="<?= (int)($el['qty'] ?? 1) ?>"></td>
              <td><input type="text" class="form-control" style="width:100%" name="lab_hasil[]" value="<?= e($el['hasil'] ?? '') ?>" placeholder="<?= e(t('common.result_placeholder')) ?>"></td>
              <td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3><?= e(t('common.rad_request')) ?></h3>
        <button type="button" class="btn btn-sm" onclick="addRad()"><?= app_icon('plus') ?> <?= e(t('common.add_rad')) ?></button>
      </div>
      <table style="width:100%"><thead><tr><th>Pemeriksaan Radiologi</th><th style="width:55px;text-align:center">Qty</th><th style="width:200px">Hasil / Catatan</th><th style="width:36px"></th></tr></thead>
        <tbody id="radBody">
          <?php foreach ($existingRad as $er): ?>
            <tr>
              <td>
                <select class="form-control searchable-select" name="rad_id[]">
                  <?php foreach ($mRad as $m): ?>
                    <option value="<?= $m['id'] ?>" <?= (int)$er['pemeriksaan_id'] === (int)$m['id'] ? 'selected' : '' ?>><?= e($m['nama']) ?></option>
                  <?php endforeach; ?>
                </select>
              </td>
              <td><input type="number" min="1" class="form-control" style="width:50px;text-align:center;padding:6px 2px;" name="rad_qty[]" value="<?= (int)($er['qty'] ?? 1) ?>"></td>
              <td><input type="text" class="form-control" style="width:100%" name="rad_hasil[]" value="<?= e($er['hasil'] ?? '') ?>" placeholder="<?= e(t('common.result_placeholder')) ?>"></td>
              <td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Diagnostik & Fisioterapi -->
  <div class="form-row" style="margin-top:14px">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3><?= e(t('common.diag_request')) ?></h3>
        <button type="button" class="btn btn-sm" onclick="addDiag()"><?= app_icon('plus') ?> <?= e(t('common.add_diag')) ?></button>
      </div>
      <table style="width:100%"><thead><tr><th>Pemeriksaan Diagnostik</th><th style="width:55px;text-align:center">Qty</th><th style="width:200px">Hasil / Catatan</th><th style="width:36px"></th></tr></thead>
        <tbody id="diagBody">
          <?php foreach ($existingDiag as $ed): ?>
            <tr>
              <td>
                <select class="form-control searchable-select" name="diag_id[]">
                  <?php foreach ($mDiag as $m): ?>
                    <option value="<?= $m['id'] ?>" <?= (int)$ed['pemeriksaan_id'] === (int)$m['id'] ? 'selected' : '' ?>><?= e($m['nama']) ?></option>
                  <?php endforeach; ?>
                </select>
              </td>
              <td><input type="number" min="1" class="form-control" style="width:50px;text-align:center;padding:6px 2px;" name="diag_qty[]" value="<?= (int)($ed['qty'] ?? 1) ?>"></td>
              <td><input type="text" class="form-control" style="width:100%" name="diag_hasil[]" value="<?= e($ed['hasil'] ?? '') ?>" placeholder="<?= e(t('common.result_placeholder')) ?>"></td>
              <td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3><?= e(t('common.fisio_request')) ?></h3>
        <button type="button" class="btn btn-sm" onclick="addFisio()"><?= app_icon('plus') ?> <?= e(t('common.add_fisio')) ?></button>
      </div>
      <table style="width:100%"><thead><tr><th>Pemeriksaan Fisioterapi</th><th style="width:55px;text-align:center">Qty</th><th style="width:200px">Hasil / Catatan</th><th style="width:36px"></th></tr></thead>
        <tbody id="fisioBody">
          <?php foreach ($existingFisio as $ef): ?>
            <tr>
              <td>
                <select class="form-control searchable-select" name="fisio_id[]">
                  <?php foreach ($mFisio as $m): ?>
                    <option value="<?= $m['id'] ?>" <?= (int)$ef['pemeriksaan_id'] === (int)$m['id'] ? 'selected' : '' ?>><?= e($m['nama']) ?></option>
                  <?php endforeach; ?>
                </select>
              </td>
              <td><input type="number" min="1" class="form-control" style="width:50px;text-align:center;padding:6px 2px;" name="fisio_qty[]" value="<?= (int)($ef['qty'] ?? 1) ?>"></td>
              <td><input type="text" class="form-control" style="width:100%" name="fisio_hasil[]" value="<?= e($ef['hasil'] ?? '') ?>" placeholder="<?= e(t('common.result_placeholder')) ?>"></td>
              <td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Resep Obat -->
  <div class="card" style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3><?= e(t('common.prescription')) ?></h3>
      <button type="button" class="btn btn-sm" onclick="addObat()"><?= app_icon('plus') ?> <?= e(t('common.add_medicine')) ?></button>
    </div>
    <table style="width:100%"><thead><tr><th><?= e(t('common.medicine')) ?></th><th style="width:100px">Qty</th><th style="width:110px"><?= e(t('common.dose')) ?></th><th><?= e(t('common.usage_instructions')) ?></th><th style="width:50px"></th></tr></thead>
      <tbody id="obatBody">
        <?php foreach ($existingObat as $eo): ?>
          <tr>
            <td>
              <select class="form-control searchable-select" name="obat_id[]">
                <?php foreach ($mObat as $m): ?>
                  <option value="<?= $m['id'] ?>" <?= (int)$eo['obat_id'] === (int)$m['id'] ? 'selected' : '' ?>><?= e($m['nama']) ?> (<?= e(t('common.stock_label')) ?> <?= (int)$m['stok'] ?>)</option>
                <?php endforeach; ?>
              </select>
            </td>
            <td><input type="number" min="1" class="form-control" name="obat_qty[]" value="<?= (int)$eo['qty'] ?>"></td>
            <td><input class="form-control" name="obat_dosis[]" value="<?= e($eo['dosis'] ?? '') ?>" placeholder="3x1"></td>
            <td><input class="form-control" name="obat_aturan[]" value="<?= e($eo['aturan_pakai'] ?? '') ?>" placeholder="<?= e(t('common.after_meal_placeholder')) ?>"></td>
            <td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

  <!-- Tombol Simpan -->
  <div style="margin:24px 0 48px;text-align:right">
    <button type="submit" class="btn" style="min-width:160px;font-size:1rem"><?= app_icon('save') ?> <?= $kunjungan ? e(t('common.save_changes')) : e(t('common.save')) ?></button>
  </div>
</form>

<style>
.search-select-wrap {
  position: relative;
  width: 100%;
}
.search-select-input {
  width: 100%;
  padding-right: 28px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  cursor: text;
}
.search-select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1050;
  max-height: 200px;
  overflow-y: auto;
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 8px;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
  margin-top: 4px;
  display: none;
}
.search-select-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color, #1e293b);
  transition: background 0.12s ease;
}
.search-select-item:hover, .search-select-item.active {
  background: var(--primary-light, #e0f2fe);
  color: var(--primary-color, #0284c7);
  font-weight: 500;
}
.search-select-empty {
  padding: 8px 12px;
  font-size: 12.5px;
  color: var(--muted-color, #64748b);
  font-style: italic;
}
</style>

<script>
var SIM_REG_LANG = <?= json_encode(['selectDoctor' => t('common.select_doctor_optional'), 'noDoctor' => t('common.no_doctor_for_clinic')], JSON_UNESCAPED_UNICODE) ?>;
var optTind  = `<option value="" selected></option>` + `<?php foreach ($mTindakan as $m): ?><option value="<?= $m['id'] ?>"><?= e($m['nama']) ?> — <?= rupiah(($m['harga_jual'] ?? 0) > 0 ? $m['harga_jual'] : round($m['tarif'] * 1.40, 2)) ?></option><?php endforeach; ?>`;
var optKons  = `<option value="" selected></option>` + `<?php foreach ($mKonsultasi as $m): ?><option value="<?= $m['id'] ?>"><?= e($m['nama']) ?> — <?= rupiah(($m['harga_jual'] ?? 0) > 0 ? $m['harga_jual'] : round($m['tarif'] * 1.40, 2)) ?></option><?php endforeach; ?>`;
var optLab   = `<option value="" selected></option>` + `<?php foreach ($mLab as $m): ?><option value="<?= $m['id'] ?>"><?= e($m['nama']) ?> <?= !empty($m['nilai_rujukan']) ? '('.e($m['nilai_rujukan']).')' : '' ?></option><?php endforeach; ?>`;
var optRad   = `<option value="" selected></option>` + `<?php foreach ($mRad as $m): ?><option value="<?= $m['id'] ?>"><?= e($m['nama']) ?></option><?php endforeach; ?>`;
var optDiag  = `<option value="" selected></option>` + `<?php foreach ($mDiag as $m): ?><option value="<?= $m['id'] ?>"><?= e($m['nama']) ?></option><?php endforeach; ?>`;
var optFisio = `<option value="" selected></option>` + `<?php foreach ($mFisio as $m): ?><option value="<?= $m['id'] ?>"><?= e($m['nama']) ?></option><?php endforeach; ?>`;
var optObat  = `<option value="" selected></option>` + `<?php foreach ($mObat as $m): ?><option value="<?= $m['id'] ?>"><?= e($m['nama']) ?> (<?= e(t('common.stock_label')) ?> <?= (int)$m['stok'] ?>)</option><?php endforeach; ?>`;

function makeSearchableSelect(select) {
  if (!select) return;
  if (select.dataset.searchableInited) {
    updateSearchableSelect(select);
    return;
  }
  select.dataset.searchableInited = '1';
  select.style.display = 'none';

  var wrap = document.createElement('div');
  wrap.className = 'search-select-wrap';

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control search-select-input';
  input.placeholder = 'Ketik untuk mencari...';
  input.autocomplete = 'off';

  var dropdown = document.createElement('div');
  dropdown.className = 'search-select-dropdown';

  function populateDropdown(query) {
    dropdown.innerHTML = '';
    query = (query || '').toLowerCase().trim();
    var matchCount = 0;
    Array.prototype.forEach.call(select.options, function(opt) {
      var text = opt.text || '';
      var val = opt.value;
      if (!val) return;
      if (query && text.toLowerCase().indexOf(query) === -1) return;

      matchCount++;
      var item = document.createElement('div');
      item.className = 'search-select-item' + (val === select.value ? ' active' : '');
      item.textContent = text;
      item.addEventListener('mousedown', function(e) {
        e.preventDefault();
        select.value = val;
        input.value = text;
        dropdown.style.display = 'none';
        select.dispatchEvent(new Event('change'));
      });
      dropdown.appendChild(item);
    });

    if (matchCount === 0) {
      var empty = document.createElement('div');
      empty.className = 'search-select-empty';
      empty.textContent = 'Tidak ada hasil';
      dropdown.appendChild(empty);
    }
  }

  function syncInputFromSelect() {
    var selectedOpt = select.options[select.selectedIndex];
    input.value = (selectedOpt && selectedOpt.value) ? selectedOpt.text : '';
  }

  syncInputFromSelect();

  input.addEventListener('focus', function() {
    populateDropdown('');
    dropdown.style.display = 'block';
    if (input.value) input.select();
  });

  input.addEventListener('input', function() {
    populateDropdown(input.value);
    dropdown.style.display = 'block';
  });

  input.addEventListener('blur', function() {
    setTimeout(function() {
      dropdown.style.display = 'none';
      syncInputFromSelect();
    }, 200);
  });

  wrap.appendChild(input);
  wrap.appendChild(dropdown);
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
}

function updateSearchableSelect(select) {
  if (!select) return;
  if (!select.dataset.searchableInited) {
    makeSearchableSelect(select);
    return;
  }
  var wrap = select.closest('.search-select-wrap');
  if (wrap) {
    var input = wrap.querySelector('.search-select-input');
    var selectedOpt = select.options[select.selectedIndex];
    if (input) input.value = (selectedOpt && selectedOpt.value) ? selectedOpt.text : '';
  }
}

function initSearchableSelects(container) {
  var root = container || document;
  root.querySelectorAll('.searchable-select').forEach(function(s) {
    makeSearchableSelect(s);
  });
}

var _dokterAll = (function () {
  var sel = document.getElementById('dokterSelect'), arr = [];
  if (!sel) return [];
  Array.prototype.forEach.call(sel.options, function (o) {
    if (o.value) arr.push({ id: o.value, nama: o.text, poli: o.getAttribute('data-poli') });
  });
  return arr;
})();
function filterDokter() {
  var poliSel = document.getElementById('poliSelect');
  var sel  = document.getElementById('dokterSelect');
  var hint = document.getElementById('dokterHint');
  if (!sel || !poliSel) return;
  var poli = poliSel.value;
  var prev = sel.value;
  sel.innerHTML = '<option value="">' + SIM_REG_LANG.selectDoctor + '</option>';
  var list = poli ? _dokterAll.filter(function (d) { return d.poli === poli; }) : _dokterAll;
  list.forEach(function (d) {
    var o = document.createElement('option');
    o.value = d.id; o.text = d.nama; o.setAttribute('data-poli', d.poli);
    if (d.id === prev) o.selected = true;
    sel.appendChild(o);
  });
  if (prev && sel.querySelector('option[value="' + prev + '"]')) sel.value = prev;
  else if (poli && list.length === 1) sel.value = list[0].id;
  if (hint) {
    hint.style.display = (poli && list.length === 0) ? '' : 'none';
    if (poli && list.length === 0) hint.textContent = SIM_REG_LANG.noDoctor;
  }
}

function delRow(btn){ var tr = btn.closest('tr'); if (tr) tr.remove(); }
function addTind(){
  var tb = document.getElementById('tindBody');
  tb.insertAdjacentHTML('beforeend',
    `<tr><td><select class="form-control searchable-select" name="tind_id[]">${optTind}</select></td>`+
    `<td><input type="number" min="1" class="form-control" style="width:75px;text-align:center;padding:6px 4px;margin:0 auto;" name="tind_qty[]" value="1"></td>`+
    `<td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td></tr>`);
  initSearchableSelects(tb.lastElementChild);
}
function addKons(){
  var tb = document.getElementById('konsBody');
  tb.insertAdjacentHTML('beforeend',
    `<tr><td><select class="form-control searchable-select" name="kons_id[]">${optKons}</select></td>`+
    `<td><input type="number" min="1" class="form-control" style="width:75px;text-align:center;padding:6px 4px;margin:0 auto;" name="kons_qty[]" value="1"></td>`+
    `<td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td></tr>`);
  initSearchableSelects(tb.lastElementChild);
}
function addLab(){
  var tb = document.getElementById('labBody');
  tb.insertAdjacentHTML('beforeend',
    `<tr><td><select class="form-control searchable-select" name="lab_id[]">${optLab}</select></td>`+
    `<td><input type="number" min="1" class="form-control" style="width:50px;text-align:center;padding:6px 2px;" name="lab_qty[]" value="1"></td>`+
    `<td><input type="text" class="form-control" style="width:100%" name="lab_hasil[]" placeholder="<?= e(t('common.result_placeholder')) ?>"></td>`+
    `<td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td></tr>`);
  initSearchableSelects(tb.lastElementChild);
}
function addRad(){
  var tb = document.getElementById('radBody');
  tb.insertAdjacentHTML('beforeend',
    `<tr><td><select class="form-control searchable-select" name="rad_id[]">${optRad}</select></td>`+
    `<td><input type="number" min="1" class="form-control" style="width:50px;text-align:center;padding:6px 2px;" name="rad_qty[]" value="1"></td>`+
    `<td><input type="text" class="form-control" style="width:100%" name="rad_hasil[]" placeholder="<?= e(t('common.result_placeholder')) ?>"></td>`+
    `<td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td></tr>`);
  initSearchableSelects(tb.lastElementChild);
}
function addDiag(){
  var tb = document.getElementById('diagBody');
  tb.insertAdjacentHTML('beforeend',
    `<tr><td><select class="form-control searchable-select" name="diag_id[]">${optDiag}</select></td>`+
    `<td><input type="number" min="1" class="form-control" style="width:50px;text-align:center;padding:6px 2px;" name="diag_qty[]" value="1"></td>`+
    `<td><input type="text" class="form-control" style="width:100%" name="diag_hasil[]" placeholder="<?= e(t('common.result_placeholder')) ?>"></td>`+
    `<td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td></tr>`);
  initSearchableSelects(tb.lastElementChild);
}
function addFisio(){
  var tb = document.getElementById('fisioBody');
  tb.insertAdjacentHTML('beforeend',
    `<tr><td><select class="form-control searchable-select" name="fisio_id[]">${optFisio}</select></td>`+
    `<td><input type="number" min="1" class="form-control" style="width:50px;text-align:center;padding:6px 2px;" name="fisio_qty[]" value="1"></td>`+
    `<td><input type="text" class="form-control" style="width:100%" name="fisio_hasil[]" placeholder="<?= e(t('common.result_placeholder')) ?>"></td>`+
    `<td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td></tr>`);
  initSearchableSelects(tb.lastElementChild);
}
function addObat(){
  var tb = document.getElementById('obatBody');
  tb.insertAdjacentHTML('beforeend',
    `<tr><td><select class="form-control searchable-select" name="obat_id[]">${optObat}</select></td>`+
    `<td><input type="number" min="1" class="form-control" name="obat_qty[]" value="1"></td>`+
    `<td><input class="form-control" name="obat_dosis[]" placeholder="3x1"></td>`+
    `<td><input class="form-control" name="obat_aturan[]" placeholder="<?= e(t('common.after_meal_placeholder')) ?>"></td>`+
    `<td><button type="button" class="btn btn-sm btn-red" onclick="delRow(this)"><?= app_icon('close') ?></button></td></tr>`);
  initSearchableSelects(tb.lastElementChild);
}

var DATA_PER_TGL = <?= json_encode($dataPerTgl, JSON_UNESCAPED_UNICODE) ?>;
var CURRENT_TGL = <?= json_encode($defaultTgl) ?>;

function getFormState() {
  var state = { tind: [], kons: [], lab: [], rad: [], diag: [], fisio: [], obat: [] };

  function extractRows(selector, selectName, qtyName, extraMap) {
    var result = [];
    document.querySelectorAll(selector).forEach(function (tr) {
      var sel = tr.querySelector('select[name="' + selectName + '"]');
      var qty = tr.querySelector('input[name="' + qtyName + '"]');
      if (sel && sel.value) {
        var obj = { id: parseInt(sel.value, 10), qty: parseInt(qty ? qty.value : 1, 10) || 1 };
        if (extraMap) {
          Object.keys(extraMap).forEach(function (k) {
            var input = tr.querySelector('input[name="' + extraMap[k] + '"]');
            obj[k] = input ? input.value : '';
          });
        }
        result.push(obj);
      }
    });
    return result;
  }

  state.tind = extractRows('#tindBody tr', 'tind_id[]', 'tind_qty[]').map(function(o){ return { tindakan_id: o.id, qty: o.qty }; });
  state.kons = extractRows('#konsBody tr', 'kons_id[]', 'kons_qty[]').map(function(o){ return { konsultasi_id: o.id, qty: o.qty }; });
  state.lab  = extractRows('#labBody tr', 'lab_id[]', 'lab_qty[]', { hasil: 'lab_hasil[]' }).map(function(o){ return { pemeriksaan_id: o.id, qty: o.qty, hasil: o.hasil }; });
  state.rad  = extractRows('#radBody tr', 'rad_id[]', 'rad_qty[]', { hasil: 'rad_hasil[]' }).map(function(o){ return { pemeriksaan_id: o.id, qty: o.qty, hasil: o.hasil }; });
  state.diag = extractRows('#diagBody tr', 'diag_id[]', 'diag_qty[]', { hasil: 'diag_hasil[]' }).map(function(o){ return { pemeriksaan_id: o.id, qty: o.qty, hasil: o.hasil }; });
  state.fisio= extractRows('#fisioBody tr', 'fisio_id[]', 'fisio_qty[]', { hasil: 'fisio_hasil[]' }).map(function(o){ return { pemeriksaan_id: o.id, qty: o.qty, hasil: o.hasil }; });
  state.obat = extractRows('#obatBody tr', 'obat_id[]', 'obat_qty[]', { dosis: 'obat_dosis[]', aturan_pakai: 'obat_aturan[]' }).map(function(o){ return { obat_id: o.id, qty: o.qty, dosis: o.dosis, aturan_pakai: o.aturan_pakai }; });

  return state;
}

function renderFormState(state) {
  state = state || { tind: [], kons: [], lab: [], rad: [], diag: [], fisio: [], obat: [] };

  function renderList(tbodyId, items, addFn, mapItemFn) {
    var tb = document.getElementById(tbodyId);
    if (!tb) return;
    tb.innerHTML = '';
    var list = Array.isArray(items) ? items : Object.keys(items || {}).map(function(k){ return Object.assign({ id: parseInt(k,10) }, items[k]); });
    list.forEach(function (item) {
      addFn();
      var lastRow = tb.lastElementChild;
      if (lastRow) mapItemFn(lastRow, item);
    });
  }

  renderList('tindBody', state.tind, addTind, function(row, item) {
    var sel = row.querySelector('select[name="tind_id[]"]');
    var qty = row.querySelector('input[name="tind_qty[]"]');
    if (sel) { sel.value = item.tindakan_id || item.id; updateSearchableSelect(sel); }
    if (qty) qty.value = item.qty;
  });

  renderList('konsBody', state.kons, addKons, function(row, item) {
    var sel = row.querySelector('select[name="kons_id[]"]');
    var qty = row.querySelector('input[name="kons_qty[]"]');
    if (sel) { sel.value = item.konsultasi_id || item.id; updateSearchableSelect(sel); }
    if (qty) qty.value = item.qty;
  });

  renderList('labBody', state.lab, addLab, function(row, item) {
    var sel = row.querySelector('select[name="lab_id[]"]');
    var qty = row.querySelector('input[name="lab_qty[]"]');
    var hasil = row.querySelector('input[name="lab_hasil[]"]');
    if (sel) { sel.value = item.pemeriksaan_id || item.lab_id || item.id; updateSearchableSelect(sel); }
    if (qty) qty.value = item.qty || 1;
    if (hasil) hasil.value = item.hasil || '';
  });

  renderList('radBody', state.rad, addRad, function(row, item) {
    var sel = row.querySelector('select[name="rad_id[]"]');
    var qty = row.querySelector('input[name="rad_qty[]"]');
    var hasil = row.querySelector('input[name="rad_hasil[]"]');
    if (sel) { sel.value = item.pemeriksaan_id || item.rad_id || item.id; updateSearchableSelect(sel); }
    if (qty) qty.value = item.qty || 1;
    if (hasil) hasil.value = item.hasil || '';
  });

  renderList('diagBody', state.diag, addDiag, function(row, item) {
    var sel = row.querySelector('select[name="diag_id[]"]');
    var qty = row.querySelector('input[name="diag_qty[]"]');
    var hasil = row.querySelector('input[name="diag_hasil[]"]');
    if (sel) { sel.value = item.pemeriksaan_id || item.diag_id || item.id; updateSearchableSelect(sel); }
    if (qty) qty.value = item.qty || 1;
    if (hasil) hasil.value = item.hasil || '';
  });

  renderList('fisioBody', state.fisio, addFisio, function(row, item) {
    var sel = row.querySelector('select[name="fisio_id[]"]');
    var qty = row.querySelector('input[name="fisio_qty[]"]');
    var hasil = row.querySelector('input[name="fisio_hasil[]"]');
    if (sel) { sel.value = item.pemeriksaan_id || item.fisio_id || item.id; updateSearchableSelect(sel); }
    if (qty) qty.value = item.qty || 1;
    if (hasil) hasil.value = item.hasil || '';
  });

  renderList('obatBody', state.obat, addObat, function(row, item) {
    var sel = row.querySelector('select[name="obat_id[]"]');
    var qty = row.querySelector('input[name="obat_qty[]"]');
    var dosis = row.querySelector('input[name="obat_dosis[]"]');
    var aturan = row.querySelector('input[name="obat_aturan[]"]');
    if (sel) { sel.value = item.obat_id || item.id; updateSearchableSelect(sel); }
    if (qty) qty.value = item.qty;
    if (dosis) dosis.value = item.dosis || '';
    if (aturan) aturan.value = item.aturan_pakai || '';
  });
}

function onTglLayananChange(newTgl) {
  if (!newTgl) return;
  DATA_PER_TGL[CURRENT_TGL] = getFormState();
  CURRENT_TGL = newTgl;
  if (!DATA_PER_TGL[CURRENT_TGL]) {
    DATA_PER_TGL[CURRENT_TGL] = { tind: [], kons: [], lab: [], rad: [], diag: [], fisio: [], obat: [] };
  }
  renderFormState(DATA_PER_TGL[CURRENT_TGL]);
}

function onTglKunjunganChange(val) {
  var laySel = document.getElementById('tglLayananSelect');
  if (laySel && laySel.value === CURRENT_TGL) {
    laySel.value = val;
    onTglLayananChange(val);
  }
}

function toggleRawatInapPanel() {
  var regSel = document.getElementById('jenis_registrasi');
  var hdr = document.getElementById('tglLayananHeader');
  if (!regSel || !hdr) return;
  var isRawatInap = (regSel.value === 'rawat_inap');
  hdr.style.display = isRawatInap ? 'flex' : 'none';
}

function prepareFormSubmit() {
  DATA_PER_TGL[CURRENT_TGL] = getFormState();
  var jsonField = document.getElementById('tglLayananJson');
  if (jsonField) {
    jsonField.value = JSON.stringify(DATA_PER_TGL);
  }
  var activeField = document.getElementById('activeTglLayanan');
  if (activeField) {
    activeField.value = CURRENT_TGL;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  filterDokter();
  toggleRawatInapPanel();
  initSearchableSelects();
});
</script>
<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
