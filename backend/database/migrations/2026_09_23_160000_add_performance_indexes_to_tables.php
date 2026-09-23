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
        // 1. Index pada tabel kunjungan untuk filter harian antrean & poli
        if (Schema::hasTable('kunjungan')) {
            Schema::table('kunjungan', function (Blueprint $table) {
                $table->index(['tgl_kunjungan', 'status', 'poli_id'], 'idx_kunjungan_filter');
            });
        }

        // 2. Index pada tabel pasien untuk pencarian NIK, telepon, dan nama
        if (Schema::hasTable('pasien')) {
            Schema::table('pasien', function (Blueprint $table) {
                if (Schema::hasColumn('pasien', 'nik')) {
                    $table->index('nik', 'idx_pasien_nik');
                }
                if (Schema::hasColumn('pasien', 'telepon')) {
                    $table->index('telepon', 'idx_pasien_telepon');
                }
                if (Schema::hasColumn('pasien', 'nama')) {
                    $table->index('nama', 'idx_pasien_nama');
                }
            });
        }

        // 3. Index pada tabel stok_mutasi untuk riwayat mutasi kartu stok obat
        if (Schema::hasTable('stok_mutasi')) {
            Schema::table('stok_mutasi', function (Blueprint $table) {
                $table->index(['obat_id', 'tanggal'], 'idx_mutasi_obat_tgl');
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
                $table->dropIndex('idx_kunjungan_filter');
            });
        }

        if (Schema::hasTable('pasien')) {
            Schema::table('pasien', function (Blueprint $table) {
                if (Schema::hasColumn('pasien', 'nik')) {
                    $table->dropIndex('idx_pasien_nik');
                }
                if (Schema::hasColumn('pasien', 'telepon')) {
                    $table->dropIndex('idx_pasien_telepon');
                }
                if (Schema::hasColumn('pasien', 'nama')) {
                    $table->dropIndex('idx_pasien_nama');
                }
            });
        }

        if (Schema::hasTable('stok_mutasi')) {
            Schema::table('stok_mutasi', function (Blueprint $table) {
                $table->dropIndex('idx_mutasi_obat_tgl');
            });
        }
    }
};
