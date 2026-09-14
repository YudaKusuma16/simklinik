<?php
/**
 * Pembatalan registrasi kunjungan dari halaman daftar registrasi.
 */
require_once __DIR__ . '/../../includes/auth.php';
require_role('registrasi', 'admin', 'superadmin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    legacy_redirect('modules/registrasi/index.php');
}

sim_csrf_verify();

$kunjunganId = (int) ($_POST['kunjungan_id'] ?? 0);
$tgl = trim($_POST['tgl'] ?? '');
$redirect = 'modules/registrasi/index.php' . ($tgl !== '' ? '?tgl=' . urlencode($tgl) : '');

$kj = db()->prepare("SELECT k.*, i.id AS invoice_id, i.terbayar FROM kunjungan k LEFT JOIN invoice i ON i.kunjungan_id = k.id WHERE k.id = ?");
$kj->execute([$kunjunganId]);
$kj = $kj->fetch();

if (!$kj) {
    set_flash('danger', t('common.err_visit_not_found'));
    legacy_redirect($redirect);
}

if ($kj['status'] === 'batal') {
    set_flash('warning', t('common.err_already_cancelled'));
    legacy_redirect($redirect);
}

if ($kj['status'] === 'selesai' || ((float) ($kj['terbayar'] ?? 0)) > 0) {
    set_flash('danger', t('common.err_cannot_cancel_processed'));
    legacy_redirect($redirect);
}

$kodePembatalanId = (int) ($_POST['kode_pembatalan_id'] ?? 0);
$alasan = trim($_POST['alasan_batal'] ?? '');

$kp = db()->prepare("SELECT id, kode, nama FROM kode_pembatalan WHERE id = ? AND status = 'aktif'");
$kp->execute([$kodePembatalanId]);
$kp = $kp->fetch();

if (!$kp) {
    set_flash('danger', t('common.err_cancellation_code_req'));
    legacy_redirect($redirect);
}

$userId = current_user()['id'] ?? null;

try {
    db()->beginTransaction();

    db()->prepare(
        "UPDATE kunjungan SET status='batal', kode_pembatalan_id=?, alasan_batal=?, batal_at=NOW(), batal_by=? WHERE id=?"
    )->execute([
        $kp['id'],
        $alasan !== '' ? $alasan : $kp['nama'],
        $userId,
        $kunjunganId,
    ]);

    if (!empty($kj['invoice_id'])) {
        db()->prepare("DELETE FROM pembayaran WHERE invoice_id = ?")->execute([$kj['invoice_id']]);
        db()->prepare("DELETE FROM invoice WHERE id = ?")->execute([$kj['invoice_id']]);
    }

    $billing = db()->prepare("SELECT id FROM billing WHERE kunjungan_id = ?");
    $billing->execute([$kunjunganId]);
    $billingId = $billing->fetchColumn();

    if ($billingId) {
        db()->prepare("DELETE FROM billing_detail WHERE billing_id = ?")->execute([$billingId]);
        db()->prepare("DELETE FROM billing WHERE id = ?")->execute([$billingId]);
    }

    db()->commit();
    $kpNama = cancellation_reason_label($kp['kode'], $kp['nama']);
    set_flash('success', t('common.registration_cancelled_flash', ['no' => e($kj['no_kunjungan']), 'kode' => e($kp['kode']), 'nama' => e($kpNama)]));
} catch (Throwable $ex) {
    if (db()->inTransaction()) db()->rollBack();
    set_flash('danger', t('common.err_cancel_billing', ['msg' => $ex->getMessage()]));
}

legacy_redirect($redirect);
