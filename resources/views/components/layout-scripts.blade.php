<script>
var SIDEBAR_MQ = window.matchMedia('(max-width:768px)');
function isMobileSidebar(){ return SIDEBAR_MQ.matches; }
function setSidebarOpen(open){
  var l = document.getElementById('appLayout');
  var btn = document.getElementById('menuToggle');
  l.classList.toggle('sidebar-open', open);
  document.body.classList.toggle('sidebar-open', open);
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function closeSidebar(){ if (isMobileSidebar()) setSidebarOpen(false); }
function toggleSidebar(){
  var l = document.getElementById('appLayout');
  if (isMobileSidebar()) { setSidebarOpen(!l.classList.contains('sidebar-open')); return; }
  l.classList.toggle('collapsed');
  localStorage.setItem('sidebar', l.classList.contains('collapsed') ? 'collapsed' : 'expanded');
  if (window.__simAdjustTables) setTimeout(window.__simAdjustTables, 320);
}
function toggleNavGroup(btn){
  var g = btn.closest('.nav-group');
  document.querySelectorAll('.nav-group.open').forEach(function(o){ if(o!==g) o.classList.remove('open'); });
  g.classList.toggle('open');
}
function toggleUserMenu(e){
  e.stopPropagation();
  var d = document.getElementById('userDropdown');
  var open = d.classList.toggle('open');
  d.querySelector('.user-chip').setAttribute('aria-expanded', open ? 'true' : 'false');
}
document.addEventListener('click', function(e){
  var d = document.getElementById('userDropdown');
  if (d && d.classList.contains('open') && !d.contains(e.target)){
    d.classList.remove('open');
    d.querySelector('.user-chip').setAttribute('aria-expanded','false');
  }
});
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape'){
    closeSidebar();
    var d = document.getElementById('userDropdown');
    if (d && d.classList.contains('open')){
      d.classList.remove('open');
      d.querySelector('.user-chip').setAttribute('aria-expanded','false');
    }
  }
});
SIDEBAR_MQ.addEventListener('change', function(e){ if (!e.matches) closeSidebar(); });
(function(){
  var nav = document.querySelector('.sidebar nav');
  if (!nav) return;
  nav.addEventListener('click', function(e){
    if (isMobileSidebar() && e.target.closest('a')) closeSidebar();
  });
  var foot = document.querySelector('.sidebar-foot .logout-link');
  if (foot) foot.addEventListener('click', function(){ if (isMobileSidebar()) closeSidebar(); });
})();
</script>
<script src="{{ asset('assets/vendor/jquery.min.js') }}"></script>
<script src="{{ asset('assets/vendor/datatables.min.js') }}"></script>
@php
  $simDatatableLang = [
    'search' => __('datatable.search'),
    'searchPlaceholder' => __('datatable.search_placeholder'),
    'lengthMenu' => __('datatable.length_menu'),
    'info' => __('datatable.info'),
    'infoEmpty' => __('datatable.info_empty'),
    'infoFiltered' => __('datatable.info_filtered'),
    'zeroRecords' => __('datatable.zero_records'),
    'emptyTable' => __('datatable.empty_table'),
    'paginate' => [
      'first' => __('datatable.paginate.first'),
      'previous' => __('datatable.paginate.previous'),
      'next' => __('datatable.paginate.next'),
      'last' => __('datatable.paginate.last'),
    ],
  ];
  $simDatatableColNo = __('datatable.col_no');
@endphp
<script>
var SIM_DT_LANG = {!! json_encode($simDatatableLang, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT) !!};
var SIM_DT_COL_NO = {!! json_encode($simDatatableColNo, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT) !!};
$(function () {
  $('table.datatable').each(function () {
    var $t = $(this);
    if ($t.hasClass('no-auto-num')) return;
    var $headRow = $t.find('thead tr').first();
    if ($.trim($headRow.children().first().text()).toLowerCase() === 'no') return;
    $headRow.prepend('<th class="no-sort col-no">' + SIM_DT_COL_NO + '</th>');
    $t.find('tbody tr').each(function () {
      if ($(this).children('td').first().attr('colspan')) return;
      if ($(this).children('td').length) $(this).prepend('<td class="col-no"></td>');
    });
  });
  var dtOptions = {
    pageLength: 25,
    lengthMenu: [10, 25, 50, 100],
    pagingType: 'full_numbers',
    order: [],
    columnDefs: [
      { orderable: false, targets: 'no-sort' },
      { searchable: false, targets: 'col-no' }
    ],
    language: SIM_DT_LANG
  };
  var apis = [];
  $('table.datatable').each(function () {
    var $t = $(this);
    var api = $t.DataTable($.extend({}, dtOptions, { scrollX: !$t.hasClass('dt-noscroll') }));
    apis.push(api);
    if ($(api.table().header()).find('th.col-no').length) {
      api.on('draw.dt', function () {
        var start = api.page.info().start;
        api.column(0, { page: 'current' }).nodes().each(function (cell, i) {
          cell.innerHTML = start + i + 1;
        });
      });
    }

    var $wrapper = $(api.table().container());
    var $length  = $wrapper.find('.dataTables_length, .dt-length').first();
    var $filter  = $wrapper.find('.dataTables_filter, .dt-search').first();
    if ($length.length || $filter.length) {
      var $topRow = $('<div class="dt-top-row"></div>');
      if ($length.length) {
        $length.before($topRow);
        $topRow.append($length);
      } else {
        $wrapper.prepend($topRow);
      }
      if ($filter.length) {
        $topRow.append($filter);
      }
    }

    api.draw(false);
  });
  window.__simAdjustTables = function(){ apis.forEach(function (a) { a.columns.adjust(); }); };
});
(function(){
  var box = document.getElementById('menuSearch');
  if (!box) return;
  var nav = document.querySelector('.sidebar nav');
  box.addEventListener('keyup', function(){
    var q = this.value.trim().toLowerCase();
    nav.querySelectorAll('a').forEach(function(a){
      a.style.display = a.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
    });
    nav.querySelectorAll('.label').forEach(function(l){ l.style.display = q ? 'none' : ''; });
  });
})();
</script>
