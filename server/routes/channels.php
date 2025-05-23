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
        return [
            'id' => $user->id, 
            'name' => $user->name, 
            'avatar_url' => $user->avatar_url
        ]; // Данные, которые будут доступны другим на канале
    }
    return false; // Запрещаем анонимный доступ
});

Broadcast::channel('video-chat-waiting-room', function ($user) {
    // This is a public channel for now, but you might want to add auth later
    // if you want to restrict who can listen to searching users.
    return true; 
});

Broadcast::channel('user.{userId}', function ($user, $userId) {
    // Authorize that the authenticated user can listen on this private channel
    return (int) $user->id === (int) $userId;
});

Broadcast::channel('video-chat-room.{roomId}', function ($user, $roomId) {
    // Here, you would typically check if the user is part of this room.
    // For simplicity in this initial setup, if the user is authenticated, they can join.
    // In a real application, you'd have a list of participants for each room.
    if (Auth::check()) {
        return ['id' => $user->id, 'name' => $user->name]; // Return user data for presence channel
    }
    return false;
});
