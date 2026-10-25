/**
 * Feature Flags Configuration
 *
 * Control which features are enabled/disabled in the app.
 * Set to false to disable features for App Store submission or testing.
 */

const parseEnvFlag = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

// Allow overriding select flags via env vars (e.g., Cloudflare Pages Variables)
const envEnablePhotoboothNav = process.env.EXPO_PUBLIC_ENABLE_PHOTOBOOTH_NAV;

export const FEATURE_FLAGS = {
  // QR Scanner features
  ENABLE_QR_SCANNER: false,
  ENABLE_EVENT_CHECKIN: false,

  // HackerBucks features
  ENABLE_HACKERBUCKS: true,

  // Photobooth features
  ENABLE_PHOTOBOOTH: false,
  ENABLE_PHOTOBOOTH_NAV: parseEnvFlag(envEnablePhotoboothNav, false),

  // Google OAuth
  ENABLE_GOOGLE_LOGIN: false,

  // Judging features
  ENABLE_JUDGING: true,
  ENABLE_JUDGE_TIMERS: false,

  // Other features
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_SCHEDULE: false,

  // Dashboard test features
  ENABLE_NOTIFICATION_EXAMPLE: false,
  ENABLE_404_TEST: false,
  ENABLE_MODAL_TEST_WIDGET: false,
  ENABLE_ONBOARDING_TEST: false,
  ENABLE_TEST_QR_GENERATOR: true,
} as const;

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (
  feature: keyof typeof FEATURE_FLAGS
): boolean => {
  return FEATURE_FLAGS[feature];
};

// Export feature names for type safety
export type FeatureFlag = keyof typeof FEATURE_FLAGS;
