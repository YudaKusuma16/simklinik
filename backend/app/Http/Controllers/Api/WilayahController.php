<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WilayahController extends Controller
{
    /**
     * Cari data wilayah Indonesia berdasarkan nama kelurahan atau desa
     */
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if (mb_strlen($q) < 1) {
            return response()->json([
                'success' => true,
                'data' => [],
            ]);
        }

        // Query tabel wilayah_indonesia
        // Prioritaskan hasil yang diawali dengan query ($q%), lalu yang mengandung ($%q%)
        $results = DB::table('wilayah_indonesia')
            ->select('id', 'kode', 'kelurahan', 'kecamatan', 'kota', 'provinsi', 'kode_pos')
            ->where(function ($query) use ($q) {
                $query->where('kelurahan', 'LIKE', "{$q}%")
                      ->orWhere('kelurahan', 'LIKE', "%{$q}%")
                      ->orWhere('kecamatan', 'LIKE', "{$q}%");
            })
            ->orderByRaw("CASE 
                WHEN kelurahan LIKE ? THEN 1 
                WHEN kelurahan LIKE ? THEN 2 
                ELSE 3 
            END", ["{$q}%", "%{$q}%"])
            ->orderBy('kelurahan', 'asc')
            ->limit(25)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $results,
        ]);
    }
}
