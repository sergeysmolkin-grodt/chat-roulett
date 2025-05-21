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

class VideoSignalingController extends Controller
{
    public function sendOffer(Request $request, $targetUserId)
    {
        $validated = $request->validate([
            'offer' => 'required',
        ]);

        Log::info('Sending offer', [
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

        Log::info('Sending answer', [
            'from' => Auth::id(),
            'to' => $targetUserId,
            'answer' => $validated['answer'],
        ]);

        broadcast(new AnswerMade($validated['answer'], Auth::id(), $targetUserId))
            ->toOthers();

        return response()->json(['message' => 'Answer sent']);
    }

    public function sendIceCandidate(Request $request, $targetUserId)
    {
        $validated = $request->validate([
            'candidate' => 'required',
        ]);

        Log::info('Sending ICE candidate', [
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
        Log::info('Ending call', [
            'from' => Auth::id(),
            'to' => $targetUserId,
        ]);

        broadcast(new CallEnded(Auth::id(), $targetUserId))
            ->toOthers();

        return response()->json(['message' => 'Call ended notification sent']);
    }
}
