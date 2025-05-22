<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Events\VideoChat\NewUserJoined;
use App\Events\VideoChat\AnswerMade;
use App\Events\VideoChat\IceCandidateSent;
use App\Events\VideoChat\CallEnded;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class VideoSignalingController extends Controller
{
    public function sendOffer(Request $request, $targetUserId)
    {
        $validated = $request->validate([
            'offer' => 'required',
        ]);

        \Log::info('[VideoSignaling] sendOffer', [
            'from' => Auth::id(),
            'to' => $targetUserId,
            'offer' => $validated['offer'],
        ]);

        broadcast(new NewUserJoined($validated['offer'], Auth::id(), $targetUserId))
            ->toOthers();

        return response()->json(['message' => 'Offer sent']);
    }

    public function sendAnswer(Request $request, $targetUserId)
    {
        $validated = $request->validate([
            'answer' => 'required',
        ]);

        $callerId = Auth::id();

        \Log::info('[VideoSignaling] sendAnswer', [
            'from' => $callerId,
            'to' => $targetUserId,
            'answer' => $validated['answer'],
        ]);

        broadcast(new AnswerMade($validated['answer'], $callerId, $targetUserId))
            ->toOthers();

        // Обновление статистики
        $caller = User::find($callerId);
        $receiver = User::find($targetUserId);

        if ($caller && $receiver) {
            // Обновляем звонящего (кто отправил answer)
            $caller->increment('total_calls');
            if (!$caller->first_conversation_at) {
                $caller->first_conversation_at = now();
            }
            $caller->save();

            // Обновляем принимающего (кому изначально был offer)
            $receiver->increment('total_calls');
            if (!$receiver->first_conversation_at) {
                $receiver->first_conversation_at = now();
            }
            $receiver->save();

            Log::info('Call statistics updated for users', ['user1' => $callerId, 'user2' => $targetUserId]);
        } else {
            Log::warning('Could not find users to update call statistics', ['caller_id' => $callerId, 'receiver_id' => $targetUserId]);
        }

        return response()->json(['message' => 'Answer sent']);
    }

    public function sendIceCandidate(Request $request, $targetUserId)
    {
        $validated = $request->validate([
            'candidate' => 'required',
        ]);

        \Log::info('[VideoSignaling] sendIceCandidate', [
            'from' => Auth::id(),
            'to' => $targetUserId,
            'candidate' => $validated['candidate'],
        ]);

        broadcast(new IceCandidateSent($validated['candidate'], Auth::id(), $targetUserId))
            ->toOthers();

        return response()->json(['message' => 'ICE candidate sent']);
    }

    public function endCall(Request $request, $targetUserId)
    {
        \Log::info('[VideoSignaling] endCall', [
            'from' => Auth::id(),
            'to' => $targetUserId,
        ]);

        broadcast(new CallEnded(Auth::id(), $targetUserId))
            ->toOthers();

        return response()->json(['message' => 'Call ended notification sent']);
    }
}
