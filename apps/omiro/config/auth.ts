// Canonical post-auth destination and allowed redirect paths for the mobile app.
type AppAuthConfig = {
  defaultPostAuthDestination: string;
  // Allowed redirect prefixes, for validating a redirect is safe to follow.
  allowedDestinations: string[];
};

export const CHAT_AUTH_CONFIG: AppAuthConfig = {
  defaultPostAuthDestination: '/(protected)',
  allowedDestinations: ['/(protected)'],
};
