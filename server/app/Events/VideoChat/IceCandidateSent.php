<?php

namespace App\Events\VideoChat;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class IceCandidateSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $candidate;
    public $fromUserId;

    /**
     * Create a new event instance.
     */
    public function __construct($candidate, $fromUserId)
    {
        $this->candidate = $candidate;
        $this->fromUserId = $fromUserId;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return []; // Placeholder
    }

    public function broadcastAs()
    {
        return 'ice-candidate-sent';
    }
}
