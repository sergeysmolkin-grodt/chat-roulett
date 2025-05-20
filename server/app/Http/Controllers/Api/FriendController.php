<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Friendship;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FriendController extends Controller
{
    /**
     * Получить список друзей текущего пользователя.
     */
    public function index()
    {
        $user = Auth::user();
        $friends = $user->getAllFriends(); // Используем новый метод
        return response()->json($friends);
    }

    /**
     * Получить список входящих запросов в друзья.
     */
    public function pendingRequests()
    {
        $user = Auth::user();
        $pendingRequests = $user->receivedFriendRequests()->where('status', 'pending')->with('user')->get();
        return response()->json($pendingRequests);
    }

    /**
     * Отправить запрос в друзья.
     */
    public function sendRequest(Request $request, User $recipient)
    {
        $sender = Auth::user();

        if ($sender->id === $recipient->id) {
            return response()->json(['message' => 'You cannot send a friend request to yourself.'], 400);
        }

        // Проверка, не являются ли они уже друзьями или запрос уже отправлен/получен
        $existingFriendship = Friendship::where(function ($query) use ($sender, $recipient) {
            $query->where('user_id', $sender->id)->where('friend_id', $recipient->id);
        })->orWhere(function ($query) use ($sender, $recipient) {
            $query->where('user_id', $recipient->id)->where('friend_id', $sender->id);
        })->first();

        if ($existingFriendship) {
            if ($existingFriendship->status === 'accepted') {
                return response()->json(['message' => 'You are already friends with this user.'], 400);
            }
            if ($existingFriendship->status === 'pending') {
                return response()->json(['message' => 'Friend request already pending.'], 400);
            }
        }

        $friendship = Friendship::create([
            'user_id' => $sender->id,
            'friend_id' => $recipient->id,
            'status' => 'pending',
        ]);

        return response()->json(['message' => 'Friend request sent.', 'friendship' => $friendship], 201);
    }

    /**
     * Принять запрос в друзья.
     * Friendship $friendship здесь - это запись из таблицы friendships, где friend_id это текущий юзер.
     */
    public function acceptRequest(Request $request, Friendship $friendship)
    {
        $user = Auth::user();
        if ($friendship->friend_id !== $user->id || $friendship->status !== 'pending') {
            return response()->json(['message' => 'Invalid friend request.'], 400);
        }

        $friendship->update(['status' => 'accepted']);

        return response()->json(['message' => 'Friend request accepted.', 'friendship' => $friendship]);
    }

    /**
     * Отклонить запрос в друзья или удалить из друзей.
     */
    public function rejectOrRemoveFriend(Request $request, User $friendUser)
    {
        $currentUser = Auth::user();

        $friendship = Friendship::where(function ($query) use ($currentUser, $friendUser) {
            $query->where('user_id', $currentUser->id)->where('friend_id', $friendUser->id);
        })->orWhere(function ($query) use ($currentUser, $friendUser) {
            $query->where('user_id', $friendUser->id)->where('friend_id', $currentUser->id);
        })->first();

        if (!$friendship) {
            return response()->json(['message' => 'No friendship record found.'], 404);
        }

        // Если это был запрос в друзья, можно просто удалить. Если уже друзья - тоже удалить.
        $friendship->delete();

        return response()->json(['message' => 'Friendship removed or request declined.']);
    }
    
    /**
     * Поиск пользователей по имени или email (простой пример).
     */
    public function searchUsers(Request $request)
    {
        $searchTerm = $request->input('term');
        $currentUser = Auth::user();

        if (!$searchTerm) {
            return response()->json([], 200);
        }

        $users = User::where('id', '!= ', $currentUser->id) // Не искать самого себя
                       ->where(function ($query) use ($searchTerm) {
                           $query->where('name', 'like', "%$searchTerm%")
                                 ->orWhere('email', 'like', "%$searchTerm%");
                       })
                       ->select('id', 'name', 'email', 'avatar_url') // Возвращаем только нужные поля
                       ->take(10) // Ограничение результатов
                       ->get();

        return response()->json($users);
    }
}
