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
        if (!Schema::hasColumn('billing_detail', 'hasil')) {
            Schema::table('billing_detail', function (Blueprint $table) {
                $table->text('hasil')->nullable()->after('deskripsi');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('billing_detail', 'hasil')) {
            Schema::table('billing_detail', function (Blueprint $table) {
                $table->dropColumn('hasil');
            });
        }
    }
};
