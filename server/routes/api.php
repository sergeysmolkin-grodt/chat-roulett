<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\VideoSignalingController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\FriendController;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\VideoChatController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Stripe Webhook
Route::post('/stripe/webhook', [PaymentController::class, 'handleWebhook']);

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return response()->json($request->user());
    });

    // Stripe Checkout
    Route::post('/payment/create-checkout-session', [PaymentController::class, 'createCheckoutSession']);

    // Video Signaling Routes
    Route::post('/video/offer/{userId}', [VideoSignalingController::class, 'sendOffer']);
    Route::post('/video/answer/{userId}', [VideoSignalingController::class, 'sendAnswer']);
    Route::post('/video/ice-candidate/{userId}', [VideoSignalingController::class, 'sendIceCandidate']);
    Route::post('/video/end-call/{userId}', [VideoSignalingController::class, 'endCall']);

    // Chat routes
    // The following routes related to chat partner searching have been removed:
    // Route::post('/chat/find-partner', [ChatController::class, 'findPartner']);
    // Route::post('/chat/stop-search', [ChatController::class, 'stopSearch']);
    // Route::get('/chat/search-status', [ChatController::class, 'searchStatus']);

    Route::put('/user', [AuthController::class, 'update']);

    Route::post('/user/avatar', [AuthController::class, 'uploadAvatar']);

    // Friend Management Routes
    Route::get('/friends', [FriendController::class, 'index']);
    Route::get('/friends/pending', [FriendController::class, 'pendingRequests']);
    Route::post('/friends/send-request/{recipient}', [FriendController::class, 'sendRequest']);
    Route::post('/friends/accept-request/{friendship}', [FriendController::class, 'acceptRequest']);
    Route::post('/friends/reject-remove/{friendUser}', [FriendController::class, 'rejectOrRemoveFriend']);
    Route::get('/users/search', [FriendController::class, 'searchUsers']);

    // Category routes
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);

    // Video Chat routes
    Route::post('/video-chat/start-searching', [VideoChatController::class, 'startSearching']);
    Route::post('/video-chat/send-signal', [VideoChatController::class, 'sendSignal']);
}); 