<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'nullable|string|max:255',
            'username' => [
                'nullable',
                'string',
                'max:255',
                'alpha_dash', // Позволяет буквы, цифры, тире и подчеркивания
                Rule::unique('users', 'username')
            ],
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Password::defaults()],
            'gender' => 'required|string|in:male,female,other',
            'city' => 'nullable|string|max:255',
            'age' => 'nullable|integer|min:1|max:120',
            'bio' => 'nullable|string|max:1000',
            'interests' => 'nullable|array',
            'interests.*' => 'string|max:50',
        ], [
            'username.unique' => 'Этот никнейм уже занят.',
            'username.alpha_dash' => 'Никнейм может содержать только буквы, цифры, тире и подчеркивания.',
        ]);

        // Хотя бы одно из полей name или username должно быть заполнено
        if (empty($validatedData['name']) && empty($validatedData['username'])) {
            return response()->json([
                'message' => 'The name or username field is required when neither is present.',
                'errors' => [
                    'name' => ['Укажите имя или никнейм.'],
                    'username' => ['Укажите имя или никнейм.']
                ]
            ], 422);
        }

        $user = User::create([
            'name' => $validatedData['name'] ?? null,
            'username' => $validatedData['username'] ?? null,
            'email' => $validatedData['email'],
            'password' => Hash::make($validatedData['password']),
            'gender' => $validatedData['gender'],
            'city' => $validatedData['city'] ?? null,
            'age' => $validatedData['age'] ?? null,
            'bio' => $validatedData['bio'] ?? null,
            'interests' => $validatedData['interests'] ?? [],
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $user = $request->user();
        // Revoke all old tokens and create a new one
        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'username' => [
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('users', 'username')->ignore($user->id)
            ],
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'gender' => 'required|in:male,female,other',
            'password' => 'nullable|string|min:8|confirmed',
            'city' => 'nullable|string|max:255',
            'age' => 'nullable|integer|min:1|max:120',
            'bio' => 'nullable|string|max:1000',
            'interests' => 'nullable|array',
            'interests.*' => 'string|max:50',
        ], [
            'username.unique' => 'Этот никнейм уже занят.',
            'username.alpha_dash' => 'Никнейм может содержать только буквы, цифры, тире и подчеркивания.',
        ]);
        
        if (empty($validated['name']) && empty($validated['username'])) {
             return response()->json([
                'message' => 'The name or username field is required when neither is present.',
                'errors' => [
                    'name' => ['Укажите имя или никнейм.'],
                    'username' => ['Укажите имя или никнейм.']
                ]
            ], 422);
        }

        $user->name = $validated['name'] ?? null;
        $user->username = $validated['username'] ?? null;
        $user->email = $validated['email'];
        $user->gender = $validated['gender'];
        if (!empty($validated['password'])) {
            $user->password = bcrypt($validated['password']);
        }
        $user->city = $validated['city'] ?? null;
        $user->age = $validated['age'] ?? null;
        $user->bio = $validated['bio'] ?? null;
        $user->interests = $validated['interests'] ?? [];
        $user->save();

        return response()->json(['user' => $user]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);
        $file = $request->file('avatar');
        $path = $file->store('avatars', 'public');
        $user->avatar_url = '/storage/' . $path;
        $user->save();
        return response()->json(['avatar_url' => $user->avatar_url, 'user' => $user]);
    }
}
