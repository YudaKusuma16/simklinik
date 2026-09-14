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
        if (!Schema::hasColumn('billing', 'hasil_diagnostik')) {
            Schema::table('billing', function (Blueprint $table) {
                $table->text('hasil_diagnostik')->nullable()->after('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('billing', 'hasil_diagnostik')) {
            Schema::table('billing', function (Blueprint $table) {
                $table->dropColumn('hasil_diagnostik');
            });
        }
    }
};
