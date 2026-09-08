<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE billing_detail MODIFY COLUMN kategori ENUM('jasa_dokter','tindakan','konsultasi','laboratorium','radiologi','diagnostik','fisioterapi','farmasi','administrasi') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE billing_detail MODIFY COLUMN kategori ENUM('jasa_dokter','tindakan','laboratorium','radiologi','diagnostik','fisioterapi','farmasi','administrasi') NOT NULL");
    }
};
