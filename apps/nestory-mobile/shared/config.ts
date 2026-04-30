/**
 * Runtime config — replace placeholder values before each environment's build.
 * Justin: set WEB_BASE_URL once nestory-web is deployed.
 */
export const config = {
  apiBaseUrl: 'https://api.nestory.app',    // TODO(justin): set dev URL from backend
  webBaseUrl: 'https://web.nestory.app',    // TODO(justin): replace with real URL
} as const;
