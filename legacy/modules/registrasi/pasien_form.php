<?php
require_once __DIR__ . '/../../includes/auth.php';
require_role('registrasi', 'admin', 'superadmin');

$id = (int) ($_GET['id'] ?? 0);
$isEdit = $id > 0;
$pageTitle = $isEdit ? t('pages.patient_edit') : t('pages.patient_new');

$kelompok = db()->query("SELECT id, nama FROM kelompok_pasien ORDER BY id")->fetchAll();

/*
 * Definisi field pasien — dikelompokkan per seksi.
 * Untuk MENAMBAH data pasien baru nanti: tambah kolom di tabel `pasien`
 * (lihat database/migrasi_pasien_lengkap.sql) lalu tambah satu baris di sini.
 *
 * type : text | date | email | tel | number | textarea | select | fk
 * span : 'full' untuk membentang 2 kolom (default setengah)
 */
$opt = function(array $list) {
    $res = [];
    foreach ($list as $item) {
        $key = 'common.options.' . strtolower(str_replace(['/', ' '], '_', $item));
        $trans = t($key);
        $res[$item] = ($trans !== $key) ? $trans : $item;
    }
    return $res;
};

$sections = [
    [t('common.patient_identity'), 'user', 'acc-blue', [
        'nama'            => ['label' => t('common.full_name'), 'type' => 'text', 'required' => true, 'span' => 'full', 'autofocus' => true],
        'nik'             => ['label' => t('common.nik_label'), 'type' => 'text', 'inputmode' => 'numeric'],
        'no_passport'     => ['label' => t('common.passport_kitas_no'), 'type' => 'text'],
        'tempat_lahir'    => ['label' => t('common.place_of_birth'), 'type' => 'text'],
        'tgl_lahir'       => ['label' => t('common.birth_date'), 'type' => 'date'],
        'jenis_kelamin'   => ['label' => t('common.gender_label'), 'type' => 'select', 'required' => true,
                              'options' => ['L' => t('common.male'), 'P' => t('common.female')], 'default' => 'L'],
        'gol_darah'       => ['label' => t('common.blood_group'), 'type' => 'select',
                              'options' => ['-' => '-', 'A' => 'A', 'A+' => 'A+', 'A-' => 'A-', 'B' => 'B', 'B+' => 'B+', 'B-' => 'B-', 'AB' => 'AB', 'AB+' => 'AB+', 'AB-' => 'AB-', 'O' => 'O', 'O+' => 'O+', 'O-' => 'O-'], 'default' => '-'],
        'agama'           => ['label' => t('common.religion'), 'type' => 'select',
                              'options' => $opt(['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya'])],
        'status_kawin'    => ['label' => t('common.marital_status'), 'type' => 'select',
                              'options' => $opt(['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'])],
        'pendidikan'      => ['label' => t('common.education'), 'type' => 'select',
                              'options' => $opt(['Tidak Sekolah', 'SD', 'SMP', 'SMA/SMK', 'D1/D2/D3', 'S1', 'S2', 'S3'])],
        'kewarganegaraan' => ['label' => t('common.nationality'), 'type' => 'select',
                              'options' => ['WNI' => t('common.options.wni'), 'WNA' => t('common.options.wna')], 'default' => 'WNI'],
    ]],
    [t('common.address_contact'), 'map-pin', 'acc-green', [
        'alamat'     => ['label' => t('common.full_address'), 'type' => 'textarea', 'span' => 'full'],
        'kelurahan'  => ['label' => t('common.village'), 'type' => 'autocomplete', 'ac-field' => 'kelurahan'],
        'kecamatan'  => ['label' => t('common.district'), 'type' => 'autocomplete', 'ac-field' => 'kecamatan'],
        'kota'       => ['label' => t('common.city_regency'), 'type' => 'autocomplete', 'ac-field' => 'kota'],
        'provinsi'   => ['label' => t('common.province'), 'type' => 'autocomplete', 'ac-field' => 'provinsi'],
        'kode_pos'   => ['label' => t('common.postal_code'), 'type' => 'text'],
        'telepon'    => ['label' => t('common.phone'), 'type' => 'tel'],
        'email'      => ['label' => t('common.email'), 'type' => 'email'],
    ]],
    [t('common.guarantor_job'), 'shield', 'acc-orange', [
        'kelompok_id' => ['label' => t('common.guarantor_label'), 'type' => 'fk'],
        'no_asuransi' => ['label' => t('common.insurance_no'), 'type' => 'text'],
        'pekerjaan'   => ['label' => t('common.occupation'), 'type' => 'text'],
    ]],
    [t('common.emergency_contact'), 'users', 'acc-purple', [
        'kontak_nama'     => ['label' => t('common.emergency_contact_name'), 'type' => 'text'],
        'kontak_hubungan' => ['label' => t('common.relationship'), 'type' => 'text', 'placeholder' => t('common.placeholder_relationship')],
        'kontak_telepon'  => ['label' => t('common.contact_phone'), 'type' => 'tel'],
    ]],
    [t('common.medical_info'), 'pills', 'acc-red', [
        'alergi'           => ['label' => t('common.allergy_history'), 'type' => 'text', 'span' => 'full', 'placeholder' => t('common.placeholder_allergy')],
        'riwayat_penyakit' => ['label' => t('common.medical_history'), 'type' => 'textarea', 'span' => 'full', 'placeholder' => t('common.placeholder_medical_history')],
    ]],
];

// Flatten definisi -> daftar field tunggal (fields = elemen ke-4 tiap seksi)
$fields = [];
foreach ($sections as $sec) $fields += $sec[3];

// Data awal (default per field)
$data = ['no_mr' => ''];
foreach ($fields as $key => $f) $data[$key] = $f['default'] ?? '';

if ($isEdit) {
    $stmt = db()->prepare("SELECT * FROM pasien WHERE id = ?");
    $stmt->execute([$id]);
    $found = $stmt->fetch();
    if (!$found) { set_flash('danger', t('common.patient_not_found')); legacy_redirect('modules/registrasi/pasien.php'); }
    $data = array_merge($data, $found);
}

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    sim_csrf_verify();
    foreach ($fields as $key => $f) $data[$key] = trim($_POST[$key] ?? '');

    if ($data['nama'] === '') $errors[] = t('common.err_name_required');
    if (!in_array($data['jenis_kelamin'], ['L', 'P'], true)) $errors[] = t('common.err_gender_invalid');

    if (!$errors) {
        // Siapkan nilai untuk DB (kosong -> NULL, fk -> int)
        $store = [];
        foreach ($fields as $key => $f) {
            $v = $data[$key];
            if (($f['type'] ?? '') === 'fk') {
                $store[$key] = ($v === '' ? null : (int) $v);
            } else {
                $store[$key] = ($v === '' ? null : $v);
            }
        }

        if ($isEdit) {
            $set = implode(', ', array_map(fn($c) => "$c = ?", array_keys($store)));
            $params = array_values($store);
            $params[] = $id;
            db()->prepare("UPDATE pasien SET {$set} WHERE id = ?")->execute($params);
            set_flash('success', t('common.patient_updated_flash'));
            legacy_redirect('modules/registrasi/pasien.php?q=' . urlencode($data['nama']));
        } else {
            // generate No. MR: GBK0001
            $next = (int) db()->query("SELECT COALESCE(MAX(id),0)+1 FROM pasien")->fetchColumn();
            $noMr = 'GBK' . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
            $cols = array_merge(['no_mr'], array_keys($store));
            $ph   = implode(', ', array_fill(0, count($cols), '?'));
            $vals = array_merge([$noMr], array_values($store));
            db()->prepare("INSERT INTO pasien (" . implode(', ', $cols) . ") VALUES ({$ph})")->execute($vals);
            $newId = (int) db()->lastInsertId();
            set_flash('success', t('common.patient_saved_and_queue', ['no_mr' => $noMr]));
            legacy_redirect('modules/registrasi/daftar.php?pasien_id=' . $newId);
        }
    }
}

require_once __DIR__ . '/../../includes/header.php';
?>
<div class="page-toolbar">
  <div>
    <div class="pt-title"><?= e($pageTitle) ?></div>
    <div class="pt-sub"><?= $isEdit ? 'No. MR: <b>' . e($data['no_mr']) . '</b>' : e(t('common.auto_mr_notice')) ?></div>
  </div>
  <div class="pt-actions">
    <a class="btn-back" href="<?= legacy_url('modules/registrasi/pasien.php') ?>"><?= app_icon('chevron') ?> <?= e(t('common.back')) ?></a>
  </div>
</div>

<?php if ($errors): ?>
  <div class="alert alert-danger"><?= implode('<br>', array_map('e', $errors)) ?></div>
<?php endif; ?>

<form method="post">
  <?= sim_csrf_field() ?>
  <?php foreach ($sections as [$secTitle, $secIcon, $secAcc, $secFields]): ?>
    <div class="card" style="margin-bottom:16px">
      <div class="step-head">
        <div class="step-num <?= e($secAcc) ?>"><?= app_icon($secIcon) ?></div>
        <div><div class="st-title"><?= e($secTitle) ?></div></div>
      </div>
      <div class="field-grid">
        <?php foreach ($secFields as $key => $f): $val = $data[$key] ?? ''; $req = !empty($f['required']); ?>
          <div class="form-group<?= ($f['span'] ?? '') === 'full' ? ' fg-full' : '' ?>">
            <label><?= e($f['label']) ?><?= $req ? ' <span class="req">*</span>' : '' ?></label>
            <?php
              $attr = ($req ? ' required' : '')
                    . (!empty($f['autofocus']) ? ' autofocus' : '')
                    . (!empty($f['inputmode']) ? ' inputmode="' . e($f['inputmode']) . '"' : '')
                    . (!empty($f['placeholder']) ? ' placeholder="' . e($f['placeholder']) . '"' : '');
              $type = $f['type'];
            ?>
            <?php if ($type === 'textarea'): ?>
              <textarea name="<?= $key ?>" class="form-control" rows="2"<?= $attr ?>><?= e($val) ?></textarea>

            <?php elseif ($type === 'select'): ?>
              <select name="<?= $key ?>" class="form-control"<?= $req ? ' required' : '' ?>>
                <?php if (!$req): ?><option value=""><?= e(t('common.select_option')) ?></option><?php endif; ?>
                <?php foreach ($f['options'] as $ov => $ol): ?>
                  <option value="<?= e($ov) ?>" <?= (string) $val === (string) $ov ? 'selected' : '' ?>><?= e($ol) ?></option>
                <?php endforeach; ?>
              </select>

            <?php elseif ($type === 'fk'): ?>
              <select name="<?= $key ?>" class="form-control">
                <option value=""><?= e(t('common.select_option')) ?></option>
                <?php foreach ($kelompok as $k): ?>
                  <?php
                    $optKey = 'common.options.' . strtolower(str_replace(['/', ' '], '_', $k['nama']));
                    $trans = t($optKey);
                    $label = ($trans !== $optKey) ? $trans : $k['nama'];
                  ?>
                  <option value="<?= $k['id'] ?>" <?= (string) $val === (string) $k['id'] ? 'selected' : '' ?>><?= e($label) ?></option>
                <?php endforeach; ?>
              </select>

            <?php elseif ($type === 'autocomplete'): $acField = $f['ac-field']; ?>
              <div class="ac-wrap" style="position:relative">
                <input type="text" name="<?= $key ?>" id="ac_<?= $key ?>" class="form-control" value="<?= e($val) ?>"<?= $attr ?>
                  autocomplete="off" data-ac-field="<?= $acField ?>">
                <ul class="ac-dropdown" id="ac_drop_<?= $key ?>"></ul>
              </div>

            <?php else: /* text | date | email | tel | number */ ?>
              <input type="<?= e($type) ?>" name="<?= $key ?>" class="form-control" value="<?= e($val) ?>"<?= $attr ?>>
            <?php endif; ?>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  <?php endforeach; ?>

  <div class="form-actions" style="position:sticky;bottom:0;background:var(--bg);padding:14px 0">
    <a class="btn btn-light" href="<?= legacy_url('modules/registrasi/pasien.php') ?>"><?= e(t('common.cancel')) ?></a>
    <button class="btn" type="submit"><?= app_icon('save') ?> <?= e(t('common.save_patient')) ?></button>
  </div>
</form>
<?php require_once __DIR__ . '/../../includes/footer.php'; ?>

<style>
.ac-wrap { position: relative; }
.ac-dropdown {
  display: none;
  position: absolute;
  z-index: 9999;
  top: calc(100% + 2px);
  left: 0; right: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
  margin: 0; padding: 4px 0;
  list-style: none;
  max-height: 260px;
  overflow-y: auto;
}
.ac-dropdown.open { display: block; }
.ac-dropdown li {
  padding: 9px 14px;
  cursor: pointer;
  font-size: 13.5px;
  line-height: 1.4;
  border-bottom: 1px solid var(--border);
  transition: background .12s;
}
.ac-dropdown li:last-child { border-bottom: none; }
.ac-dropdown li:hover, .ac-dropdown li.active { background: var(--accent-soft, rgba(99,102,241,.1)); }
.ac-dropdown li .ac-main { font-weight: 600; color: var(--text); }
.ac-dropdown li .ac-sub { color: var(--muted); font-size: 12px; margin-top: 2px; }
.ac-dropdown li .ac-badge {
  display: inline-block; font-size: 11px;
  background: var(--accent-soft, #eef2ff); color: var(--accent, #6366f1);
  border-radius: 4px; padding: 1px 5px; margin-left: 5px;
}
</style>

<script>
(function () {
  var API_URL = '<?= legacy_url('modules/registrasi/wilayah_search.php') ?>';
  var cache = {};
  var activeIdx = -1;

  function debounce(fn, ms) {
    var t; return function() { clearTimeout(t); t = setTimeout(fn.bind(this, arguments), ms); };
  }

  function showDropdown(drop, items, inputEl) {
    drop.innerHTML = '';
    activeIdx = -1;
    if (!items.length) { drop.classList.remove('open'); return; }

    items.forEach(function(item, i) {
      var li = document.createElement('li');
      var sub = [item.kecamatan, item.kota, item.provinsi].filter(Boolean).join(' › ');
      var badge = item.kode_pos ? '<span class="ac-badge">' + item.kode_pos + '</span>' : '';
      li.innerHTML = '<div class="ac-main">' + item.kelurahan + badge + '</div>'
                   + '<div class="ac-sub">' + sub + '</div>';
      li.addEventListener('mousedown', function(e) {
        e.preventDefault();
        fillFields(item);
        drop.classList.remove('open');
      });
      drop.appendChild(li);
    });
    drop.classList.add('open');
  }

  function fillFields(item) {
    var map = {
      kelurahan: item.kelurahan,
      kecamatan: item.kecamatan,
      kota:      item.kota,
      provinsi:  item.provinsi,
      kode_pos:  item.kode_pos || ''
    };
    Object.keys(map).forEach(function(k) {
      var el = document.querySelector('[name="' + k + '"]');
      if (el) el.value = map[k] || '';
    });
  }

  function search(q, field, callback) {
    var key = field + ':' + q;
    if (cache[key]) { callback(cache[key]); return; }
    fetch(API_URL + '?q=' + encodeURIComponent(q) + '&field=' + field)
      .then(function(r) { return r.json(); })
      .then(function(data) { cache[key] = data; callback(data); })
      .catch(function() { callback([]); });
  }

  document.querySelectorAll('[data-ac-field]').forEach(function(input) {
    var field = input.getAttribute('data-ac-field');
    var drop  = document.getElementById('ac_drop_' + input.name);
    var items = [];

    var doSearch = debounce(function() {
      var q = input.value.trim();
      if (q.length < 2) { drop.classList.remove('open'); return; }
      search(q, field, function(data) {
        items = data;
        showDropdown(drop, data, input);
      });
    }, 300);

    input.addEventListener('input', doSearch);
    input.addEventListener('focus', doSearch);

    input.addEventListener('keydown', function(e) {
      var lis = drop.querySelectorAll('li');
      if (!lis.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeIdx < lis.length - 1) activeIdx++;
        lis.forEach(function(l, i) { l.classList.toggle('active', i === activeIdx); });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeIdx > 0) activeIdx--;
        lis.forEach(function(l, i) { l.classList.toggle('active', i === activeIdx); });
      } else if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault();
        fillFields(items[activeIdx]);
        drop.classList.remove('open');
      } else if (e.key === 'Escape') {
        drop.classList.remove('open');
      }
    });

    document.addEventListener('click', function(e) {
      if (!input.contains(e.target) && !drop.contains(e.target)) {
        drop.classList.remove('open');
      }
    });
  });
})();
</script>

