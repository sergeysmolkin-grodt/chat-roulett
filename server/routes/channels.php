<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Auth;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('private-video-chat.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Канал присутствия для отслеживания онлайн-статуса
Broadcast::channel('online-status', function ($user) {
    if (Auth::check()) { // Убедимся, что пользователь аутентифицирован
        return ['id' => $user->id, 'name' => $user->name, 'avatar_url' => $user->avatar_url]; // Данные, которые будут доступны другим на канале
    }
    return false; // Запрещаем анонимный доступ
});
