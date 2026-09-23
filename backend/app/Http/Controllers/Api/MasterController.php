<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class MasterController extends Controller
{
    /**
     * Konfigurasi definisi entitas Master Data
     */
    private function getEntities(): array
    {
        return config('master_entities', []);
    }

    /**
     * Mengambil seluruh daftar entitas dan jumlah datanya
     */
    public function entities(): JsonResponse
    {
        $entities = $this->getEntities();

        $result = Cache::remember('master_entities_counts', 300, function () use ($entities) {
            $res = [];
            foreach ($entities as $slug => $config) {
                $query = DB::table($config['table']);
                if (! empty($config['where'])) {
                    $query->whereRaw($config['where']);
                }
                $res[$slug] = array_merge($config, [
                    'slug' => $slug,
                    'count' => $query->count(),
                ]);
            }
            return $res;
        });

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Mengambil daftar baris data per entitas
     */
    public function index(Request $request, string $entity): JsonResponse
    {
        $entities = $this->getEntities();

        if (! isset($entities[$entity])) {
            return response()->json(['success' => false, 'message' => 'Entitas master tidak ditemukan.'], 404);
        }

        $config = $entities[$entity];
        $query = DB::table($config['table']);

        if (! empty($config['where'])) {
            $query->whereRaw($config['where']);
        }

        // Search filter
        $search = trim($request->query('q', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($config, $search) {
                foreach ($config['fields'] as $col => $f) {
                    if (in_array($f['type'], ['text', 'readonly'], true)) {
                        $q->orWhere($col, 'LIKE', "%{$search}%");
                    }
                }
            });
        }

        // Sorting
        $orderCol = $config['order'] ?? 'id';
        $query->orderBy($orderCol, 'asc');

        $rows = $query->get();

        // Foreign Key Lookups mapping
        $fkMap = [];
        $fkOptions = [];

        foreach ($config['fields'] as $col => $f) {
            if ($f['type'] === 'fk') {
                $fkTable = $f['fk_table'];
                $fkLabel = $f['fk_label'];

                $items = DB::table($fkTable)
                    ->select('id', $fkLabel)
                    ->orderBy($fkLabel, 'asc')
                    ->get();

                $optionsList = $items->map(function ($item) use ($fkLabel) {
                    return [
                        'id' => $item->id,
                        'nama' => $item->$fkLabel,
                        'label' => $item->$fkLabel,
                    ];
                })->values()->toArray();

                $fkOptions[$fkTable] = $optionsList;
                $fkOptions[$col] = $optionsList;
                $fkMap[$col] = $items->pluck($fkLabel, 'id')->toArray();
            }
        }

        // Augment rows with foreign key label dan kalkulasi harga
        $formattedRows = $rows->map(function ($row) use ($fkMap, $config) {
            $r = (array) $row;
            foreach ($fkMap as $col => $map) {
                $fkId = $r[$col] ?? null;
                $r[$col . '_nama'] = $fkId ? ($map[$fkId] ?? "-") : "-";
            }

            // Pastikan field money dari entity config selalu ada di response
            foreach ($config['fields'] as $col => $f) {
                if ($f['type'] === 'money' && !array_key_exists($col, $r)) {
                    $r[$col] = 0;
                }
            }

            // Harga Jual: kalkulasi otomatis dari tarif/harga_beli jika belum diset
            // Matching legacy index.php behavior
            if (array_key_exists('harga_jual', $r) && (float)($r['harga_jual'] ?? 0) <= 0) {
                $basePrice = (float)($r['tarif'] ?? $r['harga_beli'] ?? 0);
                if ($basePrice > 0) {
                    $r['harga_jual'] = round($basePrice * 1.40, 2);
                }
            }

            return $r;
        });

        return response()->json([
            'success' => true,
            'entity' => array_merge($config, ['slug' => $entity]),
            'data' => $formattedRows,
            'lookups' => $fkOptions,
        ]);
    }

    /**
     * Mengambil detail satu data dan opsi dropdown FK
     */
    public function show(string $entity, int $id): JsonResponse
    {
        $entities = $this->getEntities();

        if (! isset($entities[$entity])) {
            return response()->json(['success' => false, 'message' => 'Entitas tidak ditemukan.'], 404);
        }

        $config = $entities[$entity];
        $row = DB::table($config['table'])->where('id', $id)->first();

        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Data tidak ditemukan.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => (array) $row,
        ]);
    }

    /**
     * Menyimpan data master baru
     */
    public function store(Request $request, string $entity): JsonResponse
    {
        $entities = $this->getEntities();

        if (! isset($entities[$entity])) {
            return response()->json(['success' => false, 'message' => 'Entitas tidak ditemukan.'], 404);
        }

        $config = $entities[$entity];
        $data = [];

        foreach ($config['fields'] as $col => $f) {
            if ($f['type'] === 'readonly' || (! empty($config['code_prefix']) && $col === 'kode' && empty($request->input($col)))) {
                // Auto generate code if prefix is defined
                if (! empty($config['code_prefix'])) {
                    $prefix = $config['code_prefix'];
                    $pad = $config['code_pad'] ?? 4;
                    $codeQuery = DB::table($config['table'])
                        ->where($col, 'LIKE', "{$prefix}%");
                    if (! empty($config['where'])) {
                        $codeQuery->whereRaw($config['where']);
                    }
                    $maxNum = $codeQuery
                        ->selectRaw('MAX(CAST(SUBSTRING(' . $col . ', ?) AS UNSIGNED)) as max_num', [strlen($prefix) + 1])
                        ->value('max_num');
                    $next = ((int) $maxNum) + 1;
                    $data[$col] = $prefix . str_pad((string) $next, $pad, '0', STR_PAD_LEFT);
                }
                continue;
            }

            $val = $request->input($col);

            // Jika ada code_prefix dan kode diisi manual, pastikan prefix tetap ada
            if (! empty($config['code_prefix']) && $col === 'kode' && $val !== null && trim((string) $val) !== '') {
                $prefix = $config['code_prefix'];
                $trimmed = trim((string) $val);
                if (! str_starts_with($trimmed, $prefix)) {
                    $trimmed = $prefix . $trimmed;
                }
                $val = $trimmed;
            }

            if (! empty($f['required']) && ($val === null || trim((string) $val) === '')) {
                return response()->json([
                    'success' => false,
                    'message' => "Field {$f['label']} wajib diisi.",
                    'errors' => [$col => ["Field {$f['label']} wajib diisi."]],
                ], 422);
            }

            if ($f['type'] === 'money' || $f['type'] === 'number') {
                $data[$col] = $val !== null && $val !== '' ? (float) str_replace(['.', ','], '', (string) $val) : 0;
            } else {
                $data[$col] = $val !== null && $val !== '' ? trim((string) $val) : ($f['default'] ?? null);
            }
        }

        $insertedId = DB::table($config['table'])->insertGetId($data);
        Cache::forget('master_entities_counts');

        return response()->json([
            'success' => true,
            'message' => "Data {$config['singular']} berhasil ditambahkan.",
            'id' => $insertedId,
        ]);
    }

    /**
     * Memperbarui data master
     */
    public function update(Request $request, string $entity, int $id): JsonResponse
    {
        $entities = $this->getEntities();

        if (! isset($entities[$entity])) {
            return response()->json(['success' => false, 'message' => 'Entitas tidak ditemukan.'], 404);
        }

        $config = $entities[$entity];
        $exists = DB::table($config['table'])->where('id', $id)->exists();

        if (! $exists) {
            return response()->json(['success' => false, 'message' => 'Data tidak ditemukan.'], 404);
        }

        $data = [];

        foreach ($config['fields'] as $col => $f) {
            if ($f['type'] === 'readonly') {
                continue;
            }

            if ($request->has($col)) {
                $val = $request->input($col);

                if (! empty($f['required']) && ($val === null || trim((string) $val) === '')) {
                    return response()->json([
                        'success' => false,
                        'message' => "Field {$f['label']} wajib diisi.",
                        'errors' => [$col => ["Field {$f['label']} wajib diisi."]],
                    ], 422);
                }

                if ($f['type'] === 'money' || $f['type'] === 'number') {
                    $data[$col] = $val !== null && $val !== '' ? (float) str_replace(['.', ','], '', (string) $val) : 0;
                } else {
                    $data[$col] = $val !== null && $val !== '' ? trim((string) $val) : null;
                }
            }
        }

        if (! empty($data)) {
            DB::table($config['table'])->where('id', $id)->update($data);
            Cache::forget('master_entities_counts');
        }

        return response()->json([
            'success' => true,
            'message' => "Data {$config['singular']} berhasil diperbarui.",
        ]);
    }

    /**
     * Menghapus data master
     */
    public function destroy(string $entity, int $id): JsonResponse
    {
        $entities = $this->getEntities();

        if (! isset($entities[$entity])) {
            return response()->json(['success' => false, 'message' => 'Entitas tidak ditemukan.'], 404);
        }

        $config = $entities[$entity];

        try {
            DB::table($config['table'])->where('id', $id)->delete();
            Cache::forget('master_entities_counts');

            return response()->json([
                'success' => true,
                'message' => "Data {$config['singular']} berhasil dihapus.",
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Data tidak dapat dihapus karena masih digunakan atau berelasi dengan data lain.',
            ], 422);
        }
    }
}
