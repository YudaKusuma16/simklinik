<aside class="sidebar" id="appSidebar">
  <div class="brand">
    <span class="brand-ico{{ $clinicLogo ? ' has-logo' : '' }}">
      @if($clinicLogo)
        <img src="{{ asset($clinicLogo) }}" alt="">
      @else
        {!! app_icon('plus') !!}
      @endif
    </span>
    <span class="brand-text">{{ config('sim-klinik.name') }}<small>{{ $clinicName }}</small></span>
  </div>
  <nav>
    @foreach($menuGroups as $grup)
      @if($grup['grup'])
        <div class="label">{{ $grup['grup'] }}</div>
      @endif
      @foreach($grup['items'] as $it)
        @php
          $children = !empty($it['children'])
            ? array_filter($it['children'], fn($c) =>
                !isset($c['roles']) || auth()->user()->roleKode() === 'superadmin' || in_array(auth()->user()->roleKode(), $c['roles'], true))
            : [];
          $itemUrl = $menuService->urlFor($it);
          $legacyPath = request()->route('path') ?? '';
          $matchKey = $it['match'] ?? (!empty($it['legacy']) ? preg_replace('#^modules/#', '', explode('?', $it['legacy'])[0]) : '');
          $active = request()->routeIs($it['route'] ?? '')
            || ($legacyPath !== '' && $matchKey !== '' && str_contains($legacyPath, $matchKey)) ? 'active' : '';
        @endphp
        @if($children)
          <div class="nav-group">
            <div class="nav-parent{{ $active ? ' active' : '' }}">
              <a class="np-link" href="{{ $menuService->urlFor($it) }}" title="{{ $it['label'] }}">
                <span class="ico">{!! app_icon($it['ico']) !!}</span>
                <span class="txt">{{ $it['label'] }}</span>
              </a>
              <button type="button" class="np-caret" onclick="toggleNavGroup(this)" aria-label="{{ __('app.toggle_submenu') }}">{!! app_icon('chevron') !!}</button>
            </div>
            <div class="nav-sub">
              @foreach($children as $c)
                <a href="{{ $menuService->urlFor($c) }}"><span class="dot"></span><span class="txt">{{ $c['label'] }}</span></a>
              @endforeach
            </div>
          </div>
        @else
          <a class="{{ $active }}" href="{{ $itemUrl }}" title="{{ $it['label'] }}">
            <span class="ico">{!! app_icon($it['ico']) !!}</span> <span class="txt">{{ $it['label'] }}</span>
          </a>
        @endif
      @endforeach
    @endforeach
  </nav>
  <div class="sidebar-foot">
    <form method="post" action="{{ route('logout') }}" onsubmit="return confirm(@json(__('app.logout_confirm')))">
      @csrf
      <button type="submit" class="logout-link" title="{{ __('app.logout') }}">
        <span class="ico">{!! app_icon('logout') !!}</span> <span class="txt">{{ __('app.logout') }}</span>
      </button>
    </form>
  </div>
</aside>
