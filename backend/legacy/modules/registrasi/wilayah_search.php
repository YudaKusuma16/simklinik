<?php
/**
 * API Endpoint: Autocomplete Wilayah Indonesia
 * GET ?q=kebayoran&field=kelurahan  → JSON array hasil pencarian
 * GET ?q=bandung&field=kecamatan
 * GET ?q=jakarta&field=kota
 * GET ?q=jawa&field=provinsi
 */
require_once __DIR__ . '/../../includes/auth.php';
require_login();

header('Content-Type: application/json; charset=utf-8');

$q     = trim($_GET['q'] ?? '');
$field = $_GET['field'] ?? 'kelurahan';

$allowed = ['kelurahan', 'kecamatan', 'kota', 'provinsi'];
if (!in_array($field, $allowed, true) || strlen($q) < 2) {
    echo json_encode([]);
    exit;
}

$like_prefix  = $q . '%';       // berawal dengan keyword (prioritas tinggi)
$like_contain = '%' . $q . '%'; // mengandung keyword (prioritas rendah)
$limit = 15;

try {
    // Ambil hasil dengan prioritas: yang berawal keyword didahulukan
    $stmt = db()->prepare(
        "SELECT kelurahan, kecamatan, kota, provinsi, kode_pos,
                CASE WHEN {$field} LIKE ? THEN 0 ELSE 1 END AS _priority
         FROM wilayah_indonesia
         WHERE {$field} LIKE ?
         ORDER BY _priority ASC, {$field} ASC
         LIMIT {$limit}"
    );
    $stmt->execute([$like_prefix, $like_contain]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // deduplicate by unique (kelurahan+kecamatan+kota+provinsi)
    $seen = [];
    $results = [];
    foreach ($rows as $r) {
        $key = $r['kelurahan'] . '|' . $r['kecamatan'] . '|' . $r['kota'] . '|' . $r['provinsi'];
        if (!isset($seen[$key])) {
            $seen[$key] = true;
            unset($r['_priority']); // hapus kolom internal
            $results[]  = $r;
        }
    }
    $results = array_slice($results, 0, 10); // tampilkan max 10 di dropdown

    echo json_encode($results, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
