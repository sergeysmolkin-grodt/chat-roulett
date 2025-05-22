<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class ChatController extends Controller
{
    public function findPartner(Request $request)
    {
        $currentUser = Auth::user();

        $room = $request->input('room');
        if (!$room) {
            return response()->json(['message' => 'Room is required.'], 422);
        }

        // 1. Пометить текущего пользователя как ищущего в конкретной комнате
        $currentUser->is_searching_for_partner = true;
        $currentUser->searching_started_at = Carbon::now();
        $currentUser->searching_room = $room;
        $currentUser->save();

        // 2. Попытаться найти партнера только в этой комнате
        $partner = User::where('is_searching_for_partner', true)
            ->where('id', '!=', $currentUser->id)
            ->where('searching_room', $room)
            ->where('searching_started_at', '>=', Carbon::now()->subMinutes(5))
            ->orderBy('searching_started_at', 'asc')
            ->first();

        if ($partner) {
            // Партнер найден. Сбрасываем флаги поиска для обоих.
            $partner->is_searching_for_partner = false;
            $partner->searching_started_at = null;
            $partner->searching_room = null;
            $partner->save();

            $currentUser->is_searching_for_partner = false;
            $currentUser->searching_started_at = null;
            $currentUser->searching_room = null;
            $currentUser->save();

            return response()->json([
                'message' => 'Partner found.',
                'partner_id' => $partner->id,
            ]);
        } else {
            // Партнер не найден
            return response()->json(['message' => 'No partner found at the moment. Still searching...'], 200);
        }
    }

    public function stopSearch(Request $request)
    {
        $currentUser = Auth::user();
        $currentUser->is_searching_for_partner = false;
        $currentUser->searching_started_at = null;
        $currentUser->save();

        return response()->json(['message' => 'Search stopped.']);
    }
}
