<!DOCTYPE html>
<html lang="{{ $currentLocale ?? app()->getLocale() }}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ __('app.login_title') }} · {{ config('sim-klinik.name') }}</title>
  <link rel="stylesheet" href="{{ asset('assets/css/login.css') }}?v={{ @filemtime(public_path('assets/css/login.css')) }}">
  <link rel="stylesheet" href="{{ asset('assets/css/lang-picker.css') }}?v={{ @filemtime(public_path('assets/css/lang-picker.css')) }}">
</head>
<body class="login-page">
<div class="login-split">
  <section class="login-brand">
    <span class="lb-badge">{!! app_icon('shield') !!} {{ __('app.login_badge') }}</span>
    <h1 class="lb-title">{!! __('app.login_headline') !!}</h1>
    <p class="lb-sub">{{ __('app.login_sub') }}</p>
    <div class="lb-foot">
      <div class="lb-foot-name">{{ $clinicName }}<small>{{ $clinicUnit }}</small></div>
      <span class="lb-secure">{!! app_icon('shield') !!} {{ __('app.login_secure') }}</span>
    </div>
  </section>

  <section class="login-form-side">
    <div class="login-card">
      <div class="login-lang-wrap">
        @include('components.lang-switcher')
      </div>
      <div class="lc-logo">
        <div class="lc-logo-name">SIM <span>Klinik</span></div>
        <div class="lc-logo-sub">{{ config('sim-klinik.full') }}</div>
      </div>

      <h2 class="lc-welcome">{{ __('app.login_welcome') }}</h2>
      <p class="lc-welcome-sub">{!! __('app.login_welcome_sub') !!}</p>

      @if($errors->any())
        <div class="lc-alert">{{ $errors->first() }}</div>
      @endif

      <form method="post" action="{{ route('login') }}">
        @csrf
        <div class="lc-field">
          <label>{{ __('app.login_username') }}</label>
          <div class="lc-input">
            {!! app_icon('user') !!}
            <input type="text" name="username" placeholder="{{ __('app.login_username_ph') }}" autofocus
                   value="{{ old('username') }}">
          </div>
        </div>

        <div class="lc-field">
          <label>{{ __('app.login_password') }}</label>
          <div class="lc-input">
            {!! app_icon('shield') !!}
            <input type="password" name="password" id="pwd" placeholder="{{ __('app.login_password_ph') }}">
            <button type="button" class="lc-eye" onclick="togglePwd(this)" aria-label="{{ __('app.login_toggle_pwd') }}">{!! app_icon('eye') !!}</button>
          </div>
        </div>

        <button type="submit" class="lc-btn">{!! app_icon('logout') !!} {{ __('app.login_submit') }}</button>
      </form>

      <div class="lc-foot">
        &copy; {{ date('Y') }} <b>{{ config('sim-klinik.name') }}</b><br>
        {{ __('app.login_managed_by', ['name' => $clinicName]) }}
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
