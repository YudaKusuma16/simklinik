<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('kunjungan', 'jenis_registrasi')) {
            Schema::table('kunjungan', function (Blueprint $table) {
                $table->string('jenis_registrasi', 20)->default('rawat_jalan')->after('dokter_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('kunjungan', 'jenis_registrasi')) {
            Schema::table('kunjungan', function (Blueprint $table) {
                $table->dropColumn('jenis_registrasi');
            });
        }
    }
};
