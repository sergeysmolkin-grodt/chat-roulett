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
        $gender = $request->input('gender'); // пол текущего пользователя
        $preferGender = $request->input('preferGender', 'female'); // кого искать: female, male, any
        \Log::info('[findPartner] called', [
            'user_id' => $currentUser->id,
            'gender' => $gender,
            'preferGender' => $preferGender,
            'room' => $room,
        ]);
        if (!$room) {
            \Log::info('[findPartner] Room is required', ['user_id' => $currentUser->id]);
            return response()->json(['message' => 'Room is required.'], 422);
        }

        \Log::info('[findPartner] User started search', [
            'user_id' => $currentUser->id,
            'gender' => $gender,
            'preferGender' => $preferGender,
            'room' => $room,
        ]);

        // 1. Пометить текущего пользователя как ищущего в конкретной комнате
        $currentUser->is_searching_for_partner = true;
        $currentUser->searching_started_at = Carbon::now();
        $currentUser->searching_room = $room;
        $currentUser->save();

        // 2. Попытаться найти партнера с учётом встречных фильтров
        $partnerQuery = User::where('is_searching_for_partner', true)
            ->where('id', '!=', $currentUser->id)
            ->where('searching_room', $room)
            ->where('searching_started_at', '>=', Carbon::now()->subMinutes(5))
            ->orderBy('searching_started_at', 'asc');

        $partner = $partnerQuery->get()->first(function($partner) use ($gender, $preferGender) {
            // Встречный фильтр: если хотя бы один ищет 'any', или фильтры совпадают
            $partnerPreferGender = request()->input('preferGender', 'female');
            // partner->gender — пол партнёра
            // partner->preferGender — кого ищет партнёр (может быть null)
            $partnerPref = $partner->preferGender ?? 'any';
            // Если хотя бы один ищет any
            if ($preferGender === 'any' || $partnerPref === 'any') return true;
            // Если оба ищут female и один из них female, другой male — соединять
            if ($preferGender === 'female' && $partner->gender === 'female') return true;
            if ($partnerPref === $gender) return true;
            return false;
        });

        \Log::info('[findPartner] Partner search result', [
            'user_id' => $currentUser->id,
            'partner_id' => $partner ? $partner->id : null,
            'preferGender' => $preferGender,
            'room' => $room,
        ]);

        if ($preferGender === 'female' && !$partner) {
            \Log::info('[findPartner] No female found', ['user_id' => $currentUser->id]);
            // Нет женщин в поиске
            return response()->json(['message' => 'no_female_found'], 200);
        }

        if ($partner) {
            \Log::info('[findPartner] Partner found', [
                'user_id' => $currentUser->id,
                'partner_id' => $partner->id,
            ]);
            // Партнер найден. Сбрасываем флаги поиска для обоих.
            $partner->is_searching_for_partner = false;
            $partner->searching_started_at = null;
            $partner->searching_room = null;
            $partner->save();

            $currentUser->is_searching_for_partner = false;
            $currentUser->searching_started_at = null;
            $currentUser->searching_room = null;
            $currentUser->save();

            \Log::info('[findPartner] Flags after reset', [
                'user_id' => $currentUser->id,
                'user_flags' => [
                    'is_searching_for_partner' => $currentUser->is_searching_for_partner,
                    'searching_room' => $currentUser->searching_room,
                ],
                'partner_id' => $partner->id,
                'partner_flags' => [
                    'is_searching_for_partner' => $partner->is_searching_for_partner,
                    'searching_room' => $partner->searching_room,
                ],
            ]);

            return response()->json([
                'message' => 'Partner found.',
                'partner_id' => $partner->id,
            ]);
        } else {
            \Log::info('[findPartner] No partner found, still searching', ['user_id' => $currentUser->id]);
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

    public function searchStatus(Request $request)
    {
        $user = Auth::user();
        return response()->json([
            'is_searching_for_partner' => $user->is_searching_for_partner,
            'searching_room' => $user->searching_room,
            'searching_started_at' => $user->searching_started_at,
        ]);
    }
}
