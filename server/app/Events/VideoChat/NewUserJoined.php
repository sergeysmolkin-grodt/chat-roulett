<?php

namespace App\Events\VideoChat;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewUserJoined implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $offer;
    public $fromUserId;

    /**
     * Create a new event instance.
     */
    public function __construct($offer, $fromUserId)
    {
        $this->offer = $offer;
        $this->fromUserId = $fromUserId;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // This event will be broadcasted to a specific user's private channel
        // The recipient user ID will be part of the signaling logic later
        // For now, let's assume we will pass the target user ID when dispatching the event.
        // This will be handled by the controller logic.
        return []; // Placeholder, will be dynamically set or broadcasted on a general channel initially
    }

    public function broadcastAs()
    {
        return 'new-user-joined';
    }
}
