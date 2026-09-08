<!DOCTYPE html>
<html lang="{{ $currentLocale ?? app()->getLocale() }}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ $pageTitle ?? __('app.dashboard') }} · {{ config('sim-klinik.name') }}</title>
  <script>(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);})();</script>
  <link rel="stylesheet" href="{{ asset('assets/vendor/datatables.min.css') }}">
  <link rel="stylesheet" href="{{ asset('assets/css/style.css') }}?v={{ @filemtime(public_path('assets/css/style.css')) }}">
  <link rel="stylesheet" href="{{ asset('assets/css/lang-picker.css') }}?v={{ @filemtime(public_path('assets/css/lang-picker.css')) }}">
</head>
<body>
<div class="layout" id="appLayout">
  <script>if(localStorage.getItem('sidebar')==='collapsed'){document.getElementById('appLayout').classList.add('collapsed');}</script>

  @include('components.sidebar')

  <button type="button" class="sidebar-backdrop" onclick="closeSidebar()" aria-label="{{ __('app.close_menu') }}" tabindex="-1"></button>

  <div class="main">
    <header class="topbar">
      <div class="topbar-left">
        <button class="menu-toggle" type="button" id="menuToggle" onclick="toggleSidebar()" title="{{ __('app.toggle_menu') }}" aria-expanded="false" aria-controls="appSidebar">
          <span class="mt-bars">{!! app_icon('menu') !!}</span>
          <span class="mt-x">{!! app_icon('close') !!}</span>
        </button>
        <div class="topbar-search">
          <span class="ts-ico">{!! app_icon('search') !!}</span>
          <input type="search" id="menuSearch" placeholder="{{ __('app.search_menu') }}" autocomplete="off">
        </div>
      </div>
      <div class="topbar-right">
        @include('components.lang-switcher')
        <div class="user-dropdown" id="userDropdown">
          <button type="button" class="user-chip" onclick="toggleUserMenu(event)" aria-haspopup="true" aria-expanded="false">
            <div class="avatar">
              @if(auth()->user()->avatar)
                <img src="{{ asset(auth()->user()->avatar) }}" alt="">
              @else
                {{ strtoupper(substr(auth()->user()->nama, 0, 1)) }}
              @endif
            </div>
            <div class="user-meta">
              <div class="user-name">{{ auth()->user()->nama }}</div>
              <div class="user-role">{{ __('app.roles.' . (auth()->user()->roleKode() ?? 'admin')) }}</div>
            </div>
            <span class="user-caret">{!! app_icon('chevron') !!}</span>
          </button>
          <div class="user-menu" role="menu">
            <a href="{{ route('legacy', ['path' => 'modules/akun/profil.php']) }}" role="menuitem">
              <span class="ico">{!! app_icon('user') !!}</span> {{ __('app.my_profile') }}
            </a>
            <div class="user-menu-sep"></div>
            <form method="post" action="{{ route('logout') }}" role="menuitem" class="danger"
                  onsubmit="return confirm(@json(__('app.logout_confirm')))">
              @csrf
              <button type="submit" class="user-menu-btn">
                <span class="ico">{!! app_icon('logout') !!}</span> {{ __('app.logout') }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
    <main class="content">
      @if(session('success'))
        <div class="alert alert-success">{{ session('success') }}</div>
      @endif
      @if(session('warning'))
        <div class="alert alert-warning">{{ session('warning') }}</div>
      @endif
      @if(session('error'))
        <div class="alert alert-danger">{{ session('error') }}</div>
      @endif
      @if($errors->any())
        <div class="alert alert-danger">{{ $errors->first() }}</div>
      @endif

      @yield('content')
    </main>
    <footer class="footer">
      &copy; {{ date('Y') }} {{ __('common.system_full') }} · {{ $clinicName }}
    </footer>
  </div>
</div>

@include('components.layout-scripts')
</body>
</html>
