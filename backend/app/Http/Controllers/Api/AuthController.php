<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if (Auth::attempt([
            'username' => $credentials['username'],
            'password' => $credentials['password'],
            'status' => 'aktif',
        ], false)) {
            $request->session()->regenerate();

            $user = Auth::user();
            $user->update(['last_login' => now()]);
            $user->load('role');

            return response()->json([
                'success' => true,
                'message' => 'Login berhasil.',
                'data' => [
                    'id' => $user->id,
                    'nama' => $user->nama,
                    'username' => $user->username,
                    'email' => $user->email,
                    'telepon' => $user->telepon,
                    'avatar' => $user->avatar ? asset($user->avatar) : null,
                    'role' => $user->role?->kode,
                    'role_nama' => $user->role?->nama,
                    'poli_id' => $user->poli_id,
                ],
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Username atau password salah, atau akun nonaktif.',
        ], 401);
    }

    public function me(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Belum terautentikasi.',
            ], 401);
        }

        $user->load('role');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'nama' => $user->nama,
                'username' => $user->username,
                'email' => $user->email,
                'telepon' => $user->telepon,
                'avatar' => $user->avatar ? asset($user->avatar) : null,
                'role' => $user->role?->kode,
                'role_nama' => $user->role?->nama,
                'poli_id' => $user->poli_id,
                'last_login' => $user->last_login?->toIso8601String(),
                'created_at' => $user->created_at?->toIso8601String(),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
        ]);
    }
}
