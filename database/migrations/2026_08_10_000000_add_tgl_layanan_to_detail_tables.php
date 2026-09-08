<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'rm_tindakan',
            'lab_order_detail',
            'rad_order_detail',
            'fisio_order_detail',
            'resep_detail',
            'billing_detail',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'tgl_layanan')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->date('tgl_layanan')->nullable()->after('id');
                });
            }
        }
    }

    public function down(): void
    {
        $tables = [
            'rm_tindakan',
            'lab_order_detail',
            'rad_order_detail',
            'fisio_order_detail',
            'resep_detail',
            'billing_detail',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'tgl_layanan')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropColumn('tgl_layanan');
                });
            }
        }
    }
};
