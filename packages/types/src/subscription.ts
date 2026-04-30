export type SubscriptionStatus =
  | 'never_paid'
  | 'trial_active'
  | 'premium_active'
  | 'trial_ended'
  | 'premium_ended';

export type SubscriptionPlan = 'free' | 'premium_monthly' | 'premium_yearly';

export type PaywallTrigger = 'A' | 'B' | 'C' | 'D';

export interface PaywallTriggerLog {
  userId: string;
  trigger: PaywallTrigger;
  shownAt: string;
  outcome: 'dismissed' | 'subscribed' | 'maybe_later';
}
