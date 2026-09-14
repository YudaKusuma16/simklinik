<?php
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/entities.php';
require_role('superadmin');
$pageTitle = t('pages.master_data');

$all = master_entities();

// Kelompokkan entitas per grup + hitung jumlah baris (per entitas & per grup)
// Catatan: jangan pakai nama $grup/$items di sini — header.php memakai nama itu
// untuk menu sidebar (variabel global) sehingga akan saling menimpa.
$grupMaster = [];   // grup => [slug => konfigurasi entitas]
$countEnt   = [];   // slug => jumlah baris
$countGrup  = [];   // grup => total baris
foreach ($all as $slug => $e) {
    $whereClause = !empty($e['where']) ? " WHERE {$e['where']}" : "";
    $jml = (int) db()->query("SELECT COUNT(*) FROM {$e['table']}{$whereClause}")->fetchColumn();
    $grupMaster[$e['group']][$slug] = $e;
    $countEnt[$slug] = $jml;
    $countGrup[$e['group']] = ($countGrup[$e['group']] ?? 0) + $jml;
}
$namaGrupList = array_keys($grupMaster);

// Tentukan entitas + grup yang aktif
$activeSlug = $_GET['e'] ?? '';
if (isset($all[$activeSlug])) {
    $activeGroup = $all[$activeSlug]['group'];
} else {
    $activeGroup = $_GET['g'] ?? $namaGrupList[0];
    if (!isset($grupMaster[$activeGroup])) $activeGroup = $namaGrupList[0];
    $activeSlug = array_key_first($grupMaster[$activeGroup]);
}
$ent = master_entity($activeSlug);

// Hapus (dipindah dari crud.php agar tabel tampil langsung di halaman ini)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['aksi'] ?? '') === 'hapus') {
    sim_csrf_verify();
    $id = (int) ($_POST['id'] ?? 0);
    try {
        db()->prepare("DELETE FROM {$ent['table']} WHERE id = ?")->execute([$id]);
        set_flash('success', t('common.record_deleted', ['name' => $ent['singular']]));
    } catch (Throwable $ex) {
        // kemungkinan dipakai data lain (foreign key)
        set_flash('danger', t('common.cannot_delete_used'));
    }
    legacy_redirect('modules/master/index.php?e=' . $activeSlug);
}

$whereClause = !empty($ent['where']) ? " WHERE {$ent['where']}" : "";
$rows = db()->query("SELECT * FROM {$ent['table']}{$whereClause} ORDER BY {$ent['order']}")->fetchAll();
$listFields = array_filter($ent['fields'], fn($f) => !empty($f['list']));

// warna kartu per grup (berulang bila grup > 5)
$grupColor = ['bg-blue', 'bg-green', 'bg-orange', 'bg-purple', 'bg-red'];

require_once __DIR__ . '/../../includes/header.php';
?>
<div class="page-toolbar">
  <div>
    <div class="pt-title"><?= e($ent['label']) ?></div>
    <div class="pt-sub"><?= e(t('common.master_data_label')) ?> &middot; <?= e(master_group_label($activeGroup)) ?></div>
  </div>
  <div class="pt-actions">
    <a class="btn" href="<?= legacy_url('modules/master/form.php?e=' . $activeSlug) ?>"
       data-modal-url="<?= legacy_url('modules/master/form.php?e=' . $activeSlug . '&modal=1') ?>"
       data-modal-title="<?= e(t('common.add_record', ['name' => $ent['singular']])) ?>"><?= app_icon('plus') ?> <?= e(t('common.add')) ?> <?= e($ent['singular']) ?></a>
  </div>
</div>

<!-- Panel: tab vertikal di kiri + tabel di kanan -->
<div class="master-split" style="margin-top:18px">
  <nav class="vtabs">
    <?php foreach ($grupMaster[$activeGroup] as $s => $e): $on = $s === $activeSlug; ?>
      <a class="vtab<?= $on ? ' active' : '' ?>" href="<?= legacy_url('modules/master/index.php?e=' . $s) ?>">
        <span class="vt-main"><span class="vt-ico"><?= $e['icon'] ?? '' ?></span><span><?= e($e['label']) ?></span></span>
        <span class="tab-count"><?= (int) $countEnt[$s] ?></span>
      </a>
    <?php endforeach; ?>
  </nav>
  <?php
  $sortButtons = [];
  $colIndex = 1;
  foreach ($listFields as $key => $f) {
      if (in_array($key, ['kode', 'nama', 'nama_bank', 'no_mr', 'no_rekening'], true) || (count($sortButtons) < 2 && in_array($f['type'], ['text', 'readonly', 'fk'], true))) {
          $sortButtons[] = [
              'key'   => $key,
              'label' => $f['label'],
              'col'   => $colIndex,
          ];
      }
      $colIndex++;
  }
  ?>
  <div class="table-wrap" style="flex:1;min-width:0;margin:0">
  <table class="datatable dt-noscroll" style="width:100%" data-sort-buttons='<?= json_encode($sortButtons, JSON_HEX_APOS | JSON_HEX_QUOT) ?>'>
    <thead>
      <tr>
        <?php foreach ($listFields as $f): ?><th><?= e($f['label']) ?></th><?php endforeach; ?>
        <th class="no-sort col-actions"><?= e(t('common.action')) ?></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($rows as $r): ?>
        <tr>
          <?php foreach ($listFields as $key => $f): ?>
            <td>
              <?php
                $val = $r[$key] ?? '';
                if ($f['type'] === 'money') {
                    if ($key === 'harga_jual' && (float)$val <= 0) {
                        $basePrice = (float)($r['tarif'] ?? $r['harga_beli'] ?? 0);
                        $val = round($basePrice * 1.40, 2);
                    }
                    echo rupiah($val);
                } elseif ($f['type'] === 'fk') {
                    $map = fk_map($f['fk_table'], $f['fk_label']);
                    echo e($map[$val] ?? '-');
                } elseif ($f['type'] === 'percent') {
                    echo e((float)$val) . '%';
                } elseif ($f['type'] === 'enum') {
                    if ($key === 'status') {
                        echo '<span class="badge ' . ($val === 'aktif' ? 'badge-green' : 'badge-gray') . '">' . e(active_status_label($val)) . '</span>';
                    } elseif ($key === 'hari') {
                        $dayLabel = t('common.days.' . strtolower($val));
                        echo e($dayLabel !== 'common.days.' . strtolower($val) ? $dayLabel : $val);
                    } elseif ($key === 'jenis' && $activeSlug === 'asuransi') {
                        $typeLabel = t('common.insurance_types.' . strtolower($val));
                        echo e($typeLabel !== 'common.insurance_types.' . strtolower($val) ? $typeLabel : ucfirst($val));
                    } else {
                        echo e(ucfirst($val));
                    }
                } elseif ($f['type'] === 'readonly') {
                    echo '<code>' . e($val) . '</code>';
                } else {
                    echo e($val);
                }
              ?>
            </td>
          <?php endforeach; ?>
          <td class="cell-actions">
            <div class="cell-actions-inner">
            <a class="btn btn-sm btn-light" href="<?= legacy_url('modules/master/form.php?e=' . $activeSlug . '&id=' . $r['id']) ?>"
               data-modal-url="<?= legacy_url('modules/master/form.php?e=' . $activeSlug . '&id=' . $r['id'] . '&modal=1') ?>"
               data-modal-title="<?= e(t('common.edit_record', ['name' => $ent['singular']])) ?>"><?= e(t('common.edit')) ?></a>
            <form method="post" onsubmit="return confirm(<?= json_encode(t('common.delete_confirm_entity', ['name' => $ent['singular']]), JSON_UNESCAPED_UNICODE) ?>)">
              <?= sim_csrf_field() ?>
              <input type="hidden" name="aksi" value="hapus">
              <input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
              <button class="btn btn-sm btn-red" type="submit"><?= e(t('common.delete')) ?></button>
            </form>
            </div>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
  </div><!-- /.table-wrap -->
</div><!-- /.master-split -->

<!-- Modal tambah/edit data -->
<div class="modal-overlay" id="dataModal" aria-hidden="true">
  <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="dataModalTitle">
    <div class="modal-head">
      <div class="modal-title" id="dataModalTitle"><?= e(t('common.data')) ?></div>
      <button type="button" class="modal-close" data-modal-close aria-label="<?= e(t('common.close')) ?>">&times;</button>
    </div>
    <div class="modal-body" id="dataModalBody"></div>
  </div>
</div>
<script>
(function () {
  var overlay = document.getElementById('dataModal');
  var box     = document.getElementById('dataModalBody');
  var titleEl = document.getElementById('dataModalTitle');

  function open(url, title) {
    titleEl.textContent = title || <?= json_encode(t('common.data'), JSON_UNESCAPED_UNICODE) ?>;
    box.innerHTML = <?= json_encode('<div class="modal-loading">' . t('common.loading') . '</div>', JSON_UNESCAPED_UNICODE) ?>;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    fetch(url, { headers: { 'X-Requested-With': 'fetch' } })
      .then(function (r) { return r.text(); })
      .then(function (html) { box.innerHTML = html; bind(); var el = box.querySelector('input:not([disabled]),select,textarea'); if (el) el.focus(); });
  }
  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    box.innerHTML = '';
  }
  function bind() {
    var form = box.querySelector('form[data-modal-form]');
    if (!form) return;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('[type=submit]');
      if (btn) btn.disabled = true;
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'X-Requested-With': 'fetch' } })
        .then(function (r) {
          var ct = r.headers.get('content-type') || '';
          if (ct.indexOf('application/json') > -1) {
            return r.json().then(function (j) { if (j.ok) location.reload(); });
          }
          return r.text().then(function (html) { box.innerHTML = html; bind(); });
        })
        .catch(function () { if (btn) btn.disabled = false; });
    });
  }

  document.addEventListener('click', function (ev) {
    var opener = ev.target.closest('[data-modal-url]');
    if (opener) { ev.preventDefault(); open(opener.getAttribute('data-modal-url'), opener.getAttribute('data-modal-title')); return; }
    if (ev.target.closest('[data-modal-close]')) close(); // klik luar TIDAK menutup (cegah data hilang)
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && overlay.classList.contains('open')) close();
  });
})();
</script>
<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
