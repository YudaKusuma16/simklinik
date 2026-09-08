<?php

require_once __DIR__ . '/../../includes/auth.php';

require_role('registrasi', 'admin', 'superadmin');

$pageTitle = t('pages.registration');



$tgl = $_GET['tgl'] ?? date('Y-m-d');



$stmt = db()->prepare(
    "SELECT k.id, k.no_kunjungan, k.no_antrian, k.status, k.jenis_penjamin, k.jenis_registrasi,
            p.no_mr, p.nama AS pasien, po.kode AS poli_kode, po.nama AS poli,
            d.nama AS dokter
     FROM kunjungan k
     JOIN pasien p ON p.id = k.pasien_id
     JOIN poli po ON po.id = k.poli_id
     LEFT JOIN dokter d ON d.id = k.dokter_id
     WHERE k.tgl_kunjungan = ?
     ORDER BY k.id DESC");
$stmt->execute([$tgl]);
$rows = $stmt->fetchAll();

$regSortDropdown = [
    'col' => 4,
    'options' => [
        ['label' => t('common.all'), 'value' => ''],
        ['label' => 'Rawat Inap (Inpatient)', 'value' => 'Rawat Inap (Inpatient)'],
        ['label' => 'Rawat Jalan (Outpatient)', 'value' => 'Rawat Jalan (Outpatient)'],
    ],
];

// Kode pembatalan khusus registrasi
$stmtReg = db()->query("SELECT id, kode, nama FROM kode_pembatalan WHERE status='aktif' AND kode LIKE 'BTL-REG%' ORDER BY kode");
$kodeBatalRegList = $stmtReg->fetchAll();

if (empty($kodeBatalRegList)) {
    $defaultRegCodes = [
        ['BTL-REG01', 'Pasien Batal Berobat', 'Pasien membatalkan pendaftaran'],
        ['BTL-REG02', 'Pasien Tidak Hadir saat Dipanggil', 'Pasien tidak hadir'],
        ['BTL-REG03', 'Lainnya', 'Alasan registrasi lainnya'],
    ];
    $ins = db()->prepare("INSERT IGNORE INTO kode_pembatalan (kode, nama, keterangan, status) VALUES (?, ?, ?, 'aktif')");
    foreach ($defaultRegCodes as $c) {
        $ins->execute($c);
    }
    $kodeBatalRegList = db()->query("SELECT id, kode, nama FROM kode_pembatalan WHERE status='aktif' AND kode LIKE 'BTL-REG%' ORDER BY kode")->fetchAll();
}

$badgeMap = [
    'menunggu' => 'badge-orange', 'periksa' => 'badge-blue', 'penunjang' => 'badge-blue',
    'farmasi'  => 'badge-blue', 'billing' => 'badge-blue', 'pembayaran' => 'badge-orange',
    'selesai'  => 'badge-green', 'batal' => 'badge-red',
];

require_once __DIR__ . '/../../includes/header.php';
?>

<div class="page-toolbar">
  <div>
    <div class="pt-title"><?= e(t('pages.registration_visits')) ?></div>
    <div class="pt-sub"><?= tgl_id($tgl) ?> &middot; <?= e(t('pages.visits_count', ['count' => count($rows)])) ?></div>
  </div>
  <div class="pt-actions">
    <form method="get" class="toolbar-filter">
      <span class="ico"><?= app_icon('calendar') ?></span>
      <input type="date" name="tgl" value="<?= e($tgl) ?>" class="form-control" onchange="this.form.submit()">
    </form>
    <a class="btn" href="<?= legacy_url('modules/registrasi/daftar.php') ?>"><?= app_icon('plus') ?> <?= e(t('common.new_registration_btn')) ?></a>
  </div>
</div>

<div class="table-wrap">
  <table class="datatable dt-noscroll no-auto-num" style="width:100%" data-sort-dropdown='<?= json_encode($regSortDropdown, JSON_HEX_APOS | JSON_HEX_QUOT) ?>'>
    <thead>
      <tr><th><?= e(t('common.queue')) ?></th><th><?= e(t('common.visit_no')) ?></th><th><?= e(t('common.mr_no')) ?></th><th><?= e(t('app.patient')) ?></th>
          <th><?= e(t('common.registration_type')) ?></th><th><?= e(t('app.poli')) ?></th><th><?= e(t('app.doctor')) ?></th><th><?= e(t('common.insurance')) ?></th><th><?= e(t('app.status')) ?></th><th class="col-actions" style="text-align:center"><?= e(t('common.action')) ?></th></tr>
    </thead>
    <tbody>
      <?php foreach ($rows as $r): ?>
        <tr>
          <td><b><?= e($r['poli_kode']) ?>-<?= str_pad($r['no_antrian'], 3, '0', STR_PAD_LEFT) ?></b></td>
          <td><?= e($r['no_kunjungan']) ?></td>
          <td><?= e($r['no_mr']) ?></td>
          <td><?= e($r['pasien']) ?></td>
          <td>
            <?php if (($r['jenis_registrasi'] ?? '') === 'rawat_inap'): ?>
              <span class="badge badge-purple">Rawat Inap (Inpatient)</span>
            <?php else: ?>
              <span class="badge badge-blue">Rawat Jalan (Outpatient)</span>
            <?php endif; ?>
          </td>
          <td><?= e($r['poli']) ?></td>
          <td><?= e($r['dokter'] ?? '-') ?></td>
          <td>
            <?php
              $penj = strtolower(trim($r['jenis_penjamin'] ?? ''));
              $optKey = 'common.options.' . str_replace(['/', ' '], '_', $penj);
              $trans = t($optKey);
              $penjDisp = ($trans !== $optKey) ? $trans : strtoupper($r['jenis_penjamin']);
            ?>
            <span class="badge badge-gray"><?= e($penjDisp) ?></span>
          </td>
          <td><span class="badge <?= $badgeMap[$r['status']] ?? 'badge-gray' ?>"><?= e(status_label($r['status'])) ?></span></td>
          <td class="cell-actions" style="text-align:center">
            <?php if (!in_array($r['status'], ['pembayaran', 'selesai', 'batal'], true)): ?>
              <div style="display:flex;gap:4px;justify-content:center">
                <a class="btn btn-sm btn-light" href="<?= legacy_url('modules/registrasi/daftar.php?id=' . $r['id']) ?>"><?= app_icon('pencil') ?> <?= e(t('common.edit')) ?></a>
                <button type="button" class="btn btn-sm btn-danger" data-batal-kunjungan="<?= (int) $r['id'] ?>" data-batal-label="<?= e($r['pasien'] . ' — ' . $r['no_kunjungan']) ?>"><?= app_icon('close') ?> <?= e(t('common.cancel')) ?></button>
              </div>
            <?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>

<!-- Modal pembatalan registrasi -->
<div class="modal-overlay" id="batalRegModal" aria-hidden="true">
  <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="batalRegModalTitle" style="max-width:480px">
    <div class="modal-head">
      <div class="modal-title" id="batalRegModalTitle"><?= e(t('common.cancel_registration')) ?></div>
      <button type="button" class="modal-close" data-batal-close aria-label="<?= e(t('common.close')) ?>">&times;</button>
    </div>
    <form method="post" action="<?= legacy_url('modules/registrasi/batal.php') ?>" class="modal-body">
      <?= sim_csrf_field() ?>
      <input type="hidden" name="kunjungan_id" id="batalKunjunganId" value="">
      <input type="hidden" name="tgl" value="<?= e($tgl) ?>">
      <p id="batalLabel" style="margin:0 0 14px;color:var(--muted)"></p>
      <div class="form-group">
        <label><?= e(t('common.cancellation_code')) ?> <span class="req">*</span></label>
        <select name="kode_pembatalan_id" class="form-control" required>
          <option value=""><?= e(t('common.select_cancellation')) ?></option>
          <?php foreach ($kodeBatalRegList as $kb): ?>
            <option value="<?= (int) $kb['id'] ?>"><?= e($kb['kode'] . ' — ' . cancellation_reason_label($kb['kode'], $kb['nama'])) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="form-group">
        <label><?= e(t('common.extra_notes')) ?></label>
        <textarea name="alasan_batal" class="form-control" rows="2" placeholder="<?= e(t('common.optional')) ?>"></textarea>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
        <button type="button" class="btn btn-light" data-batal-close><?= e(t('common.cancel')) ?></button>
        <button type="submit" class="btn btn-danger"><?= app_icon('close') ?> <?= e(t('common.cancel_registration')) ?></button>
      </div>
    </form>
  </div>
</div>

<script>
(function () {
  var batalOverlay = document.getElementById('batalRegModal');
  var batalKunjungan = document.getElementById('batalKunjunganId');
  var batalLabel = document.getElementById('batalLabel');
  function openBatal(id, label) {
    batalKunjungan.value = id;
    batalLabel.textContent = label;
    batalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeBatal() {
    batalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-batal-kunjungan]');
    if (btn) { openBatal(btn.getAttribute('data-batal-kunjungan'), btn.getAttribute('data-batal-label')); return; }
    if (ev.target.closest('[data-batal-close]') || ev.target === batalOverlay) closeBatal();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && batalOverlay.classList.contains('open')) closeBatal();
  });
})();
</script>

<?php require_once __DIR__ . '/../../includes/footer.php'; ?>

