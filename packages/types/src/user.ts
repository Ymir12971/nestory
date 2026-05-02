// OAuth provider linking — shown in Settings · Account screen
export interface LinkedProvider {
  provider: 'apple' | 'google';
  providerEmail: string | null; // null if user revoked email sharing (Apple Hide My Email etc.)
  connectedAt: string;          // ISO 8601 UTC
}

// GET /users/me
export interface User {
  id: string;
  email: string;
  name: string;                 // display name (from OAuth profile or user-set)
  timezone: string;             // IANA, e.g. "Asia/Shanghai"
  linkedProviders: LinkedProvider[];
  createdAt: string;            // ISO 8601 UTC
}

// PATCH /users/me
export interface UserPatch {
  name?: string;
  timezone?: string;
}
