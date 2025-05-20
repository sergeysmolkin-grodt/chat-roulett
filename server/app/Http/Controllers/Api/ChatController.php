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

        // 1. Пометить текущего пользователя как ищущего
        $currentUser->is_searching_for_partner = true;
        $currentUser->searching_started_at = Carbon::now();
        $currentUser->save();

        // 2. Попытаться найти партнера
        // Ищем другого пользователя, который также ищет, не является текущим пользователем,
        // и начал искать не слишком давно (например, в течение последних 5 минут, чтобы избежать "зависших" поисков)
        // Также, для рулетки, обычно ищут партнера другого пола (если это важно для вашего приложения)
        // Пока что сделаем простой поиск без учета пола.
        $partner = User::where('is_searching_for_partner', true)
            ->where('id', '!=', $currentUser->id)
            // ->where('gender', '!=', $currentUser->gender) // Раскомментируйте, если нужен поиск по противоположному полу
            ->where('searching_started_at', '>=', Carbon::now()->subMinutes(5))
            ->orderBy('searching_started_at', 'asc') // Находим того, кто ждет дольше
            ->first();

        if ($partner) {
            // Партнер найден. Сбрасываем флаги поиска для обоих.
            $partner->is_searching_for_partner = false;
            $partner->searching_started_at = null;
            $partner->save();

            $currentUser->is_searching_for_partner = false;
            $currentUser->searching_started_at = null;
            $currentUser->save();

            return response()->json([
                'message' => 'Partner found.',
                'partner_id' => $partner->id,
                // Можно также вернуть partner_name или другую информацию, если нужно
            ]);
        } else {
            // Партнер не найден
            return response()->json(['message' => 'No partner found at the moment. Still searching...'], 200); // или 404, если предпочитаете
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
