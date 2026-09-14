@php
  $locale = $currentLocale ?? app()->getLocale();
@endphp
<div class="lang-picker">
  <label class="lang-picker-label" for="appLangSelect">{{ __('app.language') }}</label>
  <select id="appLangSelect" class="lang-picker-select" aria-label="{{ __('app.language') }}"
          onchange="if(this.value) window.location.href=this.value">
    <option value="{{ route('locale.switch', 'id') }}" @selected($locale === 'id')>{{ __('app.lang_id') }}</option>
    <option value="{{ route('locale.switch', 'en') }}" @selected($locale === 'en')>{{ __('app.lang_en') }}</option>
  </select>
</div>
