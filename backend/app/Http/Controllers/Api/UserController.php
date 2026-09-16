<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Throwable;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = DB::table('users as u')
            ->join('roles as r', 'r.id', '=', 'u.role_id')
            ->leftJoin('poli as po', 'po.id', '=', 'u.poli_id')
            ->select('u.*', 'r.kode as role_kode', 'r.nama as role_nama', 'po.nama as poli_nama')
            ->orderBy('u.nama')
            ->get();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function meta(): JsonResponse
    {
        $roles = DB::table('roles')->orderBy('id')->get(['id', 'kode', 'nama']);
        $poliList = DB::table('poli')->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama']);

        return response()->json(['success' => true, 'roles' => $roles, 'poli_list' => $poliList]);
    }

    public function show(int $id): JsonResponse
    {
        $row = DB::table('users')->where('id', $id)->first();
        if (!$row) {
            return response()->json(['success' => false, 'message' => 'Pengguna tidak ditemukan.'], 404);
        }
        return response()->json(['success' => true, 'data' => $row]);
    }

    public function store(Request $request): JsonResponse
    {
        $errors = $this->validateUserInput($request, false);
        if ($errors) return response()->json(['success' => false, 'errors' => $errors], 422);

        $roleKode = DB::table('roles')->where('id', $request->input('role_id'))->value('kode');
        $isDokter = $roleKode === 'dokter';
        $poliId = ($isDokter && $request->input('poli_id')) ? (int) $request->input('poli_id') : null;

        try {
            DB::table('users')->insert([
                'nama' => trim($request->input('nama')),
                'username' => trim($request->input('username')),
                'email' => trim($request->input('email')) ?: null,
                'telepon' => trim($request->input('telepon')) ?: null,
                'role_id' => (int) $request->input('role_id'),
                'poli_id' => $poliId,
                'status' => $request->input('status', 'aktif'),
                'password' => Hash::make($request->input('password')),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            return response()->json(['success' => true, 'message' => 'Pengguna berhasil ditambahkan.']);
        } catch (Throwable $ex) {
            $msg = str_contains($ex->getMessage(), '1062') ? 'Username sudah digunakan.' : 'Gagal menyimpan: ' . $ex->getMessage();
            return response()->json(['success' => false, 'errors' => [$msg]], 422);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $errors = $this->validateUserInput($request, true);
        if ($errors) return response()->json(['success' => false, 'errors' => $errors], 422);

        $roleKode = DB::table('roles')->where('id', $request->input('role_id'))->value('kode');
        $isDokter = $roleKode === 'dokter';
        $poliId = ($isDokter && $request->input('poli_id')) ? (int) $request->input('poli_id') : null;

        $data = [
            'nama' => trim($request->input('nama')),
            'username' => trim($request->input('username')),
            'email' => trim($request->input('email')) ?: null,
            'telepon' => trim($request->input('telepon')) ?: null,
            'role_id' => (int) $request->input('role_id'),
            'poli_id' => $poliId,
            'status' => $request->input('status', 'aktif'),
            'updated_at' => now(),
        ];

        $password = $request->input('password', '');
        if ($password !== '') {
            $data['password'] = Hash::make($password);
        }

        try {
            DB::table('users')->where('id', $id)->update($data);
            return response()->json(['success' => true, 'message' => 'Pengguna berhasil diperbarui.']);
        } catch (Throwable $ex) {
            $msg = str_contains($ex->getMessage(), '1062') ? 'Username sudah digunakan.' : 'Gagal menyimpan: ' . $ex->getMessage();
            return response()->json(['success' => false, 'errors' => [$msg]], 422);
        }
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        // Prevent deleting self
        $me = $request->user();
        if ($me && (int) $me->id === $id) {
            return response()->json(['success' => false, 'message' => 'Tidak bisa menghapus akun yang sedang digunakan.'], 403);
        }
        try {
            DB::table('users')->where('id', $id)->delete();
            return response()->json(['success' => true, 'message' => 'Pengguna berhasil dihapus.']);
        } catch (Throwable) {
            return response()->json(['success' => false, 'message' => 'Pengguna tidak bisa dihapus karena masih digunakan.'], 422);
        }
    }

    private function validateUserInput(Request $request, bool $isEdit): array
    {
        $errors = [];
        if (!trim($request->input('nama', ''))) $errors[] = 'Nama wajib diisi.';
        if (!trim($request->input('username', ''))) $errors[] = 'Username wajib diisi.';
        if (!$request->input('role_id')) $errors[] = 'Role wajib dipilih.';

        $roleKode = DB::table('roles')->where('id', $request->input('role_id'))->value('kode');
        if ($roleKode === 'dokter' && !$request->input('poli_id')) {
            $errors[] = 'Poli wajib dipilih untuk role Dokter.';
        }

        $password = $request->input('password', '');
        if (!$isEdit && !$password) $errors[] = 'Password wajib diisi untuk pengguna baru.';
        if ($password !== '' && strlen($password) < 5) $errors[] = 'Password minimal 5 karakter.';

        return $errors;
    }
}
