# Mobile Deployment Guide

## One-Time Setup Required (Interactive)

EAS requires **one interactive build** to cache credentials. This must be done locally:

```bash
cd apps/mobile

# Step 1: Configure credentials (select Apple Team, create API key)
eas credentials --platform ios

# Step 2: Run a simulator build to cache credentials
bun run build:simulator:ios
```

**This is a one-time requirement.** After this, CI builds will work.

## TestFlight Deployment

### Prerequisites

1. **Apple Developer Program** membership ($99/year)
2. **Expo account** with the project added
3. Complete **One-Time Setup** above

### CI Environment Variables

In GitHub repository settings, add secrets:
- `EXPO_APPLE_ID` - Your Apple ID email
- `EXPO_APPLE_PASSWORD` - App-specific password  
- `EXPO_APPLE_TEAM_ID` - Your Apple Team ID

### Build and Submit

```bash
# Build for production
bun run build:production:ios

# Submit to TestFlight
eas submit --platform ios --latest
```

### Add Testers

1. Go to App Store Connect
2. Navigate to your app → TestFlight
3. Add external testers (email list)
4. Wait for build processing (~10-15 min)

## Current Status

- ✅ Code builds successfully
- ✅ TypeScript checks pass
- ✅ CI/CD pipeline configured
- ⏳ Requires one-time interactive setup (see above)

## Troubleshooting

### "Distribution Certificate is not validated"
- Run `eas credentials` locally to set up
- Or manually upload certs via App Store Connect

### "ITSAppUsesNonExemptEncryption" error
- ✅ Fixed: Added to `app.config.ts`

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
