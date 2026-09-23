<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LaporanController extends Controller
{
    public function __construct(
        protected ReportService $reportService
    ) {}

    /**
     * Ringkasan daftar laporan per grup beserta jumlah barisnya
     */
    public function summary(Request $request): JsonResponse
    {
        $dari = $request->query('dari', date('Y-m-01'));
        $sampai = $request->query('sampai', date('Y-m-d'));

        $res = $this->reportService->getSummary($dari, $sampai);

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
        $dari = $request->query('dari', date('Y-m-01'));
        $sampai = $request->query('sampai', date('Y-m-d'));

        $result = $this->reportService->getReport($jenis, $dari, $sampai);
        if (! $result) {
            return response()->json(['success' => false, 'message' => 'Laporan tidak ditemukan.'], 404);
        }

        return response()->json(array_merge(['success' => true], $result));
    }
}

