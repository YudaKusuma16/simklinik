<?php
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/icons.php';
require_once __DIR__ . '/../includes/lang.php';

if (is_logged_in()) {
    legacy_redirect('modules/dashboard/index.php');
}

$error = null;
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    sim_csrf_verify();
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    if ($username === '' || $password === '') {
        $error = t('app.login_err_required');
    } elseif (attempt_login($username, $password)) {
        legacy_redirect('modules/dashboard/index.php');
    } else {
        $error = t('app.login_failed');
    }
}
$flash = get_flash();
?>
<!DOCTYPE html>
<html lang="<?= e(app_locale()) ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e(t('app.login_title')) ?> &middot; <?= APP_NAME ?></title>
  <link rel="stylesheet" href="<?= legacy_url('assets/css/login.css') ?>?v=<?= @filemtime(ASSETS_FS_PATH . '/css/login.css') ?>">
  <link rel="stylesheet" href="<?= legacy_url('assets/css/lang-picker.css') ?>?v=<?= @filemtime(ASSETS_FS_PATH . '/css/lang-picker.css') ?>">
</head>
<body class="login-page">
<div class="login-split">

  <!-- ============ Panel kiri: branding ============ -->
  <section class="login-brand">
    <span class="lb-badge"><?= app_icon('shield') ?> <?= e(t('app.login_badge')) ?></span>

    <h1 class="lb-title"><?= t('app.login_headline') ?></h1>
    <p class="lb-sub"><?= e(t('app.login_sub')) ?></p>

    <div class="lb-features">
      <div class="lb-feat">
        <span class="lb-feat-ico"><?= app_icon('registrasi') ?></span>
        <div>
          <h4><?= e(t('app.login_feat_reg_title')) ?></h4>
          <p><?= e(t('app.login_feat_reg_desc')) ?></p>
        </div>
      </div>
      <div class="lb-feat">
        <span class="lb-feat-ico"><?= app_icon('rekam') ?></span>
        <div>
          <h4><?= e(t('app.login_feat_emr_title')) ?></h4>
          <p><?= e(t('app.login_feat_emr_desc')) ?></p>
        </div>
      </div>
      <div class="lb-feat">
        <span class="lb-feat-ico"><?= app_icon('money') ?></span>
        <div>
          <h4><?= e(t('app.login_feat_bill_title')) ?></h4>
          <p><?= e(t('app.login_feat_bill_desc')) ?></p>
        </div>
      </div>
    </div>

    <div class="lb-foot">
      <div class="lb-foot-name"><?= e(CLINIC_NAME) ?><small><?= e(CLINIC_UNIT) ?></small></div>
      <span class="lb-secure"><?= app_icon('shield') ?> <?= e(t('app.login_secure')) ?></span>
    </div>
  </section>

  <!-- ============ Panel kanan: form login ============ -->
  <section class="login-form-side">
    <div class="login-card">
      <div class="login-lang-wrap" style="display:flex;justify-content:flex-end;margin-bottom:12px;">
        <?= lang_switcher_html() ?>
      </div>

      <div class="lc-logo">
        <img src="<?= legacy_url('assets/img/logo.png') ?>" alt="<?= e(APP_NAME) ?>">
        <div class="lc-logo-name">SIM <span>Klinik</span></div>
        <div class="lc-logo-sub"><?= APP_FULL ?></div>
      </div>

      <h2 class="lc-welcome"><?= e(t('app.login_welcome')) ?></h2>
      <p class="lc-welcome-sub"><?= t('app.login_welcome_sub') ?></p>

      <?php if ($flash): ?>
        <div class="lc-alert warn"><?= e($flash['msg']) ?></div>
      <?php endif; ?>
      <?php if ($error): ?>
        <div class="lc-alert"><?= e($error) ?></div>
      <?php endif; ?>

      <form method="post" action="">
        <?= sim_csrf_field() ?>

        <div class="lc-field">
          <label><?= e(t('app.login_username')) ?></label>
          <div class="lc-input">
            <?= app_icon('user') ?>
            <input type="text" name="username" placeholder="<?= e(t('app.login_username_ph')) ?>" autofocus
                   value="<?= e($_POST['username'] ?? '') ?>">
          </div>
        </div>

        <div class="lc-field">
          <label><?= e(t('app.login_password')) ?></label>
          <div class="lc-input">
            <?= app_icon('shield') ?>
            <input type="password" name="password" id="pwd" placeholder="<?= e(t('app.login_password_ph')) ?>">
            <button type="button" class="lc-eye" onclick="togglePwd(this)" aria-label="<?= e(t('app.login_toggle_pwd')) ?>"><?= app_icon('eye') ?></button>
          </div>
        </div>

        <label class="lc-remember">
          <input type="checkbox" name="remember" value="1"> <?= e(t('app.login_remember')) ?>
        </label>

        <button type="submit" class="lc-btn"><?= app_icon('logout') ?> <?= e(t('app.login_submit')) ?></button>
      </form>

      <div class="lc-note">
        <?= app_icon('shield') ?>
        <span><?= e(t('app.login_security_note')) ?></span>
      </div>

      <div class="lc-foot">
        &copy; <?= date('Y') ?> <b><?= APP_NAME ?></b><br>
        <?= e(t('app.login_managed_by', ['name' => CLINIC_NAME])) ?>
      </div>
    </div>
  </section>

</div>

<script>
function togglePwd(btn){
  var i = document.getElementById('pwd');
  i.type = i.type === 'password' ? 'text' : 'password';
  btn.style.color = i.type === 'text' ? '#2563eb' : '';
}
</script>
</body>
</html>
