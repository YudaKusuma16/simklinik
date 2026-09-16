<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingController extends Controller
{
    private array $clinicKeys = ['clinic_name', 'clinic_unit', 'clinic_address', 'clinic_logo'];

    public function clinicShow(): JsonResponse
    {
        $data = [];
        foreach ($this->clinicKeys as $k) {
            $row = DB::table('setting')->where('k', $k)->first();
            $data[$k] = $row ? $row->v : '';
        }
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function clinicUpdate(Request $request): JsonResponse
    {
        foreach (['clinic_name', 'clinic_unit', 'clinic_address'] as $k) {
            DB::table('setting')->updateOrInsert(['k' => $k], ['v' => trim($request->input($k, ''))]);
        }

        if ($request->hasFile('logo') && $request->file('logo')->isValid()) {
            $file = $request->file('logo');
            $allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
            if (in_array($file->getMimeType(), $allowed, true)) {
                $newName = 'clinic_logo_' . time() . '.' . $file->extension();
                $file->move(public_path('uploads'), $newName);
                DB::table('setting')->updateOrInsert(['k' => 'clinic_logo'], ['v' => 'uploads/' . $newName]);
            }
        }

        if ($request->input('remove_logo') === '1') {
            DB::table('setting')->updateOrInsert(['k' => 'clinic_logo'], ['v' => '']);
        }

        $data = [];
        foreach ($this->clinicKeys as $k) {
            $row = DB::table('setting')->where('k', $k)->first();
            $data[$k] = $row ? $row->v : '';
        }

        return response()->json(['success' => true, 'message' => 'Profil klinik berhasil disimpan.', 'data' => $data]);
    }
}
