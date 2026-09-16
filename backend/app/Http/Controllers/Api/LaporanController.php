<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LaporanController extends Controller
{
    private function bootstrapLegacy(): void
    {
        require_once base_path('legacy/config/database.php');
        require_once base_path('legacy/includes/lang.php');
        require_once base_path('legacy/includes/functions.php');
        require_once base_path('legacy/includes/auth.php');
        require_once base_path('legacy/modules/laporan/reports.php');
    }

    /**
     * Ringkasan daftar laporan per grup beserta jumlah barisnya
     */
    public function summary(Request $request): JsonResponse
    {
        $this->bootstrapLegacy();

        $dari = $request->query('dari', date('Y-m-01'));
        $sampai = $request->query('sampai', date('Y-m-d'));

        $list = laporan_list();
        $res = [];

        foreach ($list as $slug => $cfg) {
            $rows = laporan_run($cfg, $dari, $sampai);
            $res[$slug] = [
                'slug' => $slug,
                'label' => $cfg['label'],
                'group' => $cfg['group'],
                'count' => count($rows),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $res,
        ]);
    }

    /**
     * Menjalankan laporan tertentu
     */
    public function showReport(Request $request, string $jenis): JsonResponse
    {
        $this->bootstrapLegacy();

        $cfg = laporan_get($jenis);
        if (! $cfg) {
            return response()->json(['success' => false, 'message' => 'Laporan tidak ditemukan.'], 404);
        }

        $dari = $request->query('dari', date('Y-m-01'));
        $sampai = $request->query('sampai', date('Y-m-d'));

        $rows = laporan_run($cfg, $dari, $sampai);

        $totals = array_fill_keys($cfg['sum'], 0);
        foreach ($rows as $r) {
            foreach ($cfg['sum'] as $c) {
                $totals[$c] += (float) ($r[$c] ?? 0);
            }
        }

        $cols = [];
        foreach ($cfg['cols'] as $k => $c) {
            $cols[] = [
                'key' => $k,
                'label' => $c[0],
                'type' => $c[1],
            ];
        }

        return response()->json([
            'success' => true,
            'report' => [
                'slug' => $jenis,
                'label' => $cfg['label'],
                'group' => $cfg['group'],
                'cols' => $cols,
                'sum' => $cfg['sum'],
            ],
            'data' => [
                'dari' => $dari,
                'sampai' => $sampai,
                'rows' => $rows,
                'totals' => $totals,
            ],
        ]);
    }
}
