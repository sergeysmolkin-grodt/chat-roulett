<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Stripe\Stripe;
use Stripe\Checkout\Session as StripeCheckoutSession;
use App\Models\User;
use Stripe\Webhook;
use Stripe\Exception\SignatureVerificationException;
use UnexpectedValueException;
use Carbon\Carbon;

class PaymentController extends Controller
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret'));
        Stripe::setApiVersion('2024-04-10'); // Используйте актуальную версию API Stripe
    }

    public function createCheckoutSession(Request $request): \Illuminate\Http\JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        // Проверяем, не является ли пользователь уже активным подписчиком
        if ($user->subscription_status === 'active' && $user->subscription_ends_at && $user->subscription_ends_at->isFuture()) {
            return response()->json(['message' => 'У вас уже есть активная подписка.'], 400);
        }

        $stripeCustomerId = $user->stripe_customer_id;
        if (!$stripeCustomerId) {
            // Создаем нового клиента в Stripe, если его еще нет
            try {
                $customer = \Stripe\Customer::create([
                    'email' => $user->email,
                    'name' => $user->name,
                ]);
                $stripeCustomerId = $customer->id;
                $user->stripe_customer_id = $stripeCustomerId;
                $user->save();
            } catch (\Exception $e) {
                return response()->json(['error' => 'Не удалось создать клиента Stripe: ' . $e->getMessage()], 500);
            }
        }

        $priceId = config('services.stripe.price_id');
        if (!$priceId) {
            return response()->json(['error' => 'Stripe Price ID не настроен.'], 500);
        }

        $successUrl = config('app.frontend_url') . '/payment/success?session_id={CHECKOUT_SESSION_ID}';
        $cancelUrl = config('app.frontend_url') . '/payment/cancel';

        try {
            $checkoutSession = StripeCheckoutSession::create([
                'customer' => $stripeCustomerId, // ВОЗВРАЩАЕМ КЛИЕНТА
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'price' => $priceId,
                    'quantity' => 1,
                ]],
                'mode' => 'subscription',
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
            ]);

            return response()->json([
                'checkout_session_id' => $checkoutSession->id, 
                'stripe_public_key' => config('services.stripe.key'),
                'checkout_url' => $checkoutSession->url
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Не удалось создать сессию Stripe Checkout: ' . $e->getMessage()], 500);
        }
    }
    
    public function handleWebhook(Request $request): \Illuminate\Http\Response
    {
        $payload = $request->getContent();
        $sigHeader = $request->server('HTTP_STRIPE_SIGNATURE');
        $webhookSecret = config('services.stripe.webhook.secret');

        if (!$webhookSecret) {
            \Log::error('Stripe webhook secret not configured.');
            return response('Webhook secret not configured.', 500);
        }

        try {
            $event = Webhook::constructEvent(
                $payload, $sigHeader, $webhookSecret
            );
        } catch(SignatureVerificationException $e) {
            // Invalid signature
            \Log::error('Stripe webhook signature verification failed.', ['exception' => $e]);
            return response('Webhook signature verification failed.', 400);
        } catch(UnexpectedValueException $e) {
            // Invalid payload
            \Log::error('Stripe webhook invalid payload.', ['exception' => $e]);
            return response('Invalid payload.', 400);
        }

        \Log::info('Stripe webhook received', ['type' => $event->type, 'id' => $event->id]);

        // Обработка различных типов событий
        switch ($event->type) {
            case 'checkout.session.completed':
                $session = $event->data->object; // $session это объект Stripe Checkout Session
                $this->handleCheckoutSessionCompleted($session);
                break;
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': // или canceled
                $subscription = $event->data->object; // $subscription это объект Stripe Subscription
                $this->handleSubscriptionUpdated($subscription);
                break;
            // TODO: Добавить обработку других необходимых событий, например:
            // case 'invoice.payment_succeeded':
            // case 'invoice.payment_failed':
            default:
                \Log::info('Unhandled Stripe webhook event type: ' . $event->type);
        }

        return response('Webhook Handled', 200);
    }

    protected function handleCheckoutSessionCompleted(\Stripe\Checkout\Session $session)
    {
        // Важно: не полагайтесь только на это событие для предоставления доступа.
        // Используйтеr customer.subscription.updated для обновления статуса подписки.
        // Это событие хорошо для первичных действий, например, отправки email "Спасибо за покупку".

        $stripeCustomerId = $session->customer;
        $user = User::where('stripe_customer_id', $stripeCustomerId)->first();

        if (!$user) {
            \Log::error('User not found for Stripe customer ID during checkout.session.completed', ['stripe_customer_id' => $stripeCustomerId]);
            return;
        }

        // Если checkout session была для подписки, то у нее будет subscription ID
        if ($session->subscription) {
            $user->subscription_id = $session->subscription;
            // Статус и дата окончания будут обновлены через customer.subscription.updated
            $user->save();
            \Log::info('User subscription ID updated via checkout.session.completed', ['user_id' => $user->id, 'subscription_id' => $session->subscription]);
        } else {
             \Log::warning('Checkout session completed without subscription ID', ['session_id' => $session->id, 'customer_id' => $stripeCustomerId]);
        }
    }

    protected function handleSubscriptionUpdated(\Stripe\Subscription $subscription)
    {
        $stripeCustomerId = $subscription->customer;
        $user = User::where('stripe_customer_id', $stripeCustomerId)->first();

        if (!$user) {
            \Log::error('User not found for Stripe customer ID during subscription update', ['stripe_customer_id' => $stripeCustomerId]);
            return;
        }

        $user->subscription_id = $subscription->id;
        $user->subscription_status = $subscription->status; // e.g., active, past_due, canceled, trialing

        if ($subscription->current_period_end) {
            $user->subscription_ends_at = Carbon::createFromTimestamp($subscription->current_period_end);
        } else {
            // Если нет current_period_end (например, подписка отменена и не будет продлеваться)
            // Можно оставить старую дату или установить null, в зависимости от логики
             $user->subscription_ends_at = null;
        }
        
        $user->save();
        \Log::info('User subscription updated', ['user_id' => $user->id, 'status' => $subscription->status, 'ends_at' => $user->subscription_ends_at]);
    }
}
