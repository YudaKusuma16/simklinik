<?php
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/keuangan_lib.php';
require_role('kasir', 'admin', 'superadmin');
$pageTitle = t('pages.payment');
$user = current_user();

$kunjunganId = (int) ($_GET['kunjungan_id'] ?? $_POST['kunjungan_id'] ?? 0);

$kj = db()->prepare(
    "SELECT k.*, p.no_mr, p.nama AS pasien, po.nama AS poli,
            a.nama AS asuransi_nama, c.nama AS corporate_nama, c.limit_jaminan
     FROM kunjungan k
     JOIN pasien p ON p.id = k.pasien_id
     JOIN poli po ON po.id = k.poli_id
     LEFT JOIN asuransi a ON a.id = k.asuransi_id
     LEFT JOIN corporate c ON c.id = k.corporate_id
     WHERE k.id = ?");
$kj->execute([$kunjunganId]);
$kj = $kj->fetch();
if (!$kj) { set_flash('danger', t('common.err_visit_not_found')); legacy_redirect('modules/keuangan/index.php'); }

$invoice = get_or_create_invoice($kunjunganId);
if (!$invoice) { set_flash('danger', t('common.err_billing_not_finalized')); legacy_redirect('modules/billing/proses.php?kunjungan_id=' . $kunjunganId); }

$banks = db()->query("SELECT id,nama_bank,no_rekening,atas_nama FROM bank WHERE status='aktif' ORDER BY nama_bank")->fetchAll();

$pmts = db()->prepare(
    "SELECT pm.*, b.nama_bank, u.nama AS kasir FROM pembayaran pm
     LEFT JOIN bank b ON b.id = pm.bank_id
     LEFT JOIN users u ON u.id = pm.user_id
     WHERE pm.invoice_id=? ORDER BY pm.id");
$pmts->execute([$invoice['id']]);
$pmts = $pmts->fetchAll();

$billing = db()->prepare("SELECT * FROM billing WHERE kunjungan_id=?");
$billing->execute([$kunjunganId]);
$billing = $billing->fetch() ?: [];

$hasPenjaminPmt = false;
$penjaminPmtAmt = 0;
foreach ($pmts as $pm) {
    if ($pm['metode'] === 'penjamin') {
        $hasPenjaminPmt = true;
        $penjaminPmtAmt += (float) $pm['jumlah'];
    }
}

$coverPenjaminVal = (float) ($billing['cover_penjamin'] ?? 0);
if ($kj['jenis_penjamin'] !== 'umum' && $coverPenjaminVal <= 0 && !$hasPenjaminPmt) {
    $coverPenjaminVal = (float) $invoice['total'];
}

$effectivePenjaminCover = $hasPenjaminPmt ? $penjaminPmtAmt : (($kj['jenis_penjamin'] !== 'umum') ? $coverPenjaminVal : 0);
$penjNama = $kj['asuransi_nama'] ?: ($kj['corporate_nama'] ?: strtoupper($kj['jenis_penjamin']));

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['form'] ?? '') === 'bayar') {
    sim_csrf_verify();
    $metode = $_POST['metode'] ?? 'cash';
    $jumlah = (float) ($_POST['jumlah'] ?? 0);
    $bankId = ($metode === 'transfer') ? ((int) ($_POST['bank_id'] ?? 0) ?: null) : null;
    $ket    = trim($_POST['keterangan'] ?? '') ?: null;
    $sisa   = (float) $invoice['total'] - (float) $invoice['terbayar'];

    $allowed = ['cash','transfer','qris','edc','va','ewallet','penjamin'];
    if (!in_array($metode, $allowed, true)) $errors[] = t('common.err_invalid_payment_method');
    if ($jumlah <= 0) $errors[] = t('common.err_payment_gt_zero');
    if ($jumlah > $sisa + 0.01) $errors[] = t('common.err_payment_exceeds_remaining', ['amount' => rupiah($sisa)]);
    if ($invoice['status'] === 'lunas') $errors[] = t('common.err_invoice_already_paid');

    // Upload bukti (untuk metode non-tunai)
    $buktiPath = null;
    if (!$errors && !empty($_FILES['bukti']['name']) && $_FILES['bukti']['error'] === UPLOAD_ERR_OK) {
        $f = $_FILES['bukti'];
        $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
        $okExt = ['jpg','jpeg','png','pdf'];
        if (!in_array($ext, $okExt, true)) {
            $errors[] = t('common.err_proof_format');
        } elseif ($f['size'] > 2 * 1024 * 1024) {
            $errors[] = t('common.err_proof_size');
        } else {
            $fname = 'bukti_' . $invoice['id'] . '_' . time() . '.' . $ext;
            $dest = UPLOAD_PATH . '/bukti/' . $fname;
            if (move_uploaded_file($f['tmp_name'], $dest)) {
                $buktiPath = 'uploads/bukti/' . $fname;
            } else {
                $errors[] = t('common.err_proof_upload');
            }
        }
    }

    if (!$errors) {
        try {
            db()->beginTransaction();
            // Jika tanggungan penjamin ada dan belum dicatat di pembayaran, otomatis catat penjamin saat kasir submit
            if (!$hasPenjaminPmt && $effectivePenjaminCover > 0 && $kj['jenis_penjamin'] !== 'umum') {
                if ($metode !== 'penjamin') {
                    $ketPenjamin = 'Tanggungan ' . strtoupper($kj['jenis_penjamin']) . ($kj['asuransi_nama'] ? ': ' . $kj['asuransi_nama'] : ($kj['corporate_nama'] ? ': ' . $kj['corporate_nama'] : ''));
                    db()->prepare(
                        "INSERT INTO pembayaran (invoice_id,metode,bank_id,jumlah,bukti,status,keterangan,user_id)
                         VALUES (?, 'penjamin', NULL, ?, NULL, 'valid', ?, ?)")
                      ->execute([$invoice['id'], $effectivePenjaminCover, $ketPenjamin, $user['id']]);
                }
            }

            db()->prepare(
                "INSERT INTO pembayaran (invoice_id,metode,bank_id,jumlah,bukti,status,keterangan,user_id)
                 VALUES (?,?,?,?,?, 'valid', ?, ?)")
              ->execute([$invoice['id'], $metode, $bankId, $jumlah, $buktiPath, $ket, $user['id']]);
            $status = recompute_invoice((int) $invoice['id']);
            db()->commit();
            set_flash('success', $status === 'lunas'
                ? t('common.payment_paid_full_flash')
                : t('common.payment_recorded_flash', ['remaining' => rupiah($sisa - $jumlah)]));
            legacy_redirect('modules/keuangan/bayar.php?kunjungan_id=' . $kunjunganId);
        } catch (Throwable $ex) {
            if (db()->inTransaction()) db()->rollBack();
            $errors[] = t('common.err_save_payment', ['msg' => $ex->getMessage()]);
        }
    }
}

// refresh invoice setelah kemungkinan perubahan
$inv = db()->prepare("SELECT * FROM invoice WHERE id=?"); $inv->execute([$invoice['id']]); $invoice = $inv->fetch();
$sisa = (float) $invoice['total'] - (float) $invoice['terbayar'];
$isLunas = $invoice['status'] === 'lunas';

$pmts = db()->prepare(
    "SELECT pm.*, b.nama_bank, u.nama AS kasir FROM pembayaran pm
     LEFT JOIN bank b ON b.id = pm.bank_id
     LEFT JOIN users u ON u.id = pm.user_id
     WHERE pm.invoice_id=? ORDER BY pm.id");
$pmts->execute([$invoice['id']]);
$pmts = $pmts->fetchAll();

$billing = db()->prepare("SELECT * FROM billing WHERE kunjungan_id=?");
$billing->execute([$kunjunganId]);
$billing = $billing->fetch() ?: [];

$hasPenjaminPmt = false;
$penjaminPmtAmt = 0;
foreach ($pmts as $pm) {
    if ($pm['metode'] === 'penjamin') {
        $hasPenjaminPmt = true;
        $penjaminPmtAmt += (float) $pm['jumlah'];
    }
}

$coverPenjaminVal = (float) ($billing['cover_penjamin'] ?? 0);
if ($kj['jenis_penjamin'] !== 'umum' && $coverPenjaminVal <= 0 && !$hasPenjaminPmt) {
    $coverPenjaminVal = (float) $invoice['total'];
}

$effectivePenjaminCover = $hasPenjaminPmt ? $penjaminPmtAmt : (($kj['jenis_penjamin'] !== 'umum') ? $coverPenjaminVal : 0);
$penjNama = $kj['asuransi_nama'] ?: ($kj['corporate_nama'] ?: strtoupper($kj['jenis_penjamin']));

$totalBill = (float) $invoice['total'];
$realTerbayar = (float) $invoice['terbayar'];
$tanggunganPasien = max(0, $totalBill - $effectivePenjaminCover);
$realPasienPaid = $hasPenjaminPmt ? max(0, $realTerbayar - $penjaminPmtAmt) : $realTerbayar;
$sisaPasien = max(0, $tanggunganPasien - $realPasienPaid);

if (!$hasPenjaminPmt && $effectivePenjaminCover >= $totalBill && $kj['jenis_penjamin'] !== 'umum') {
    $defaultMetode = 'penjamin';
    $defaultJumlah = $totalBill;
    $defaultKet = 'Tanggungan ' . strtoupper($kj['jenis_penjamin']) . ($kj['asuransi_nama'] ? ': ' . $kj['asuransi_nama'] : ($kj['corporate_nama'] ? ': ' . $kj['corporate_nama'] : ''));
} else {
    $defaultMetode = 'cash';
    $defaultJumlah = $sisaPasien;
    $defaultKet = '';
}

require_once __DIR__ . '/../../includes/header.php';
?>
<a href="<?= legacy_url('modules/keuangan/index.php') ?>" class="btn btn-light btn-sm"><?= app_icon("arrowleft") ?> <?= e(t('common.back')) ?></a>

<div class="pay-page">

  <!-- Hero: identitas pasien & invoice -->
  <div class="bd-hero">
    <div class="bd-hero-glow"></div>
    <div class="bd-hero-main">
      <div class="bd-avatar"><?= app_icon('idcard') ?></div>
      <div>
        <div class="bd-pasien"><?= e($kj['pasien']) ?></div>
        <div class="bd-meta">
          <span><?= app_icon('user') ?> No. MR <b><?= e($kj['no_mr']) ?></b></span>
          <span><?= app_icon('hospital') ?> <?= e($kj['poli']) ?></span>
          <span><?= app_icon('ticket') ?> <?= e($kj['no_kunjungan']) ?></span>
        </div>
      </div>
    </div>
    <div class="bd-hero-side">
      <div class="bd-kunjungan">Invoice <?= e($invoice['no_invoice']) ?></div>
      <span class="badge <?= $isLunas ? 'badge-green' : 'badge-orange' ?>"><?= $isLunas ? e(t('common.paid_full')) : e(t('common.unpaid')) ?></span>
    </div>
  </div>

  <!-- Verifikasi Penjamin -->
  <div class="pay-penjamin">
    <?php if ($kj['jenis_penjamin'] === 'umum'): ?>
      <span class="badge badge-gray"><?= e(strtoupper(t('common.general'))) ?></span> <span><?= e(t('common.general_patient_self_pay')) ?></span>
    <?php else: ?>
      <span class="badge badge-blue"><?= e(penjamin_label($kj['jenis_penjamin'])) ?></span>
      <?php if ($kj['asuransi_nama']): ?><span>&middot; <b><?= e($kj['asuransi_nama']) ?></b></span><?php endif; ?>
      <?php if ($kj['corporate_nama']): ?><span>&middot; <b><?= e($kj['corporate_nama']) ?></b> (limit <?= rupiah($kj['limit_jaminan']) ?>)</span><?php endif; ?>
      <?php if ($kj['no_jaminan']): ?><span>&middot; No. Jaminan: <?= e($kj['no_jaminan']) ?></span><?php endif; ?>
    <?php endif; ?>
  </div>

  <?php if ($errors): ?><div class="alert alert-danger"><?= implode('<br>', array_map('e', $errors)) ?></div><?php endif; ?>

  <div class="pay-grid">
    <!-- Ringkasan tagihan -->
    <div class="pay-card">
      <div class="pay-card-title"><?= app_icon('billing') ?> <?= e(t('common.billing_summary')) ?></div>
      <div class="pay-sum-rows">
        <div class="bd-sum-row"><span><?= e(t('common.total_bill')) ?></span><b><?= rupiah($totalBill) ?></b></div>
        <?php if ($kj['jenis_penjamin'] !== 'umum'): ?>
          <div class="bd-sum-row" style="color:var(--primary)">
            <span><?= e(t('common.guarantor_cover_label', ['name' => $penjNama])) ?></span>
            <b><?= rupiah($effectivePenjaminCover) ?></b>
          </div>
          <div class="bd-sum-row" style="font-weight:600">
            <span><?= e(t('common.patient_cover')) ?></span>
            <b><?= rupiah($tanggunganPasien) ?></b>
          </div>
        <?php endif; ?>
        <?php if ($realPasienPaid > 0 || $kj['jenis_penjamin'] === 'umum'): ?>
          <div class="bd-sum-row"><span><?= e(t('common.patient_already_paid')) ?></span><b style="color:var(--green)"><?= rupiah($realPasienPaid) ?></b></div>
        <?php endif; ?>
      </div>
      <div class="pay-sisa <?= $sisaPasien > 0 ? 'owe' : 'paid' ?>">
        <div class="lbl"><?= e(t('common.patient_remaining_bill')) ?></div>
        <div class="val"><?= rupiah($sisaPasien) ?></div>
      </div>
      <?php if ($isLunas): ?>
        <div style="display:flex; gap:10px; margin-top:14px;">
          <a class="btn btn-green" target="_blank" style="flex:1;justify-content:center" href="<?= legacy_url('modules/keuangan/struk.php?invoice_id=' . $invoice['id']) ?>"><?= app_icon("print") ?> <?= e(t('common.print_receipt')) ?></a>
          <a class="btn btn-light" target="_blank" style="flex:1;justify-content:center;border:1px solid #cbd5e1" href="<?= legacy_url('modules/keuangan/struk.php?invoice_id=' . $invoice['id'] . '&copy=1') ?>"><?= e(t('common.print_copy')) ?></a>
        </div>
      <?php endif; ?>
    </div>

    <!-- Form pembayaran -->
    <div class="pay-card">
      <div class="pay-card-title"><?= app_icon('money') ?> <?= e(t('common.payment_input')) ?></div>
      <?php if ($isLunas): ?>
        <div class="pay-lunas-banner">
          <?= app_icon('check') ?>
          <div><b><?= e(t('common.bill_fully_paid')) ?></b><small><?= e(t('common.no_more_payment_needed')) ?></small></div>
        </div>
      <?php else: ?>
      <form method="post" enctype="multipart/form-data">
        <?= sim_csrf_field() ?>
        <input type="hidden" name="form" value="bayar">
        <input type="hidden" name="kunjungan_id" value="<?= (int) $kunjunganId ?>">
        <div class="form-group">
          <label><?= e(t('common.payment_method')) ?></label>
          <select name="metode" id="metode" class="form-control" onchange="toggleMetode()">
            <option value="cash" <?= $defaultMetode === 'cash' ? 'selected' : '' ?>><?= e(metode_label('cash')) ?></option>
            <option value="transfer" <?= $defaultMetode === 'transfer' ? 'selected' : '' ?>><?= e(metode_label('transfer')) ?></option>
            <option value="qris" <?= $defaultMetode === 'qris' ? 'selected' : '' ?>><?= e(metode_label('qris')) ?></option>
            <option value="edc" <?= $defaultMetode === 'edc' ? 'selected' : '' ?>><?= e(metode_label('edc')) ?></option>
            <option value="va" <?= $defaultMetode === 'va' ? 'selected' : '' ?>><?= e(metode_label('va')) ?></option>
            <option value="ewallet" <?= $defaultMetode === 'ewallet' ? 'selected' : '' ?>><?= e(metode_label('ewallet')) ?></option>
            <?php if ($kj['jenis_penjamin'] !== 'umum'): ?>
              <option value="penjamin" <?= $defaultMetode === 'penjamin' ? 'selected' : '' ?>><?= e(metode_label('penjamin')) ?></option>
            <?php endif; ?>
          </select>
        </div>
        <div class="form-group" id="boxBank" style="display:none">
          <label><?= e(t('common.destination_bank')) ?></label>
          <select name="bank_id" class="form-control">
            <option value=""><?= e(t('common.select_option')) ?></option>
            <?php foreach ($banks as $b): ?>
              <option value="<?= $b['id'] ?>"><?= e($b['nama_bank']) ?> — <?= e($b['no_rekening']) ?> (<?= e($b['atas_nama']) ?>)</option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="form-group">
          <label><?= e(t('common.payment_amount')) ?></label>
          <input type="number" min="0" step="any" name="jumlah" id="jumlah" class="form-control" value="<?= (int) $defaultJumlah ?>">
        </div>
        <div class="form-group" id="boxBukti" style="display:none">
          <label><?= e(t('common.proof_upload')) ?> (JPG/PNG/PDF, maks 2MB)</label>
          <input type="file" name="bukti" class="form-control" accept=".jpg,.jpeg,.png,.pdf">
        </div>
        <div class="form-group">
          <label><?= e(t('common.notes')) ?></label>
          <input type="text" name="keterangan" id="keterangan" class="form-control" value="<?= e($defaultKet) ?>">
        </div>
        <button type="submit" class="btn btn-green" style="width:100%;justify-content:center"><?= app_icon("check") ?> <?= e(t('common.save_payment')) ?></button>
      </form>
      <?php endif; ?>
    </div>
  </div>

  <!-- Riwayat pembayaran -->
  <div class="pay-card">
    <div class="pay-card-title"><?= app_icon('clock') ?> <?= e(t('common.payment_history')) ?></div>
    <div class="bd-table-wrap">
      <table class="bd-table">
        <thead><tr><th><?= e(t('common.time')) ?></th><th><?= e(t('common.payment_method')) ?></th><th>Bank</th><th class="num"><?= e(t('common.amount')) ?></th><th><?= e(t('common.payment_proof')) ?></th><th><?= e(t('common.cashier')) ?></th></tr></thead>
        <tbody>
          <?php if (!$pmts): ?>
            <tr><td colspan="6" class="bd-empty"><?= e(t('common.no_payment_yet')) ?></td></tr>
          <?php else: foreach ($pmts as $pm): ?>
            <tr>
              <td><?= tgl_id($pm['tanggal'], true) ?></td>
              <td><span class="badge badge-gray"><?= e(metode_label($pm['metode'])) ?></span></td>
              <td><?= e($pm['nama_bank'] ?? '-') ?></td>
              <td class="num bold"><?= rupiah($pm['jumlah']) ?></td>
              <td><?= $pm['bukti'] ? '<a target="_blank" href="' . legacy_url($pm['bukti']) . '">' . e(t('common.view')) . '</a>' : '-' ?></td>
              <td><?= e($pm['kasir'] ?? '-') ?></td>
            </tr>
          <?php endforeach; endif; ?>
        </tbody>
      </table>
    </div>
  </div>

</div>

<script>
function toggleMetode(){
  var m = document.getElementById('metode').value;
  document.getElementById('boxBank').style.display = (m === 'transfer') ? '' : 'none';
  // bukti untuk semua non-tunai & non-penjamin
  document.getElementById('boxBukti').style.display = (m !== 'cash' && m !== 'penjamin') ? '' : 'none';
}
toggleMetode();
</script>
<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
