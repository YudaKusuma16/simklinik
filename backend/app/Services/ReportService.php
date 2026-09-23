<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class ReportService
{
    /**
     * Daftar seluruh definisi laporan
     */
    public function getReportDefinitions(): array
    {
        return [
            'kunjungan' => [
                'label' => 'Laporan Kunjungan',
                'icon' => 'users',
                'group' => 'Operasional',
                'cols' => [
                    ['key' => 'tanggal', 'label' => 'Tanggal', 'type' => 'date'],
                    ['key' => 'no_kunjungan', 'label' => 'No. Kunjungan', 'type' => 'text'],
                    ['key' => 'no_mr', 'label' => 'No. MR', 'type' => 'text'],
                    ['key' => 'pasien', 'label' => 'Pasien', 'type' => 'text'],
                    ['key' => 'poli', 'label' => 'Poli', 'type' => 'text'],
                    ['key' => 'dokter', 'label' => 'Dokter', 'type' => 'text'],
                    ['key' => 'penjamin', 'label' => 'Penjamin', 'type' => 'upper'],
                    ['key' => 'status', 'label' => 'Status', 'type' => 'status'],
                    ['key' => 'action_periksa', 'label' => 'Aksi', 'type' => 'action_periksa'],
                ],
                'sum' => [],
            ],
            'pendapatan' => [
                'label' => 'Laporan Pendapatan',
                'icon' => 'money',
                'group' => 'Keuangan',
                'cols' => [
                    ['key' => 'tanggal', 'label' => 'Waktu Transaksi', 'type' => 'datetime'],
                    ['key' => 'no_invoice', 'label' => 'No. Invoice', 'type' => 'text'],
                    ['key' => 'pasien', 'label' => 'Pasien', 'type' => 'text'],
                    ['key' => 'metode', 'label' => 'Metode Pembayaran', 'type' => 'metode'],
                    ['key' => 'jumlah', 'label' => 'Nominal (Rp)', 'type' => 'money'],
                ],
                'sum' => ['jumlah'],
            ],
            'billing' => [
                'label' => 'Laporan Billing',
                'icon' => 'billing',
                'group' => 'Keuangan',
                'cols' => [
                    ['key' => 'tanggal', 'label' => 'Tanggal', 'type' => 'date'],
                    ['key' => 'no_kunjungan', 'label' => 'No. Kunjungan', 'type' => 'text'],
                    ['key' => 'pasien', 'label' => 'Pasien', 'type' => 'text'],
                    ['key' => 'subtotal', 'label' => 'Subtotal', 'type' => 'money'],
                    ['key' => 'diskon', 'label' => 'Diskon', 'type' => 'money'],
                    ['key' => 'total', 'label' => 'Total Tagihan', 'type' => 'money'],
                ],
                'sum' => ['subtotal', 'diskon', 'total'],
            ],
            'piutang' => [
                'label' => 'Laporan Piutang',
                'icon' => 'clock',
                'group' => 'Keuangan',
                'cols' => [
                    ['key' => 'tanggal', 'label' => 'Tanggal', 'type' => 'date'],
                    ['key' => 'no_invoice', 'label' => 'No. Invoice', 'type' => 'text'],
                    ['key' => 'pasien', 'label' => 'Pasien', 'type' => 'text'],
                    ['key' => 'total', 'label' => 'Total Tagihan', 'type' => 'money'],
                    ['key' => 'terbayar', 'label' => 'Terbayar', 'type' => 'money'],
                    ['key' => 'sisa', 'label' => 'Sisa Piutang', 'type' => 'money'],
                    ['key' => 'status', 'label' => 'Status', 'type' => 'status'],
                ],
                'sum' => ['total', 'terbayar', 'sisa'],
            ],
            'penjamin' => [
                'label' => 'Laporan per Penjamin',
                'icon' => 'shield',
                'group' => 'Keuangan',
                'cols' => [
                    ['key' => 'penjamin', 'label' => 'Penjamin', 'type' => 'upper'],
                    ['key' => 'jml', 'label' => 'Jumlah Kunjungan', 'type' => 'number'],
                    ['key' => 'nilai', 'label' => 'Nilai Billing (Rp)', 'type' => 'money'],
                ],
                'sum' => ['jml', 'nilai'],
            ],
            'dokter' => [
                'label' => 'Laporan per Dokter',
                'icon' => 'user',
                'group' => 'Operasional',
                'cols' => [
                    ['key' => 'dokter', 'label' => 'Dokter', 'type' => 'text'],
                    ['key' => 'jml_pasien', 'label' => 'Jumlah Pasien', 'type' => 'number'],
                    ['key' => 'jasa', 'label' => 'Jasa Dokter (Rp)', 'type' => 'money'],
                ],
                'sum' => ['jml_pasien', 'jasa'],
            ],
            'poli' => [
                'label' => 'Laporan per Poli',
                'icon' => 'hospital',
                'group' => 'Operasional',
                'cols' => [
                    ['key' => 'poli', 'label' => 'Poliklinik', 'type' => 'text'],
                    ['key' => 'jml', 'label' => 'Jumlah Kunjungan', 'type' => 'number'],
                ],
                'sum' => ['jml'],
            ],
            'farmasi' => [
                'label' => 'Laporan Farmasi & Obat',
                'icon' => 'pills',
                'group' => 'Penunjang',
                'cols' => [
                    ['key' => 'kode', 'label' => 'Kode', 'type' => 'text'],
                    ['key' => 'obat', 'label' => 'Nama Obat', 'type' => 'text'],
                    ['key' => 'qty', 'label' => 'Qty Keluar', 'type' => 'number'],
                    ['key' => 'nilai', 'label' => 'Total Nilai (Rp)', 'type' => 'money'],
                ],
                'sum' => ['qty', 'nilai'],
            ],
            'laboratorium' => [
                'label' => 'Laporan Laboratorium',
                'icon' => 'flask',
                'group' => 'Penunjang',
                'cols' => [
                    ['key' => 'kode', 'label' => 'Kode', 'type' => 'text'],
                    ['key' => 'pemeriksaan', 'label' => 'Pemeriksaan', 'type' => 'text'],
                    ['key' => 'jml', 'label' => 'Jumlah', 'type' => 'number'],
                    ['key' => 'nilai', 'label' => 'Total Nilai (Rp)', 'type' => 'money'],
                ],
                'sum' => ['jml', 'nilai'],
            ],
            'radiologi' => [
                'label' => 'Laporan Radiologi',
                'icon' => 'scan',
                'group' => 'Penunjang',
                'cols' => [
                    ['key' => 'kode', 'label' => 'Kode', 'type' => 'text'],
                    ['key' => 'pemeriksaan', 'label' => 'Pemeriksaan', 'type' => 'text'],
                    ['key' => 'jml', 'label' => 'Jumlah', 'type' => 'number'],
                    ['key' => 'nilai', 'label' => 'Total Nilai (Rp)', 'type' => 'money'],
                ],
                'sum' => ['jml', 'nilai'],
            ],
        ];
    }

    /**
     * Ambil ringkasan seluruh laporan beserta jumlah barisnya
     */
    public function getSummary(string $dari, string $sampai): array
    {
        $defs = $this->getReportDefinitions();
        $res = [];

        foreach ($defs as $slug => $cfg) {
            $data = $this->runReportQuery($slug, $dari, $sampai);
            $res[$slug] = [
                'slug' => $slug,
                'label' => $cfg['label'],
                'group' => $cfg['group'],
                'count' => count($data['rows']),
            ];
        }

        return $res;
    }

    /**
     * Jalankan kueri laporan tertentu
     */
    public function getReport(string $jenis, string $dari, string $sampai): ?array
    {
        // Support alias: 'obat' -> 'farmasi'
        $slug = ($jenis === 'obat') ? 'farmasi' : $jenis;
        $defs = $this->getReportDefinitions();

        if (! isset($defs[$slug])) {
            return null;
        }

        $cfg = $defs[$slug];
        $queryResult = $this->runReportQuery($slug, $dari, $sampai);

        $totals = array_fill_keys($cfg['sum'], 0);
        foreach ($queryResult['rows'] as $r) {
            $arr = (array) $r;
            foreach ($cfg['sum'] as $c) {
                $totals[$c] += (float) ($arr[$c] ?? 0);
            }
        }

        return [
            'report' => [
                'slug' => $slug,
                'label' => $cfg['label'],
                'group' => $cfg['group'],
                'cols' => $cfg['cols'],
                'sum' => $cfg['sum'],
            ],
            'data' => array_merge([
                'dari' => $dari,
                'sampai' => $sampai,
                'rows' => $queryResult['rows'],
                'totals' => $totals,
            ], $queryResult['extra']),
        ];
    }

    /**
     * Eksekusi Query Builder untuk tiap jenis laporan
     */
    private function runReportQuery(string $slug, string $dari, string $sampai): array
    {
        $rows = [];
        $extra = [];

        switch ($slug) {
            case 'kunjungan':
                $query = DB::table('kunjungan as k')
                    ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
                    ->join('poli as po', 'po.id', '=', 'k.poli_id')
                    ->leftJoin('dokter as d', 'd.id', '=', 'k.dokter_id')
                    ->select(
                        'k.tgl_kunjungan as tanggal',
                        'k.no_kunjungan',
                        'p.no_mr',
                        'p.nama as pasien',
                        'po.nama as poli',
                        'd.nama as dokter',
                        'k.jenis_penjamin as penjamin',
                        'k.status',
                        'k.id as action_periksa'
                    )
                    ->whereBetween('k.tgl_kunjungan', [$dari, $sampai])
                    ->orderBy('k.tgl_kunjungan')
                    ->orderBy('k.no_antrian');

                $rows = $query->get()->toArray();

                // Status summary for tests & quick widgets
                $summaryCounts = [
                    'total' => count($rows),
                    'menunggu' => 0,
                    'periksa' => 0,
                    'farmasi' => 0,
                    'billing' => 0,
                    'selesai' => 0,
                ];
                foreach ($rows as $r) {
                    $st = (string) ($r->status ?? '');
                    if (isset($summaryCounts[$st])) {
                        $summaryCounts[$st]++;
                    }
                }
                $extra['summary'] = $summaryCounts;
                break;

            case 'pendapatan':
                $query = DB::table('pembayaran as pm')
                    ->join('invoice as i', 'i.id', '=', 'pm.invoice_id')
                    ->join('kunjungan as k', 'k.id', '=', 'i.kunjungan_id')
                    ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
                    ->select(
                        'pm.tanggal',
                        'i.no_invoice',
                        'p.nama as pasien',
                        'pm.metode',
                        'pm.jumlah'
                    )
                    ->where('pm.status', 'valid')
                    ->whereBetween(DB::raw('DATE(pm.tanggal)'), [$dari, $sampai])
                    ->orderBy('pm.tanggal');

                $rows = $query->get()->toArray();

                $totalPendapatan = 0;
                $perMetode = [];
                foreach ($rows as $r) {
                    $jml = (float) ($r->jumlah ?? 0);
                    $totalPendapatan += $jml;
                    $metode = $r->metode ?? 'lainnya';
                    $perMetode[$metode] = ($perMetode[$metode] ?? 0) + $jml;
                }
                $extra['total_pendapatan'] = $totalPendapatan;
                $extra['per_metode'] = $perMetode;
                break;

            case 'billing':
                $query = DB::table('billing as b')
                    ->join('kunjungan as k', 'k.id', '=', 'b.kunjungan_id')
                    ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
                    ->select(
                        'b.created_at as tanggal',
                        'k.no_kunjungan',
                        'p.nama as pasien',
                        'b.subtotal',
                        'b.diskon',
                        'b.total'
                    )
                    ->where('b.status', 'final')
                    ->whereBetween('k.tgl_kunjungan', [$dari, $sampai])
                    ->orderBy('b.created_at');

                $rows = $query->get()->toArray();
                break;

            case 'piutang':
                $query = DB::table('invoice as i')
                    ->join('kunjungan as k', 'k.id', '=', 'i.kunjungan_id')
                    ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
                    ->select(
                        'i.tanggal',
                        'i.no_invoice',
                        'p.nama as pasien',
                        'i.total',
                        'i.terbayar',
                        DB::raw('(i.total - i.terbayar) as sisa'),
                        'i.status'
                    )
                    ->where('i.status', '<>', 'lunas')
                    ->whereBetween('i.tanggal', [$dari, $sampai])
                    ->orderBy('i.tanggal');

                $rows = $query->get()->toArray();

                $totalPiutang = 0;
                $totalTagihan = 0;
                foreach ($rows as $r) {
                    $totalPiutang += (float) ($r->sisa ?? 0);
                    $totalTagihan += (float) ($r->total ?? 0);
                }
                $extra['total_piutang'] = $totalPiutang;
                $extra['total_tagihan'] = $totalTagihan;
                break;

            case 'penjamin':
                $query = DB::table('kunjungan as k')
                    ->leftJoin('billing as b', function ($j) {
                        $j->on('b.kunjungan_id', '=', 'k.id')->where('b.status', '=', 'final');
                    })
                    ->select(
                        'k.jenis_penjamin as penjamin',
                        DB::raw('COUNT(k.id) as jml'),
                        DB::raw('COALESCE(SUM(b.total), 0) as nilai')
                    )
                    ->whereBetween('k.tgl_kunjungan', [$dari, $sampai])
                    ->groupBy('k.jenis_penjamin')
                    ->orderByDesc('nilai');

                $rows = $query->get()->toArray();
                break;

            case 'dokter':
                $query = DB::table('kunjungan as k')
                    ->join('dokter as d', 'd.id', '=', 'k.dokter_id')
                    ->leftJoin('billing as b', 'b.kunjungan_id', '=', 'k.id')
                    ->leftJoin('billing_detail as bd', 'bd.billing_id', '=', 'b.id')
                    ->select(
                        'd.nama as dokter',
                        DB::raw('COUNT(DISTINCT k.id) as jml_pasien'),
                        DB::raw("COALESCE(SUM(CASE WHEN bd.kategori='jasa_dokter' THEN bd.subtotal END), 0) as jasa")
                    )
                    ->whereBetween('k.tgl_kunjungan', [$dari, $sampai])
                    ->groupBy('d.id', 'd.nama')
                    ->orderByDesc('jml_pasien');

                $rows = $query->get()->toArray();
                break;

            case 'poli':
                $query = DB::table('kunjungan as k')
                    ->join('poli as po', 'po.id', '=', 'k.poli_id')
                    ->select(
                        'po.nama as poli',
                        DB::raw('COUNT(k.id) as jml')
                    )
                    ->whereBetween('k.tgl_kunjungan', [$dari, $sampai])
                    ->groupBy('po.id', 'po.nama')
                    ->orderByDesc('jml');

                $rows = $query->get()->toArray();
                break;

            case 'farmasi':
                $query = DB::table('resep_detail as rd')
                    ->join('resep as r', 'r.id', '=', 'rd.resep_id')
                    ->join('kunjungan as k', 'k.id', '=', 'r.kunjungan_id')
                    ->join('obat as o', 'o.id', '=', 'rd.obat_id')
                    ->select(
                        'o.kode',
                        'o.nama as obat',
                        DB::raw('SUM(rd.qty) as qty'),
                        DB::raw('SUM(rd.subtotal) as nilai')
                    )
                    ->whereBetween('k.tgl_kunjungan', [$dari, $sampai])
                    ->groupBy('o.id', 'o.kode', 'o.nama')
                    ->orderByDesc('qty');

                $rows = $query->get()->toArray();

                $totalQty = 0;
                $totalNominal = 0;
                foreach ($rows as $r) {
                    $totalQty += (float) ($r->qty ?? 0);
                    $totalNominal += (float) ($r->nilai ?? 0);
                }
                $extra['total_kuantitas'] = $totalQty;
                $extra['total_nominal'] = $totalNominal;
                break;

            case 'laboratorium':
                $query = DB::table('lab_order_detail as lod')
                    ->join('lab_order as lo', 'lo.id', '=', 'lod.lab_order_id')
                    ->join('kunjungan as k', 'k.id', '=', 'lo.kunjungan_id')
                    ->join('lab_pemeriksaan as lp', 'lp.id', '=', 'lod.pemeriksaan_id')
                    ->select(
                        'lp.kode',
                        'lp.nama as pemeriksaan',
                        DB::raw('SUM(lod.qty) as jml'),
                        DB::raw('SUM(lod.subtotal) as nilai')
                    )
                    ->whereBetween('k.tgl_kunjungan', [$dari, $sampai])
                    ->groupBy('lp.id', 'lp.kode', 'lp.nama')
                    ->orderByDesc('jml');

                $rows = $query->get()->toArray();
                break;

            case 'radiologi':
                $query = DB::table('rad_order_detail as rod')
                    ->join('rad_order as ro', 'ro.id', '=', 'rod.rad_order_id')
                    ->join('kunjungan as k', 'k.id', '=', 'ro.kunjungan_id')
                    ->join('rad_pemeriksaan as rp', 'rp.id', '=', 'rod.pemeriksaan_id')
                    ->select(
                        'rp.kode',
                        'rp.nama as pemeriksaan',
                        DB::raw('SUM(rod.qty) as jml'),
                        DB::raw('SUM(rod.subtotal) as nilai')
                    )
                    ->whereBetween('k.tgl_kunjungan', [$dari, $sampai])
                    ->groupBy('rp.id', 'rp.kode', 'rp.nama')
                    ->orderByDesc('jml');

                $rows = $query->get()->toArray();
                break;
        }

        return [
            'rows' => $rows,
            'extra' => $extra,
        ];
    }
}
