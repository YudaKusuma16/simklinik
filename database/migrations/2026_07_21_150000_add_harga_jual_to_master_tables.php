<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('lab_pemeriksaan', 'harga_jual')) {
            DB::statement("ALTER TABLE lab_pemeriksaan ADD harga_jual DECIMAL(12,2) DEFAULT 0.00 AFTER tarif");
        }
        if (!Schema::hasColumn('rad_pemeriksaan', 'harga_jual')) {
            DB::statement("ALTER TABLE rad_pemeriksaan ADD harga_jual DECIMAL(12,2) DEFAULT 0.00 AFTER tarif");
        }
        if (!Schema::hasColumn('obat', 'harga_jual')) {
            DB::statement("ALTER TABLE obat ADD harga_jual DECIMAL(12,2) DEFAULT 0.00 AFTER harga_beli");
        }

        // Backfill harga_jual yang masih 0 / NULL
        DB::statement("UPDATE lab_pemeriksaan SET harga_jual = CASE WHEN markup_persen > 0 THEN ROUND(tarif * (1 + markup_persen / 100), 2) ELSE ROUND(tarif * 1.40, 2) END WHERE harga_jual = 0 OR harga_jual IS NULL");
        DB::statement("UPDATE rad_pemeriksaan SET harga_jual = CASE WHEN markup_persen > 0 THEN ROUND(tarif * (1 + markup_persen / 100), 2) ELSE ROUND(tarif * 1.40, 2) END WHERE harga_jual = 0 OR harga_jual IS NULL");
        DB::statement("UPDATE diag_pemeriksaan SET harga_jual = ROUND(tarif * 1.40, 2) WHERE harga_jual = 0 OR harga_jual IS NULL");
        DB::statement("UPDATE fisio_pemeriksaan SET harga_jual = ROUND(tarif * 1.40, 2) WHERE harga_jual = 0 OR harga_jual IS NULL");
        DB::statement("UPDATE tindakan SET harga_jual = ROUND(tarif * 1.40, 2) WHERE harga_jual = 0 OR harga_jual IS NULL");
        DB::statement("UPDATE obat SET harga_jual = CASE WHEN markup_persen > 0 THEN ROUND(harga_beli * (1 + markup_persen / 100), 2) ELSE ROUND(harga_beli * 1.40, 2) END WHERE harga_jual = 0 OR harga_jual IS NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('lab_pemeriksaan', 'harga_jual')) {
            DB::statement("ALTER TABLE lab_pemeriksaan DROP COLUMN harga_jual");
        }
        if (Schema::hasColumn('rad_pemeriksaan', 'harga_jual')) {
            DB::statement("ALTER TABLE rad_pemeriksaan DROP COLUMN harga_jual");
        }
        if (Schema::hasColumn('obat', 'harga_jual')) {
            DB::statement("ALTER TABLE obat DROP COLUMN harga_jual");
        }
    }
};
