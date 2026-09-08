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
        if (!Schema::hasColumn('billing', 'cover_penjamin')) {
            Schema::table('billing', function (Blueprint $table) {
                $table->decimal('cover_penjamin', 14, 2)->default(0)->after('total');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('billing', 'cover_penjamin')) {
            Schema::table('billing', function (Blueprint $table) {
                $table->dropColumn('cover_penjamin');
            });
        }
    }
};
