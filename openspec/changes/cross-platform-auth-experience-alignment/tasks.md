## 1. Canonical Contract

- [ ] 1.1 Define the cross-platform auth screen/state contract and app auth config shape
- [ ] 1.2 Inventory current web/mobile auth differences and map them to the canonical contract

## 2. Shared Presentation

- [ ] 2.1 Extract shared auth presentation primitives usable by both web and mobile
- [ ] 2.2 Standardize auth copy, spacing, button hierarchy, and error treatment across platforms

## 3. Shared Flow Helpers

- [ ] 3.1 Move shared auth result handling, error normalization, and destination policy into reusable auth helpers
- [ ] 3.2 Align web and mobile passkey/email OTP flows to use the shared helper layer

## 4. Platform Adoption

- [ ] 4.1 Update web auth surfaces to consume the new shared contract and config
- [ ] 4.2 Update mobile auth surfaces to consume the new shared contract and config

## 5. Verification

- [ ] 5.1 Add verification for cross-platform auth parity in behavior and copy
- [ ] 5.2 Validate that per-app post-auth destinations are identical across web and mobile
