// GET /users/me
export interface User {
  id: string;
  email: string;
  timezone: string;   // IANA, e.g. "Asia/Shanghai"
  createdAt: string;  // ISO 8601 UTC
}

// PATCH /users/me
export interface UserPatch {
  timezone?: string;
}
