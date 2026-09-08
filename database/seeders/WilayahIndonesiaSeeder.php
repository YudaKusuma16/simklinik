<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WilayahIndonesiaSeeder extends Seeder
{
    public function run(): void
    {
        // Skip jika tabel sudah terisi
        if (DB::table('wilayah_indonesia')->count() > 0) {
            $this->command->info('wilayah_indonesia already seeded, skipping.');
            return;
        }

        $sqlFile = database_path('wilayah/wilayah_indonesia.sql');

        if (!file_exists($sqlFile)) {
            $this->command->warn('File wilayah_indonesia.sql tidak ditemukan di database/wilayah/. Skip seeder.');
            return;
        }

        $this->command->info('Importing wilayah_indonesia.sql ...');
        $this->runSqlFile($sqlFile);

        $total = DB::table('wilayah_indonesia')->count();
        $this->command->info("Done: {$total} kelurahan/desa imported.");
    }

    private function runSqlFile(string $path): void
    {
        $pdo = DB::connection()->getPdo();
        $sql = file_get_contents($path);

        // Split by semicolon, strip comments
        $statements = [];
        $buffer = '';
        foreach (preg_split('/\R/', $sql) as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '--')) continue;
            $buffer .= $line . "\n";
            if (str_ends_with(trim($line), ';')) {
                $statements[] = trim($buffer);
                $buffer = '';
            }
        }
        if (trim($buffer) !== '') {
            $statements[] = trim($buffer);
        }

        foreach ($statements as $stmt) {
            try {
                $pdo->exec($stmt);
            } catch (\Throwable $e) {
                // Ignore duplicate entry / table already exists
                if (!str_contains($e->getMessage(), '1062') && !str_contains($e->getMessage(), '1050')) {
                    throw $e;
                }
            }
        }
    }
}
