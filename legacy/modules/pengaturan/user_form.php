<?php
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/icons.php'; // app_icon() juga dipakai saat mode modal (tanpa header.php)
require_role('superadmin');

$id = (int) ($_GET['id'] ?? 0);
$isEdit = $id > 0;
$pageTitle = $isEdit ? t('common.edit_user') : t('common.add_user');

// Mode modal: hanya kirim potongan form (tanpa header/sidebar), submit via fetch
$modal = isset($_GET['modal']);
$formAction = legacy_url('modules/pengaturan/user_form.php' . ($isEdit ? '?id=' . $id . ($modal ? '&modal=1' : '') : ($modal ? '?modal=1' : '')));

$roles = db()->query("SELECT id, kode, nama FROM roles ORDER BY id")->fetchAll();
$poliList = db()->query("SELECT id, nama FROM poli WHERE status='aktif' ORDER BY nama")->fetchAll();
// Peta role_id => kode, untuk menentukan apakah role yang dipilih adalah dokter.
$roleKode = [];
foreach ($roles as $r) $roleKode[(string) $r['id']] = $r['kode'];

$data = ['nama' => '', 'username' => '', 'email' => '', 'telepon' => '', 'role_id' => '', 'poli_id' => '', 'status' => 'aktif'];
if ($isEdit) {
    $s = db()->prepare("SELECT * FROM users WHERE id=?"); $s->execute([$id]);
    $row = $s->fetch();
    if (!$row) { set_flash('danger', t('common.err_user_not_found')); legacy_redirect('modules/pengaturan/users.php'); }
    $data = array_merge($data, $row);
}

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    sim_csrf_verify();
    foreach (['nama', 'username', 'email', 'telepon', 'role_id', 'poli_id', 'status'] as $k) $data[$k] = trim($_POST[$k] ?? '');
    $password = $_POST['password'] ?? '';

    // Poli hanya relevan untuk role Dokter; abaikan untuk role lain.
    $isDokter = ($roleKode[$data['role_id']] ?? '') === 'dokter';
    $poliId = ($isDokter && $data['poli_id'] !== '') ? (int) $data['poli_id'] : null;

    if ($data['nama'] === '') $errors[] = t('common.err_name_required');
    if ($data['username'] === '') $errors[] = t('common.err_username_required');
    if (!$data['role_id']) $errors[] = t('common.err_role_required');
    if ($isDokter && !$poliId) $errors[] = t('common.err_poli_required_for_doctor');
    if (!$isEdit && $password === '') $errors[] = t('common.err_password_required_new_user');
    if ($password !== '' && strlen($password) < 5) $errors[] = t('common.err_password_min_5');

    if (!$errors) {
        try {
            if ($isEdit) {
                if ($password !== '') {
                    db()->prepare("UPDATE users SET nama=?, username=?, email=?, telepon=?, role_id=?, poli_id=?, status=?, password=? WHERE id=?")
                      ->execute([$data['nama'], $data['username'], $data['email'] ?: null, $data['telepon'] ?: null,
                          (int)$data['role_id'], $poliId, $data['status'], password_hash($password, PASSWORD_BCRYPT), $id]);
                } else {
                    db()->prepare("UPDATE users SET nama=?, username=?, email=?, telepon=?, role_id=?, poli_id=?, status=? WHERE id=?")
                      ->execute([$data['nama'], $data['username'], $data['email'] ?: null, $data['telepon'] ?: null,
                          (int)$data['role_id'], $poliId, $data['status'], $id]);
                }
                set_flash('success', t('common.user_updated_flash'));
            } else {
                db()->prepare("INSERT INTO users (nama, username, email, telepon, role_id, poli_id, status, password) VALUES (?,?,?,?,?,?,?,?)")
                  ->execute([$data['nama'], $data['username'], $data['email'] ?: null, $data['telepon'] ?: null,
                      (int)$data['role_id'], $poliId, $data['status'], password_hash($password, PASSWORD_BCRYPT)]);
                set_flash('success', t('common.user_added_flash'));
            }
            if ($modal) {
                header('Content-Type: application/json');
                echo json_encode(['ok' => true]);
                exit;
            }
            legacy_redirect('modules/pengaturan/users.php');
        } catch (Throwable $ex) {
            $errors[] = (str_contains($ex->getMessage(), '1062')) ? t('common.err_username_taken') : 'Gagal menyimpan: ' . $ex->getMessage();
        }
    }
}

// Tampilkan field Poli sejak awal bila role terpilih adalah dokter.
$showPoli = ($roleKode[(string) $data['role_id']] ?? '') === 'dokter';

if (!$modal):
    require_once __DIR__ . '/../../includes/header.php';
?>
<div class="page-toolbar">
  <div>
    <div class="pt-title"><?= app_icon("user") ?> <?= e($pageTitle) ?></div>
    <div class="pt-sub"><?= e($isEdit ? t('common.edit_user_sub') : t('common.add_user_sub')) ?></div>
  </div>
  <div class="pt-actions">
    <a href="<?= legacy_url('modules/pengaturan/users.php') ?>" class="btn btn-light btn-sm"><?= app_icon("arrowleft") ?> <?= e(t('pages.users')) ?></a>
  </div>
</div>
<div class="card" style="max-width:720px;margin-top:18px">
<?php endif; ?>

  <?php if ($errors): ?><div class="alert alert-danger"><?= implode('<br>', array_map('e', $errors)) ?></div><?php endif; ?>

  <form method="post" action="<?= e($formAction) ?>"<?= $modal ? ' data-modal-form' : '' ?>>
    <?= sim_csrf_field() ?>
    <div class="form-row">
      <div class="form-group"><label><?= e(t('common.full_name')) ?> <span class="req">*</span></label><input type="text" name="nama" class="form-control" value="<?= e($data['nama']) ?>" required></div>
      <div class="form-group"><label><?= e(t('common.username')) ?> <span class="req">*</span></label><input type="text" name="username" class="form-control" value="<?= e($data['username']) ?>" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label><?= e(t('common.role')) ?> <span class="req">*</span></label>
        <select name="role_id" class="form-control" id="roleSelect" required
          onchange="var o=this.options[this.selectedIndex];document.getElementById('poliRow').style.display=(o&&o.getAttribute('data-kode')==='dokter')?'':'none';">
          <option value=""><?= e(t('common.select_option')) ?></option>
          <?php foreach ($roles as $r): ?><option value="<?= $r['id'] ?>" data-kode="<?= e($r['kode']) ?>" <?= (string)$data['role_id'] === (string)$r['id'] ? 'selected' : '' ?>><?= e(role_label($r['kode'], $r['nama'])) ?></option><?php endforeach; ?>
        </select>
      </div>
      <div class="form-group"><label><?= e(t('common.status')) ?></label>
        <select name="status" class="form-control">
          <option value="aktif" <?= $data['status'] === 'aktif' ? 'selected' : '' ?>><?= e(active_status_label('aktif')) ?></option>
          <option value="nonaktif" <?= $data['status'] === 'nonaktif' ? 'selected' : '' ?>><?= e(active_status_label('nonaktif')) ?></option>
        </select>
      </div>
    </div>
    <div class="form-row" id="poliRow" style="display:<?= $showPoli ? '' : 'none' ?>">
      <div class="form-group"><label><?= e(t('common.polyclinic')) ?> <span class="req">*</span></label>
        <select name="poli_id" class="form-control" id="poliSelect">
          <option value=""><?= e(t('common.select_polyclinic')) ?></option>
          <?php foreach ($poliList as $po): ?><option value="<?= $po['id'] ?>" <?= (string)$data['poli_id'] === (string)$po['id'] ? 'selected' : '' ?>><?= e($po['nama']) ?></option><?php endforeach; ?>
        </select>
      </div>
      <div class="form-group"><label>&nbsp;</label>
        <div class="poli-hint"><?= app_icon('alert') ?> <span><?= e(t('common.doctor_poli_hint')) ?></span></div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label><?= e(t('common.email')) ?></label><input type="email" name="email" class="form-control" value="<?= e($data['email']) ?>"></div>
      <div class="form-group"><label><?= e(t('common.phone')) ?></label><input type="text" name="telepon" class="form-control" value="<?= e($data['telepon']) ?>"></div>
    </div>
    <div class="form-group">
      <label><?= e(t('common.password')) ?> <?= $isEdit ? e(t('common.password_leave_blank_hint')) : '<span class="req">*</span>' ?></label>
      <input type="password" name="password" class="form-control" <?= $isEdit ? '' : 'required' ?>>
    </div>

    <div class="form-actions">
      <button class="btn" type="submit"><?= app_icon("save") ?> <?= e(t('common.save')) ?></button>
      <?php if ($modal): ?>
        <button type="button" class="btn btn-light" data-modal-close><?= e(t('common.cancel')) ?></button>
      <?php else: ?>
        <a class="btn btn-light" href="<?= legacy_url('modules/pengaturan/users.php') ?>"><?= e(t('common.cancel')) ?></a>
      <?php endif; ?>
    </div>
  </form>

<?php if (!$modal): ?>
</div>
<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
<?php endif; ?>
