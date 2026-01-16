import { useState, useCallback } from 'react';

interface RazorpayOptions {
  onSuccess?: (response: RazorpayResponse) => void;
  onError?: (error: Error) => void;
  userEmail?: string;
  userName?: string;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

// Script loading with error handling
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });
}

export function useRazorpay() {
  const [loading, setLoading] = useState(false);

  const createSubscription = useCallback(async (
    planId: string,
    options: RazorpayOptions = {}
  ) => {
    try {
      setLoading(true);

      // Create subscription on backend
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create subscription');
      }

      const { subscriptionId, razorpayKeyId } = await response.json();

      if (!razorpayKeyId) {
        throw new Error('Razorpay key not configured');
      }

      // Load Razorpay script with error handling
      await loadRazorpayScript();

      // Razorpay checkout options
      const rzpOptions = {
        key: razorpayKeyId,
        subscription_id: subscriptionId,
        name: 'WorkoutAPI',
        description: 'Subscription Payment',
        image: '/logo.png',
        prefill: {
          email: options.userEmail,
          name: options.userName,
        },
        theme: {
          color: '#3B82F6',
        },
        handler: async (response: RazorpayResponse) => {
          try {
            // Verify payment on backend
            const verifyResponse = await fetch('/api/subscription/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            options.onSuccess?.(response);
          } catch (error) {
            console.error('Payment verification error:', error);
            options.onError?.(error instanceof Error ? error : new Error('Verification failed'));
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            options.onError?.(new Error('Payment cancelled by user'));
          },
        },
      };

      // Open Razorpay checkout
      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (error) {
      console.error('Create subscription error:', error);
      setLoading(false);
      options.onError?.(error instanceof Error ? error : new Error('Subscription failed'));
    }
  }, []);

  return {
    createSubscription,
    loading,
  };
}

// Add Razorpay to window type
declare global {
  interface Window {
    Razorpay: any;
  }
}