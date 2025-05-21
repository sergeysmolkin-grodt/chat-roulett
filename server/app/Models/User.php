<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'gender',
        'email_verified_at',
        'stripe_customer_id',
        'subscription_id',
        'subscription_status',
        'subscription_ends_at',
        'is_searching_for_partner',
        'searching_started_at',
        'avatar_url',
        'last_seen_at',
        'city',
        'age',
        'bio',
        'interests',
        'total_calls',
        'first_conversation_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'username' => 'string',
            'subscription_ends_at' => 'datetime',
            'is_searching_for_partner' => 'boolean',
            'searching_started_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'interests' => 'array',
            'total_calls' => 'integer',
            'first_conversation_at' => 'datetime',
        ];
    }

    /**
     * Check if the user has an active subscription.
     */
    public function hasActiveSubscription()
    {
        // Implement the logic to check if the user has an active subscription
    }

    /**
     * Запросы в друзья, отправленные этим пользователем.
     */
    public function sentFriendRequests(): HasMany
    {
        return $this->hasMany(Friendship::class, 'user_id');
    }

    /**
     * Запросы в друзья, полученные этим пользователем.
     */
    public function receivedFriendRequests(): HasMany
    {
        return $this->hasMany(Friendship::class, 'friend_id');
    }

    /**
     * Друзья пользователя (принятые запросы, где он user_id).
     */
    public function friends(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'friendships', 'user_id', 'friend_id')
            ->wherePivot('status', 'accepted')
            ->withTimestamps();
    }

    /**
     * Друзья пользователя (принятые запросы, где он friend_id).
     */
    public function friendOf(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'friendships', 'friend_id', 'user_id')
            ->wherePivot('status', 'accepted')
            ->withTimestamps();
    }

    /**
     * Получить всех друзей (объединение двух предыдущих связей).
     * Это не прямая связь Eloquent, а аксессор или метод модели.
     */
    public function getAllFriends()
    {
        return $this->friends->merge($this->friendOf);
    }

    protected $appends = ['total_friends'];

    public function getTotalFriendsAttribute(): int
    {
        return $this->friends()->count() + $this->friendOf()->count();
    }
}
