<?php

require_once __DIR__ . '/../../includes/auth.php';

require_role('dokter', 'farmasi');



if (current_role() === 'farmasi') {

    legacy_redirect('modules/pelayanan/farmasi.php');

}



$pageTitle = t('pages.service');

$tgl = $_GET['tgl'] ?? date('Y-m-d');



$poliId = current_role() === 'dokter' ? current_poli_id() : null;



$sql =

    "SELECT k.id, k.no_kunjungan, k.no_antrian, k.status, k.keluhan_awal,

            p.no_mr, p.nama AS pasien, p.alergi, po.kode AS poli_kode, po.nama AS poli, d.nama AS dokter

     FROM kunjungan k

     JOIN pasien p ON p.id = k.pasien_id

     JOIN poli po ON po.id = k.poli_id

     LEFT JOIN dokter d ON d.id = k.dokter_id

     WHERE k.tgl_kunjungan = ? AND k.status != 'batal'";

$params = [$tgl];

if ($poliId) { $sql .= " AND k.poli_id = ?"; $params[] = $poliId; }

$sql .= " ORDER BY po.nama, k.no_antrian";

$stmt = db()->prepare($sql);

$stmt->execute($params);

$rows = $stmt->fetchAll();



$badge = ['menunggu' => 'badge-orange', 'periksa' => 'badge-blue', 'penunjang' => 'badge-blue', 'billing' => 'badge-orange', 'pembayaran' => 'badge-blue', 'selesai' => 'badge-green'];



require_once __DIR__ . '/../../includes/header.php';

?>

<div class="page-toolbar">

  <div>

    <div class="pt-title"><?= e(t('pages.service')) ?></div>

    <div class="pt-sub"><?= tgl_id($tgl) ?> &middot; <?= e(t('common.exam_queue_count', ['count' => count($rows)])) ?></div>

  </div>

  <div class="pt-actions">

    <form method="get" class="toolbar-filter">

      <span class="ico"><?= app_icon('calendar') ?></span>

      <input type="date" name="tgl" value="<?= e($tgl) ?>" class="form-control" onchange="this.form.submit()">

    </form>

  </div>

</div>



<div class="table-wrap">

  <table class="datatable dt-noscroll no-auto-num" style="width:100%">

    <thead>

      <tr><th><?= e(t('common.queue')) ?></th><th><?= e(t('common.mr_no')) ?></th><th><?= e(t('app.patient')) ?></th><th><?= e(t('app.poli')) ?></th><th><?= e(t('app.doctor')) ?></th>

          <th><?= e(t('common.complaint')) ?></th><th><?= e(t('app.status')) ?></th><th class="col-actions"><?= e(t('common.action')) ?></th></tr>

    </thead>

    <tbody>

      <?php foreach ($rows as $r): ?>

        <tr>

          <td><b><?= e($r['poli_kode']) ?>-<?= str_pad($r['no_antrian'], 3, '0', STR_PAD_LEFT) ?></b></td>

          <td><?= e($r['no_mr']) ?></td>

          <td><?= e($r['pasien']) ?>

            <?php if (!empty($r['alergi'])): ?><br><span class="badge badge-red"><?= e(t('common.allergy')) ?>: <?= e($r['alergi']) ?></span><?php endif; ?>

          </td>

          <td><?= e($r['poli']) ?></td>

          <td><?= e($r['dokter'] ?? '-') ?></td>

          <td><?= e($r['keluhan_awal'] ?? '-') ?></td>

          <td><span class="badge <?= $badge[$r['status']] ?? 'badge-gray' ?>"><?= e(status_label($r['status'])) ?></span></td>

          <td class="cell-actions"><div class="cell-actions-inner">
            <a class="btn btn-sm btn-light" href="<?= legacy_url('modules/billing/detail.php?kunjungan_id=' . $r['id']) ?>"
               data-modal-url="<?= legacy_url('modules/billing/detail.php?kunjungan_id=' . $r['id'] . '&modal=1') ?>"
               data-modal-title="<?= e(t('common.billing_detail')) ?>"><?= app_icon('eye') ?> <?= e(t('common.view_detail')) ?></a>
          </div></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<!-- Modal detail tagihan (premium, read-only) -->
<div class="modal-overlay" id="billModal" aria-hidden="true">
  <div class="modal-box modal-lg" role="dialog" aria-modal="true" aria-labelledby="billModalTitle">
    <div class="modal-head">
      <div class="modal-title" id="billModalTitle"><?= e(t('common.billing_detail')) ?></div>
      <button type="button" class="modal-close" data-modal-close aria-label="<?= e(t('common.close')) ?>">&times;</button>
    </div>
    <div class="modal-body" id="billModalBody"></div>
  </div>
</div>
<script>
(function () {
  var overlay = document.getElementById('billModal');
  var box     = document.getElementById('billModalBody');
  var titleEl = document.getElementById('billModalTitle');
  var defaultTitle = <?= json_encode(t('common.billing_detail'), JSON_UNESCAPED_UNICODE) ?>;
  var loadingHtml = <?= json_encode('<div class="modal-loading">' . t('common.loading') . '</div>', JSON_UNESCAPED_UNICODE) ?>;

  function open(url, title) {
    titleEl.textContent = title || defaultTitle;
    box.innerHTML = loadingHtml;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    fetch(url, { headers: { 'X-Requested-With': 'fetch' } })
      .then(function (r) { return r.text(); })
      .then(function (html) { box.innerHTML = html; });
  }
  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    box.innerHTML = '';
  }
  document.addEventListener('click', function (ev) {
    var opener = ev.target.closest('[data-modal-url]');
    if (opener) { ev.preventDefault(); open(opener.getAttribute('data-modal-url'), opener.getAttribute('data-modal-title')); return; }
    if (ev.target.closest('[data-modal-close]') || ev.target === overlay) close();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && overlay.classList.contains('open')) close();
  });
})();
</script>
<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
