<?php
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/billing_lib.php';
require_role('kasir', 'admin', 'superadmin');
$pageTitle = t('pages.billing_process');

require_once __DIR__ . '/../../includes/keuangan_lib.php';

$kunjunganId = (int) ($_GET['kunjungan_id'] ?? $_POST['kunjungan_id'] ?? 0);

$kj = db()->prepare(
    "SELECT k.*, p.no_mr, p.nama AS pasien, po.nama AS poli, d.nama AS dokter,
            a.nama AS asuransi_nama, c.nama AS corporate_nama
     FROM kunjungan k
     JOIN pasien p ON p.id = k.pasien_id
     JOIN poli po ON po.id = k.poli_id
     LEFT JOIN dokter d ON d.id = k.dokter_id
     LEFT JOIN asuransi a ON a.id = k.asuransi_id
     LEFT JOIN corporate c ON c.id = k.corporate_id
     WHERE k.id = ?");
$kj->execute([$kunjunganId]);
$kj = $kj->fetch();
if (!$kj) { set_flash('danger', t('common.err_visit_not_found')); legacy_redirect('modules/billing/index.php'); }

// Billing yang sudah ada
$billing = db()->prepare("SELECT * FROM billing WHERE kunjungan_id=?");
$billing->execute([$kunjunganId]);
$billing = $billing->fetch() ?: null;
$isFinal = $billing && $billing['status'] === 'final';

$isRawatInap = (($kj['jenis_registrasi'] ?? '') === 'rawat_inap');
$adminDeskripsi = $isRawatInap ? t('common.admin_fee_inpatient') : t('common.admin_fee');

$asuransiList  = db()->query("SELECT id, nama FROM asuransi WHERE status='aktif' ORDER BY nama")->fetchAll();
$corporateList = db()->query("SELECT id, nama FROM corporate WHERE status='aktif' ORDER BY nama")->fetchAll();

// administrasi tersimpan (jika ada)
$admTersimpanRow = db()->prepare(
    "SELECT bd.subtotal FROM billing_detail bd JOIN billing b ON b.id=bd.billing_id
     WHERE b.kunjungan_id=? AND bd.kategori='administrasi' LIMIT 1");
$admTersimpanRow->execute([$kunjunganId]);
$admTersimpanVal = $admTersimpanRow->fetchColumn();
$hasSavedAdmin = ($admTersimpanVal !== false);
$administrasi = $hasSavedAdmin ? (float) $admTersimpanVal : 0;
$diskon = (float) ($billing['diskon'] ?? 0);
$coverPenjaminSaved = (float) ($billing['cover_penjamin'] ?? 0);

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$isFinal) {
    sim_csrf_verify();
    $aksi = $_POST['aksi'] ?? 'simpan';
    $rawAdmin = max(0, (float) ($_POST['administrasi'] ?? 0));
    $lines = collect_billing_lines($kunjunganId);
    $svcOnly = array_sum(array_column($lines, 'subtotal'));

    if ($rawAdmin > 0) {
        $administrasi = $rawAdmin;
    } elseif ($isRawatInap) {
        $administrasi = round(0.40 * $svcOnly);
    } else {
        $administrasi = 0;
    }

    $diskon = max(0, (float) ($_POST['diskon'] ?? 0));
    $hasilDiagnostik = trim($_POST['hasil_diagnostik'] ?? '');

    $jenisPenjamin = $_POST['jenis_penjamin'] ?? 'umum';
    if (!in_array($jenisPenjamin, ['umum', 'asuransi', 'corporate', 'ar'], true)) {
        $jenisPenjamin = 'umum';
    }
    $asuransiId  = $jenisPenjamin === 'asuransi' ? ((int) ($_POST['asuransi_id'] ?? 0) ?: null) : null;
    $corporateId = $jenisPenjamin === 'corporate' ? ((int) ($_POST['corporate_id'] ?? 0) ?: null) : null;
    $noJaminan   = trim($_POST['no_jaminan'] ?? '') ?: null;

    $subtotal = $svcOnly + $administrasi;
    $totalRaw = max(0, $subtotal - $diskon);
    $total = pembulatan_billing($totalRaw, 500);

    $coverPenjamin = ($jenisPenjamin !== 'umum')
        ? max(0, min($total, (float) ($_POST['cover_penjamin'] ?? $total)))
        : 0;


    try {
        db()->beginTransaction();
        db()->prepare("UPDATE kunjungan SET jenis_penjamin=?, asuransi_id=?, corporate_id=?, no_jaminan=? WHERE id=?")
          ->execute([$jenisPenjamin, $asuransiId, $corporateId, $noJaminan, $kunjunganId]);
        $kj['jenis_penjamin'] = $jenisPenjamin;
        $kj['asuransi_id'] = $asuransiId;
        $kj['corporate_id'] = $corporateId;
        $kj['no_jaminan'] = $noJaminan;
        if ($billing) {
            db()->prepare("UPDATE billing SET subtotal=?, diskon=?, total=?, cover_penjamin=?, status=?, hasil_diagnostik=? WHERE id=?")
              ->execute([$subtotal, $diskon, $total, $coverPenjamin, $aksi === 'finalisasi' ? 'final' : 'draft', $hasilDiagnostik, $billing['id']]);
            $billingId = (int) $billing['id'];
        } else {
            db()->prepare("INSERT INTO billing (kunjungan_id,subtotal,diskon,total,cover_penjamin,status,hasil_diagnostik) VALUES (?,?,?,?,?,?,?)")
              ->execute([$kunjunganId, $subtotal, $diskon, $total, $coverPenjamin, $aksi === 'finalisasi' ? 'final' : 'draft', $hasilDiagnostik]);
            $billingId = (int) db()->lastInsertId();
        }
        // rebuild detail
        db()->prepare("DELETE FROM billing_detail WHERE billing_id=?")->execute([$billingId]);
        $ins = db()->prepare("INSERT INTO billing_detail (billing_id,tgl_layanan,kategori,item_code,deskripsi,hasil,qty,tarif,subtotal) VALUES (?,?,?,?,?,?,?,?,?)");
        foreach ($lines as $l) {
            $tglVal = $l['tgl_layanan'] ?? $kj['tgl_kunjungan'];
            $ins->execute([$billingId, $tglVal, $l['kategori'], $l['item_code'] ?? '', $l['deskripsi'], $l['hasil'] ?? null, $l['qty'], $l['tarif'], $l['subtotal']]);
        }
        if ($administrasi > 0) {
            $ins->execute([$billingId, $kj['tgl_kunjungan'], 'administrasi', 'GBKAD0001', $adminDeskripsi, null, 1, $administrasi, $administrasi]);
        }

        if ($aksi === 'finalisasi') {
            db()->prepare("UPDATE kunjungan SET status='pembayaran' WHERE id=?")->execute([$kunjunganId]);
            $inv = get_or_create_invoice($kunjunganId);
            db()->commit();
            set_flash('success', t('common.billing_finalized_flash', ['total' => rupiah($total)]));
            legacy_redirect('modules/billing/index.php');
        }
        db()->commit();
        set_flash('success', t('common.billing_draft_saved_flash'));
        legacy_redirect('modules/billing/proses.php?kunjungan_id=' . $kunjunganId);
    } catch (Throwable $ex) {
        if (db()->inTransaction()) db()->rollBack();
        $errors[] = t('common.err_save_billing', ['msg' => $ex->getMessage()]);
    }
}

// Data untuk tampilan: jika final, baca dari billing_detail tersimpan; jika belum, hitung live
if ($isFinal) {
    $s = db()->prepare("SELECT tgl_layanan,kategori,item_code,deskripsi,hasil,qty,tarif,subtotal FROM billing_detail WHERE billing_id=? ORDER BY id");
    $s->execute([$billing['id']]);
    $detailLines = $s->fetchAll();
    $subtotal = (float) $billing['subtotal'];
    $diskon = (float) $billing['diskon'];
    $total = (float) $billing['total'];
    $hasilDiagnostik = trim($billing['hasil_diagnostik'] ?? '');
} else {
    $svc = collect_billing_lines($kunjunganId);
    $svcOnly = array_sum(array_column($svc, 'subtotal'));
    if (!$hasSavedAdmin && $isRawatInap && $administrasi == 0) {
        $administrasi = round(0.40 * $svcOnly);
    }
    $detailLines = $svc;
    if ($administrasi > 0) {
        $detailLines[] = ['tgl_layanan' => $kj['tgl_kunjungan'], 'kategori' => 'administrasi', 'item_code' => 'GBKAD0001', 'deskripsi' => $adminDeskripsi,
            'hasil' => null, 'qty' => 1, 'tarif' => $administrasi, 'subtotal' => $administrasi];
    }
    $subtotal = $svcOnly + $administrasi;
    $totalRaw = max(0, $subtotal - $diskon);
    $total = pembulatan_billing($totalRaw, 500);

    $hasilDiagnostik = trim($billing['hasil_diagnostik'] ?? '');
}

$svcOnly = array_sum(array_column(array_filter($detailLines, fn($l) => $l['kategori'] !== 'administrasi'), 'subtotal'));

$kodeBatalList = db()->query("SELECT id, kode, nama FROM kode_pembatalan WHERE status='aktif' AND kode NOT LIKE 'BTL-REG%' ORDER BY kode")->fetchAll();

require_once __DIR__ . '/../../includes/header.php';
?>
<a href="<?= legacy_url('modules/billing/index.php') ?>" class="btn btn-light btn-sm"><?= app_icon("arrowleft") ?> <?= e(t('common.back')) ?></a>

<div class="card" style="margin-top:14px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px">
  <div>
    <div style="font-size:var(--fs-sub);font-weight:700"><?= e($kj['pasien']) ?></div>
    <div style="color:var(--muted)">No. MR <b><?= e($kj['no_mr']) ?></b> &middot; <?= e($kj['poli']) ?> &middot; <?= e($kj['dokter'] ?? '-') ?></div>
  </div>
  <div style="text-align:right">
    <div class="badge badge-blue">No. <?= e($kj['no_kunjungan']) ?></div>
    <?php if ($isFinal): ?><br><span class="badge badge-green" style="margin-top:6px"><?= e(t('common.billing_final')) ?></span><?php endif; ?>
  </div>
</div>

<?php if ($errors): ?><div class="alert alert-danger" style="margin-top:14px"><?= implode('<br>', array_map('e', $errors)) ?></div><?php endif; ?>
<?php if ($isFinal): ?><div class="alert alert-info" style="margin-top:14px"><?= t('common.billing_already_finalized_info') ?></div><?php endif; ?>

<div class="section-title"><?= e(t('common.service_breakdown')) ?></div>
<div class="table-wrap">
  <table style="width:100%">
    <thead><tr><th style="width:110px"><?= e(t('common.date')) ?></th><th><?= e(t('common.category')) ?></th><th style="width:110px"><?= e(t('common.code')) ?></th><th><?= e(t('common.description')) ?></th><th style="width:70px"><?= e(t('common.qty')) ?></th>
      <th style="width:140px;text-align:right"><?= e(t('common.rate')) ?></th><th style="width:150px;text-align:right"><?= e(t('common.subtotal')) ?></th></tr></thead>
    <tbody>
      <?php if (!$detailLines): ?>
        <tr><td colspan="7" style="text-align:center;color:var(--muted);padding:20px"><?= e(t('common.no_services_yet')) ?></td></tr>
      <?php else: foreach ($detailLines as $l):
        if ($l['kategori'] === 'administrasi') continue;
        $dVal = !empty($l['tgl_layanan']) ? date('d/m/Y', strtotime($l['tgl_layanan'])) : date('d/m/Y', strtotime($kj['tgl_kunjungan']));
      ?>
        <tr>
          <td><span style="font-size:0.875rem;color:var(--muted)"><?= e($dVal) ?></span></td>
          <td><span class="badge badge-gray"><?= e(billing_kategori_label($l['kategori'])) ?></span></td>
          <td><code><?= e($l['item_code'] ?? '') ?></code></td>
          <td><?= e($l['deskripsi']) ?></td>
          <td><?= (int) $l['qty'] ?></td>
          <td style="text-align:right"><?= rupiah($l['tarif']) ?></td>
          <td style="text-align:right"><?= rupiah($l['subtotal']) ?></td>
        </tr>
      <?php endforeach; endif; ?>
    </tbody>
  </table>
</div>

<form method="post" style="margin-top:18px">
  <?= sim_csrf_field() ?>
  <input type="hidden" name="kunjungan_id" value="<?= (int) $kunjunganId ?>">
  <input type="hidden" name="aksi" id="aksi" value="simpan">

  <!-- Card Hasil Diagnostik -->
  <div class="card" style="margin-bottom:18px">
    <div class="form-group" style="margin-bottom:0">
      <label style="font-weight:600;margin-bottom:6px;display:block"><?= e(t('common.diagnostic_results')) ?></label>
      <textarea name="hasil_diagnostik" id="hasil_diagnostik" class="form-control" rows="3" placeholder="<?= e(t('common.diagnostic_results')) ?>..." <?= $isFinal ? 'disabled' : '' ?>><?= e($hasilDiagnostik) ?></textarea>
    </div>
  </div>

  <!-- Card Penjamin & Asuransi -->
  <div class="card" style="margin-bottom:18px">
    <div style="font-weight:600;margin-bottom:14px;font-size:var(--fs-sub);display:flex;align-items:center;gap:8px">
      <span style="display:inline-flex;align-items:center;justify-content:center"><?= app_icon('shield') ?></span>
      <span><?= e(t('common.guarantor_insurance')) ?></span>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label><?= e(t('common.insurance_type')) ?></label>
        <select name="jenis_penjamin" id="jenis_penjamin" class="form-control" <?= $isFinal ? 'disabled' : '' ?> onchange="togglePenjamin()">
          <option value="umum" <?= $kj['jenis_penjamin'] === 'umum' ? 'selected' : '' ?>><?= e(t('common.general')) ?></option>
          <option value="asuransi" <?= $kj['jenis_penjamin'] === 'asuransi' ? 'selected' : '' ?>><?= e(t('common.private_insurance')) ?></option>
          <option value="corporate" <?= $kj['jenis_penjamin'] === 'corporate' ? 'selected' : '' ?>><?= e(t('common.corporate')) ?></option>
          <option value="ar" <?= $kj['jenis_penjamin'] === 'ar' ? 'selected' : '' ?>>AR</option>
        </select>
      </div>
      <div class="form-group penjamin-extra" id="box_asuransi" style="<?= $kj['jenis_penjamin'] === 'asuransi' ? '' : 'display:none' ?>">
        <label><?= e(t('common.insurance')) ?></label>
        <select name="asuransi_id" class="form-control" <?= $isFinal ? 'disabled' : '' ?>>
          <option value=""><?= e(t('common.select_option')) ?></option>
          <?php foreach ($asuransiList as $a): ?>
            <option value="<?= $a['id'] ?>" <?= (int)($kj['asuransi_id'] ?? 0) === (int)$a['id'] ? 'selected' : '' ?>><?= e($a['nama']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="form-group penjamin-extra" id="box_corporate" style="<?= $kj['jenis_penjamin'] === 'corporate' ? '' : 'display:none' ?>">
        <label><?= e(t('common.company')) ?></label>
        <select name="corporate_id" class="form-control" <?= $isFinal ? 'disabled' : '' ?>>
          <option value=""><?= e(t('common.select_option')) ?></option>
          <?php foreach ($corporateList as $c): ?>
            <option value="<?= $c['id'] ?>" <?= (int)($kj['corporate_id'] ?? 0) === (int)$c['id'] ? 'selected' : '' ?>><?= e($c['nama']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>
    <div class="form-group penjamin-extra" id="box_nojaminan" style="<?= in_array($kj['jenis_penjamin'], ['asuransi', 'corporate'], true) ? '' : 'display:none' ?>">
      <label><?= e(t('common.card_no_insurance')) ?></label>
      <input type="text" name="no_jaminan" class="form-control" value="<?= e($kj['no_jaminan'] ?? '') ?>" <?= $isFinal ? 'disabled' : '' ?>>
    </div>
    <?php if (!$isFinal): ?>
    <div style="display:flex;justify-content:flex-end;margin-top:10px">
      <button type="submit" class="btn btn-primary btn-sm" onclick="document.getElementById('aksi').value='simpan'"><?= app_icon("save") ?> <?= e(t('common.save')) ?></button>
    </div>
    <?php endif; ?>
  </div>

  <div class="card" style="max-width:460px;margin-left:auto">
    <div style="display:flex;justify-content:space-between;padding:6px 0">
      <span><?= e(t('common.service_subtotal')) ?></span><b><?= rupiah($svcOnly) ?></b>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
      <label style="margin:0"><?= e($adminDeskripsi) ?></label>
      <input type="number" min="0" step="any" name="administrasi" id="administrasi" class="form-control"
             style="width:160px;text-align:right" value="<?= (int) $administrasi ?>" <?= $isFinal ? 'disabled' : '' ?> oninput="hitung()">
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
      <label style="margin:0"><?= e(t('common.discount')) ?></label>
      <input type="number" min="0" step="any" name="diskon" id="diskon" class="form-control"
             style="width:160px;text-align:right" value="<?= (int) $diskon ?>" <?= $isFinal ? 'disabled' : '' ?> oninput="hitung()">
    </div>
    <?php
      $penjNama = $kj['asuransi_nama'] ?: ($kj['corporate_nama'] ?: strtoupper($kj['jenis_penjamin']));
      $initCover = $isFinal ? $coverPenjaminSaved : ($coverPenjaminSaved > 0 ? $coverPenjaminSaved : $total);
      $initSisa = max(0, $total - $initCover);
    ?>
    <div id="box_penjamin_cover" style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-top:10px;margin-bottom:10px;<?= $kj['jenis_penjamin'] !== 'umum' ? '' : 'display:none' ?>">
      <div style="display:flex;align-items:center;gap:6px;font-weight:600;color:var(--primary);margin-bottom:8px">
        <span style="display:inline-flex;align-items:center"><?= app_icon('shield') ?></span>
        <span><?= e(t('common.guarantor_cover')) ?></span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
        <label style="margin:0"><?= e(t('common.guarantor_cover')) ?></label>
        <input type="number" min="0" step="any" name="cover_penjamin" id="cover_penjamin" class="form-control"
               style="width:160px;text-align:right" value="<?= (int) $initCover ?>" <?= $isFinal ? 'disabled' : '' ?> oninput="hitung()">
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
        <span><?= e(t('common.patient_cover')) ?></span><b id="sisaPasienView"><?= rupiah($initSisa) ?></b>
      </div>
    </div>

    <hr style="border:none;border-top:1px solid var(--border);margin:8px 0">
    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:var(--fs-sub);font-weight:700">
      <span><?= e(t('common.total_bill_upper')) ?></span><span id="totalView"><?= rupiah($total) ?></span>
    </div>
    <?php if (!$isFinal): ?>
    <div style="display:flex;gap:10px;margin-top:14px">
      <button type="submit" class="btn btn-light" onclick="document.getElementById('aksi').value='simpan'"><?= app_icon("save") ?> <?= e(t('common.save_draft')) ?></button>
      <button type="submit" class="btn btn-green" onclick="document.getElementById('aksi').value='finalisasi'"><?= app_icon("check") ?> <?= e(t('common.finalize_billing')) ?></button>
    </div>
    <?php else: ?>
      <a class="btn" style="margin-top:14px;width:100%;justify-content:center" href="<?= legacy_url('modules/keuangan/index.php') ?>"><?= app_icon("keuangan") ?> <?= e(t('common.continue_to_payment')) ?></a>
    <?php endif; ?>
</form>
    <?php if (!$isFinal && $kj['status'] !== 'selesai'): ?>
    <details style="margin-top:18px;border-top:1px solid var(--border);padding-top:14px">
      <summary style="cursor:pointer;color:var(--danger);font-weight:600"><?= e(t('common.cancel_billing')) ?></summary>
      <form method="post" action="<?= legacy_url('modules/billing/batal.php') ?>" style="margin-top:12px" onsubmit="return confirm(<?= json_encode(t('common.cancel_billing_confirm'), JSON_UNESCAPED_UNICODE) ?>)">
        <?= sim_csrf_field() ?>
        <input type="hidden" name="kunjungan_id" value="<?= (int) $kunjunganId ?>">
        <input type="hidden" name="redirect" value="modules/billing/proses.php?kunjungan_id=<?= (int) $kunjunganId ?>">
        <div class="form-group">
          <label><?= e(t('common.cancellation_code')) ?> <span class="req">*</span></label>
          <select name="kode_pembatalan_id" class="form-control" required>
            <option value=""><?= e(t('common.select_cancellation')) ?></option>
            <?php foreach ($kodeBatalList as $kb): ?>
              <option value="<?= (int) $kb['id'] ?>"><?= e($kb['kode'] . ' — ' . cancellation_reason_label($kb['kode'], $kb['nama'])) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="form-group">
          <label><?= e(t('common.extra_notes')) ?></label>
          <textarea name="alasan_batal" class="form-control" rows="2" placeholder="<?= e(t('common.optional')) ?>"></textarea>
        </div>
        <button type="submit" class="btn btn-danger"><?= app_icon('close') ?> <?= e(t('common.cancel_billing')) ?></button>
      </form>
    </details>
    <?php endif; ?>
  </div>

<script>
var svcTotal = <?= (float) $svcOnly ?>;
var isRawatInap = <?= $isRawatInap ? 'true' : 'false' ?>;

function fmt(n){ return 'Rp ' + (n<0?0:n).toLocaleString('id-ID'); }
function pembulatanBilling(amount, step) {
  step = step || 500;
  if (amount <= 0) return 0;
  return Math.ceil(amount / step) * step;
}
function togglePenjamin(){
  var v = document.getElementById('jenis_penjamin').value;
  var boxAs = document.getElementById('box_asuransi');
  var boxCo = document.getElementById('box_corporate');
  var boxNj = document.getElementById('box_nojaminan');
  var boxCov = document.getElementById('box_penjamin_cover');
  if (boxAs) boxAs.style.display = (v === 'asuransi') ? '' : 'none';
  if (boxCo) boxCo.style.display = (v === 'corporate') ? '' : 'none';
  if (boxNj) boxNj.style.display = (v === 'asuransi' || v === 'corporate') ? '' : 'none';
  if (boxCov) boxCov.style.display = (v !== 'umum') ? '' : 'none';
  hitung();
}
function hitung(){
  var admInput = document.getElementById('administrasi');
  var admVal = parseFloat(admInput.value);
  var adm = 0;
  if (!isNaN(admVal) && admVal > 0) {
    adm = admVal;
  } else if (isRawatInap) {
    adm = Math.round(0.40 * svcTotal);
  } else {
    adm = (!isNaN(admVal) && admVal >= 0) ? admVal : 0;
  }

  var dis = parseFloat(document.getElementById('diskon').value)||0;
  var totRaw = Math.max(0, svcTotal + adm - dis);
  var tot = pembulatanBilling(totRaw, 500);
  document.getElementById('totalView').textContent = fmt(tot);

  var v = document.getElementById('jenis_penjamin') ? document.getElementById('jenis_penjamin').value : 'umum';
  var covEl = document.getElementById('cover_penjamin');
  if (covEl) {
    if (v === 'umum') {
      document.getElementById('sisaPasienView').textContent = fmt(tot);
    } else {
      var cov = parseFloat(covEl.value);
      if (isNaN(cov) || cov === 0) {
        cov = tot;
        covEl.value = tot;
      }
      var sisa = Math.max(0, tot - cov);
      document.getElementById('sisaPasienView').textContent = fmt(sisa);
    }
  }
}
</script>

<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
