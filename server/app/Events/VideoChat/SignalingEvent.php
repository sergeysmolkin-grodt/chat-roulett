<?php

namespace App\Events\VideoChat;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SignalingEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomId;
    public $userId;
    public $signalData; // This will contain offer, answer, or ICE candidate

    /**
     * Create a new event instance.
     *
     * @return void
     */
    public function __construct($roomId, $userId, $signalData)
    {
        $this->roomId = $roomId;
        $this->userId = $userId;
        $this->signalData = $signalData;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn()
    {
        // This event is broadcast on a private room channel
        return new PrivateChannel('video-chat-room.'. $this->roomId);
    }

    public function broadcastAs()
    { 
        return 'signaling.event';
    }

    /**
     * Determine if this event should broadcast.
     *
     * @return bool
     */
    public function broadcastWhen()
    {
        // We don't want to broadcast the signal back to the sender
        // The presence channel auth user is not directly available here.
        // This logic is usually handled client-side or via a different mechanism if needed.
        // A simpler way for now: just broadcast and client can ignore its own messages.
        return true; 
    }
} 