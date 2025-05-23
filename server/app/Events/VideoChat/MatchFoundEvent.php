<?php

namespace App\Events\VideoChat;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchFoundEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomId;
    public $userId1;
    public $userId2;

    /**
     * Create a new event instance.
     *
     * @return void
     */
    public function __construct($roomId, $userId1, $userId2)
    {
        $this->roomId = $roomId;
        $this->userId1 = $userId1;
        $this->userId2 = $userId2;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn()
    {
        // This event is sent to specific users who have been matched
        return [
            new PrivateChannel('user.'.$this->userId1),
            new PrivateChannel('user.'.$this->userId2),
        ];
    }

    public function broadcastAs()
    {
        return 'match.found';
    }
} 