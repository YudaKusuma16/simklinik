<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('kunjungan')) {
            Schema::table('kunjungan', function (Blueprint $table) {
                if (!Schema::hasColumn('kunjungan', 'tgl_keluar')) {
                    $table->date('tgl_keluar')->nullable()->after('tgl_kunjungan');
                }
                if (!Schema::hasColumn('kunjungan', 'lama_rawat')) {
                    $table->integer('lama_rawat')->default(1)->after('tgl_keluar');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('kunjungan')) {
            Schema::table('kunjungan', function (Blueprint $table) {
                if (Schema::hasColumn('kunjungan', 'lama_rawat')) {
                    $table->dropColumn('lama_rawat');
                }
                if (Schema::hasColumn('kunjungan', 'tgl_keluar')) {
                    $table->dropColumn('tgl_keluar');
                }
            });
        }
    }
};
