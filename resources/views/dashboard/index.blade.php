@extends('layouts.app')

@php($pageTitle = __('app.dashboard'))

@section('content')
@if($canPatientData)
<div class="dash-section-head">
  <div class="section-title" style="margin:0">{{ __('menu.patient_data') }}</div>
  <div class="dash-section-actions">
    <a class="btn btn-sm btn-light" href="{{ route('legacy', ['path' => 'modules/registrasi/pasien.php']) }}">{{ __('common.view_all') }}</a>
    <a class="btn" href="{{ route('legacy', ['path' => 'modules/registrasi/pasien_form.php']) }}">{!! app_icon('plus') !!} {{ __('common.new_patient') }}</a>
  </div>
</div>
<div class="table-wrap">
  <table class="datatable no-auto-num" style="width:100%">
    <thead>
      <tr>
        <th>{{ __('common.mr_no') }}</th>
        <th>{{ __('common.name') }}</th>
        <th>{{ __('common.gender') }}</th>
        <th>{{ __('common.birth_date') }}</th>
        <th>{{ __('common.phone') }}</th>
        <th>{{ __('common.group') }}</th>
      </tr>
    </thead>
    <tbody>
      @foreach($pasienTerbaru as $p)
        <tr>
          <td><b>{{ $p->no_mr }}</b></td>
          <td>{{ $p->nama }}</td>
          <td>{{ $p->jenis_kelamin === 'L' ? 'L' : 'P' }}</td>
          <td>{{ tgl_id($p->tgl_lahir) }}</td>
          <td>{{ $p->telepon ?? '-' }}</td>
          <td>{{ $p->kelompok ?? '-' }}</td>
        </tr>
      @endforeach
    </tbody>
  </table>
</div>
@endif
@endsection
