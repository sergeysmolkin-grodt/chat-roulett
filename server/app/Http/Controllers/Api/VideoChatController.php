<?php

namespace App\Http\Controllers\Api;

use App\Events\VideoChat\UserSearchingEvent;
use App\Events\VideoChat\SignalingEvent;
use App\Events\VideoChat\MatchFoundEvent; // We'll need this later
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache; // Using Cache for simplicity to store searching users
use App\Http\Controllers\Controller;
use Illuminate\Support\Str;

class VideoChatController extends Controller
{
    // Store users who are currently searching for a chat partner
    // In a real application, you might use Redis or a database for this
    private const SEARCHING_USERS_CACHE_KEY = 'searching_video_chat_users';
    private const USER_SEARCH_TIMEOUT = 60; // seconds for a user to be in the pool

    public function startSearching(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $searchingUsers = Cache::get(self::SEARCHING_USERS_CACHE_KEY, []);

        // Check if there's another user searching
        $partnerId = null;
        foreach ($searchingUsers as $userId => $timestamp) {
            if ($userId != $user->id) {
                // Found a partner
                $partnerId = $userId;
                break;
            }
        }

        if ($partnerId) {
            // Remove both users from the searching list
            unset($searchingUsers[$partnerId]);
            // Potentially, the current user might be in the list if they clicked search multiple times
            // or if there was a race condition, so remove them too.
            unset($searchingUsers[$user->id]);
            Cache::put(self::SEARCHING_USERS_CACHE_KEY, $searchingUsers, self::USER_SEARCH_TIMEOUT * 2); // Update cache

            $roomId = Str::uuid()->toString(); // Generate a unique room ID

            // Notify both users that a match has been found
            broadcast(new MatchFoundEvent($roomId, $user->id, $partnerId))->toOthers();
            // It's good practice to also send the event to the current user if they need the room ID immediately
            // However, Reverb's toOthers() is for broadcasting to other connected clients on the channel.
            // For private channels, the creator of the event usually receives it too if they are subscribed.
            // Let's ensure both get it by broadcasting to their specific private channels via the event's broadcastOn.

            return response()->json(['message' => 'Match found.', 'roomId' => $roomId, 'partnerId' => $partnerId]);
        } else {
            // Add current user to the searching list with a timestamp
            $searchingUsers[$user->id] = now()->timestamp;
            Cache::put(self::SEARCHING_USERS_CACHE_KEY, $searchingUsers, self::USER_SEARCH_TIMEOUT * 2);

            // Broadcast that this user is searching
            broadcast(new UserSearchingEvent($user->id))->toOthers();

            return response()->json(['message' => 'Searching for a partner...']);
        }
    }

    public function sendSignal(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'roomId' => 'required|string',
            'signalData' => 'required',
        ]);

        // Broadcast the signal to the other user in the room
        // The SignalingEvent will be broadcast on the private room channel
        // and should not be received by the sender if handled correctly client-side or via broadcastWhen (though broadcastWhen is tricky with Reverb's default setup).
        broadcast(new SignalingEvent($validated['roomId'], $user->id, $validated['signalData']))->toOthers();

        return response()->json(['message' => 'Signal sent.']);
    }
} 