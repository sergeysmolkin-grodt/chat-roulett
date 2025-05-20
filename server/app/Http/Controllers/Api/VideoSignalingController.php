<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Events\VideoChat\NewUserJoined;
use App\Events\VideoChat\AnswerMade;
use App\Events\VideoChat\IceCandidateSent;
use App\Events\VideoChat\CallEnded;

class VideoSignalingController extends Controller
{
    public function sendOffer(Request $request, $targetUserId)
    {
        $validated = $request->validate([
            'offer' => 'required',
        ]);

        broadcast(new NewUserJoined($validated['offer'], Auth::id()))
            ->toOthersOnPrivateChannel('private-video-chat.'. $targetUserId);

        return response()->json(['message' => 'Offer sent']);
    }

    public function sendAnswer(Request $request, $targetUserId)
    {
        $validated = $request->validate([
            'answer' => 'required',
        ]);

        broadcast(new AnswerMade($validated['answer'], Auth::id()))
            ->toOthersOnPrivateChannel('private-video-chat.'. $targetUserId);

        return response()->json(['message' => 'Answer sent']);
    }

    public function sendIceCandidate(Request $request, $targetUserId)
    {
        $validated = $request->validate([
            'candidate' => 'required',
        ]);

        broadcast(new IceCandidateSent($validated['candidate'], Auth::id()))
            ->toOthersOnPrivateChannel('private-video-chat.'. $targetUserId);

        return response()->json(['message' => 'ICE candidate sent']);
    }

    public function endCall(Request $request, $targetUserId)
    {
        broadcast(new CallEnded(Auth::id()))
            ->toOthersOnPrivateChannel('private-video-chat.'. $targetUserId);

        return response()->json(['message' => 'Call ended notification sent']);
    }
}
