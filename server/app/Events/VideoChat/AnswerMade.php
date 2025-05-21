<?php

namespace App\Events\VideoChat;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AnswerMade implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $answer;
    public $fromUserId;
    public $targetUserId;

    /**
     * Create a new event instance.
     */
    public function __construct($answer, $fromUserId, $targetUserId)
    {
        $this->answer = $answer;
        $this->fromUserId = $fromUserId;
        $this->targetUserId = $targetUserId;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('video-chat.' . $this->targetUserId)];
    }

    public function broadcastAs()
    {
        return 'answer-made';
    }
}
