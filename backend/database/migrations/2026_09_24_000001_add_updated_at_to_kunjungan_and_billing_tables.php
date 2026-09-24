<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('kunjungan')) {
            Schema::table('kunjungan', function (Blueprint $table) {
                if (!Schema::hasColumn('kunjungan', 'updated_at')) {
                    $table->dateTime('updated_at')->nullable()->after('created_at');
                }
            });
        }

        if (Schema::hasTable('billing')) {
            Schema::table('billing', function (Blueprint $table) {
                if (!Schema::hasColumn('billing', 'updated_at')) {
                    $table->dateTime('updated_at')->nullable()->after('created_at');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('kunjungan')) {
            Schema::table('kunjungan', function (Blueprint $table) {
                if (Schema::hasColumn('kunjungan', 'updated_at')) {
                    $table->dropColumn('updated_at');
                }
            });
        }

        if (Schema::hasTable('billing')) {
            Schema::table('billing', function (Blueprint $table) {
                if (Schema::hasColumn('billing', 'updated_at')) {
                    $table->dropColumn('updated_at');
                }
            });
        }
    }
};
