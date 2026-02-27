# Mobile Deployment Guide

## TestFlight Deployment

### Prerequisites

1. **Apple Developer Program** membership ($99/year)
2. **Expo account** with the project added
3. **EAS CLI** configured with Apple API key

### Step 1: Configure Apple Credentials

Run locally (requires Apple Developer account):

```bash
cd apps/mobile
eas credentials
```

This will:
- Create/select your Apple Team ID
- Generate an Apple API key
- Store credentials in Expo servers

### Step 2: Set Environment Variables for CI

In GitHub repository settings, add these secrets:
- `EXPO_APPLE_ID` - Your Apple ID email
- `EXPO_APPLE_PASSWORD` - App-specific password
- `EXPO_APPLE_TEAM_ID` - Your Apple Team ID

### Step 3: Build and Submit

```bash
# Build for production
bun run build:production:ios

# Submit to TestFlight
eas submit --platform ios --latest
```

### Step 4: Add Testers

1. Go to App Store Connect
2. Navigate to your app → TestFlight
3. Add external testers (email list)
4. Wait for build processing (~10-15 min)

## Current Status

- ✅ Code builds successfully
- ✅ TypeScript checks pass
- ✅ CI/CD pipeline configured
- ⏳ Awaiting Apple Developer credentials setup

## Troubleshooting

### "Distribution Certificate is not validated"
- Run `eas credentials` locally to set up
- Or manually upload certs via App Store Connect

### "ITSAppUsesNonExemptEncryption" error
- Add to `app.config.ts`:
```ts
ios: {
  infoPlist: {
    ITSAppUsesNonExemptEncryption: false
  }
}
```
