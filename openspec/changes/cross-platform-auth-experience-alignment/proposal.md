## Why

The repo now has a consistent web auth route structure, but web and mobile still implement authentication as separate user experiences. They share some low-level auth primitives, yet they do not share the same presentation contract, screen sequencing, copy, or post-auth routing policy.

If we want a 1-to-1 auth experience across web and mobile, auth needs to be treated as one product surface with one canonical UX contract. Right now style drift and behavioral drift are both still possible because the shared layer stops too low in the stack.

## What Changes

- Define a single cross-platform auth UX contract covering entry, verification, passkey, loading, and error states.
- Introduce shared auth presentation primitives and configuration so web and mobile render the same auth surface structure and copy.
- Move shared auth flow helpers lower into reusable packages so both web and mobile use the same flow semantics.
- Align per-app post-auth destinations and recovery behavior through shared config instead of platform-local decisions.

## Capabilities

### New Capabilities

- `cross-platform-auth-experience-alignment`: Ensures first-party web and mobile apps deliver the same auth experience and behavior.

### Modified Capabilities

- `auth-system-cleanup`: Extends auth standardization from backend/session cleanup into shared product-level auth UX.

## Impact

- Affected code: mobile auth screens and provider integration, shared auth UI/components, shared auth helpers, and web auth config.
- Affected systems: email OTP flow, passkey flow, auth copy and visual treatment, and cross-platform UX consistency.
