<?php
require_once __DIR__ . '/../../includes/auth.php';
require_role('registrasi', 'admin', 'superadmin');
require_once __DIR__ . '/../../includes/icons.php'; // agar app_icon() tersedia di mode modal

$modal = isset($_GET['modal']);
$id = (int) ($_GET['id'] ?? 0);

$stmt = db()->prepare(
    "SELECT p.*, kp.nama AS kelompok FROM pasien p
     LEFT JOIN kelompok_pasien kp ON kp.id = p.kelompok_id
     WHERE p.id = ?"
);
$stmt->execute([$id]);
$p = $stmt->fetch();

if (!$p) {
    if ($modal) { echo '<div class="alert alert-danger">' . e(t('common.patient_not_found')) . '</div>'; exit; }
    set_flash('danger', t('common.patient_not_found'));
    legacy_redirect('modules/registrasi/pasien.php');
}

// Hitung umur dari tanggal lahir (format senada rekam medis)
$umur = $p['tgl_lahir'] ? (int) ((time() - strtotime($p['tgl_lahir'])) / 31556952) . ' ' . t('common.years_old') : '-';

// Seksi tampilan — cermin dari pasien_form.php (label & pengelompokan)
$sections = [
    [t('common.patient_identity'), 'user', 'acc-blue', [
        'nik'             => t('common.nik_label'),
        'no_passport'     => t('common.passport_kitas_no'),
        'tempat_lahir'    => t('common.place_of_birth'),
        'tgl_lahir'       => t('common.birth_date'),
        'jenis_kelamin'   => t('common.gender_label'),
        'gol_darah'       => t('common.blood_group'),
        'agama'           => t('common.religion'),
        'status_kawin'    => t('common.marital_status'),
        'pendidikan'      => t('common.education'),
        'kewarganegaraan' => t('common.nationality'),
    ]],
    [t('common.address_contact'), 'map-pin', 'acc-green', [
        'alamat'     => [t('common.full_address'), 'full'],
        'kelurahan'  => t('common.village'),
        'kecamatan'  => t('common.district'),
        'kota'       => t('common.city_regency'),
        'provinsi'   => t('common.province'),
        'kode_pos'   => t('common.postal_code'),
        'telepon'    => t('common.phone'),
        'email'      => t('common.email'),
    ]],
    [t('common.guarantor_job'), 'shield', 'acc-orange', [
        'kelompok'    => t('common.guarantor_label'),
        'no_asuransi' => t('common.insurance_no'),
        'pekerjaan'   => t('common.occupation'),
    ]],
    [t('common.emergency_contact'), 'users', 'acc-purple', [
        'kontak_nama'     => t('common.emergency_contact_name'),
        'kontak_hubungan' => t('common.relationship'),
        'kontak_telepon'  => t('common.contact_phone'),
    ]],
    [t('common.medical_info'), 'pills', 'acc-red', [
        'alergi'           => [t('common.allergy_history'), 'full'],
        'riwayat_penyakit' => [t('common.medical_history'), 'full'],
    ]],
];

// Format satu nilai menjadi string siap-tampil
$fmt = function (string $key, $val): string {
    if ($key === 'jenis_kelamin') return $val === 'L' ? t('common.male') : ($val === 'P' ? t('common.female') : '');
    if ($key === 'tgl_lahir') return $val ? tgl_id($val) : '';
    if ($key === 'gol_darah') return ($val && $val !== '-') ? $val : '';
    if (in_array($key, ['agama', 'status_kawin', 'pendidikan', 'kewarganegaraan', 'kelompok'], true) && $val) {
        $optKey = 'common.options.' . strtolower(str_replace(['/', ' '], '_', (string)$val));
        $trans = t($optKey);
        if ($trans !== $optKey) return $trans;
    }
    return (string) $val;
};

ob_start();
?>
<!-- Identitas ringkas — model senada rekam medis -->
<div class="card detail-id">
  <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <div>
      <div style="font-size:var(--fs-title);font-weight:700"><?= e($p['nama']) ?></div>
      <div style="color:var(--muted);margin-top:4px">
        No. MR <b><?= e($p['no_mr']) ?></b> &middot; <?= $p['jenis_kelamin'] === 'L' ? e(t('common.male')) : e(t('common.female')) ?>
        &middot; <?= e($umur) ?> &middot; <?php
          $kelVal = $p['kelompok'] ?? '';
          if ($kelVal !== '') {
              $optKey = 'common.options.' . strtolower(str_replace(['/', ' '], '_', $kelVal));
              $trans = t($optKey);
              echo e($trans !== $optKey ? $trans : $kelVal);
          } else {
              echo '-';
          }
        ?>
      </div>
      <div style="color:var(--muted)">
        <?= $p['tgl_lahir'] ? tgl_id($p['tgl_lahir']) : '-' ?>
        <?php if ($p['gol_darah'] && $p['gol_darah'] !== '-'): ?> &middot; <?= e(t('common.blood_group')) ?> <?= e($p['gol_darah']) ?><?php endif; ?>
      </div>
    </div>
    <div style="text-align:right">
      <?php if (!empty($p['alergi'])): ?><span class="badge badge-red"><?= app_icon('alert') ?> <?= e(t('common.allergy')) ?>: <?= e($p['alergi']) ?></span><?php endif; ?>
    </div>
  </div>
</div>

<?php foreach ($sections as [$title, $icon, $acc, $flds]): ?>
  <div class="detail-section">
    <div class="step-head">
      <div class="step-num <?= e($acc) ?>"><?= app_icon($icon) ?></div>
      <div><div class="st-title"><?= e($title) ?></div></div>
    </div>
    <div class="detail-grid">
      <?php foreach ($flds as $key => $meta):
        $label = is_array($meta) ? $meta[0] : $meta;
        $full  = is_array($meta) && ($meta[1] ?? '') === 'full';
        $value = $fmt($key, $p[$key] ?? '');
        $empty = trim($value) === '';
      ?>
        <div class="detail-item<?= $full ? ' dg-full' : '' ?>">
          <div class="di-label"><?= e($label) ?></div>
          <div class="di-value<?= $empty ? ' empty' : '' ?>"><?= $empty ? '—' : e($value) ?></div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
<?php endforeach; ?>

<div class="form-actions" style="margin-top:6px">
  <?php if ($modal): ?>
    <button type="button" class="btn btn-light" data-modal-close><?= e(t('common.close')) ?></button>
  <?php endif; ?>
  <a class="btn" href="<?= legacy_url('modules/registrasi/pasien_form.php?id=' . $p['id']) ?>"><?= app_icon('pencil') ?> <?= e(t('common.edit')) ?></a>
</div>
<?php
$body = ob_get_clean();

if ($modal) { echo $body; exit; }

// Mode halaman penuh
$pageTitle = t('pages.patient_detail');
require_once __DIR__ . '/../../includes/header.php';
?>
<div class="page-toolbar">
  <div>
    <div class="pt-title"><?= e(t('pages.patient_detail')) ?></div>
    <div class="pt-sub">No. MR: <b><?= e($p['no_mr']) ?></b></div>
  </div>
  <div class="pt-actions">
    <a class="btn-back" href="<?= legacy_url('modules/registrasi/pasien.php') ?>"><?= app_icon('chevron') ?> <?= e(t('common.back')) ?></a>
  </div>
</div>
<div class="card"><?= $body ?></div>
<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
