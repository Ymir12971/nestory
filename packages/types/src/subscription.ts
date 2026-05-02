// Subscription — aligns with GET /subscriptions/me and GET /subscriptions/paywall-config

// Five-state subscription status — authoritative field; written by RevenueCat webhook
export type SubscriptionStatus =
  | 'never_paid'      // original Free, never started a trial
  | 'trial_active'    // in Free Trial; premium rights active
  | 'premium_active'  // paid subscription active
  | 'trial_ended'     // trial expired, back to Free (R-10 Notify shows)
  | 'premium_ended';  // subscription expired, back to Free (R-10 Notify shows)

// plan_type field — coarse gating (free vs premium)
export type PlanType = 'free' | 'premium';

// RevenueCat contract status
export type SubscriptionContractStatus = 'active' | 'cancelled' | 'expired';

export type BillingCycle = 'yearly' | 'monthly';

// GET /subscriptions/me response
export interface Subscription {
  planType: PlanType;
  subscriptionStatus: SubscriptionStatus;       // five-state authoritative field
  status: SubscriptionContractStatus;            // RevenueCat contract status
  billingCycle: BillingCycle | null;             // null for Free users
  storyQuotaRemaining: number | null;            // current month's remaining; null = unlimited (Premium)
  expiresAt: string | null;
  benefits: string[];                            // ST-02B billing details list
  highlightCount: number;
  highlightLimit: number | null;                 // null for Premium users
  activeChildId: string | null;
}

// Paywall trigger types
export type PaywallTrigger = 'A' | 'B' | 'C' | 'D';

export interface PaywallBenefit {
  key: string;
  label: string;
}

export interface PaywallPricingOption {
  amount: number;
  currency: string;
  period: 'year' | 'month';
  saveLabel?: string;
}

// GET /subscriptions/paywall-config response
export interface PaywallConfig {
  trigger: PaywallTrigger;
  headline: string;
  benefits: PaywallBenefit[];
  pricing: {
    yearly: PaywallPricingOption;
    monthly: PaywallPricingOption;
  };
}

// Client-side audit log for paywall impressions (stored in subscriptions.paywall_trigger_log JSONB)
export interface PaywallTriggerLog {
  [trigger: string]: string;  // trigger → ISO 8601 first-shown timestamp
}
