# 🚨 CRITICAL SECURITY ISSUE - Firebase API Keys Exposed

## Issue
Firebase API keys and configuration were committed to the public GitHub repository. This is a **critical security vulnerability**.

## Immediate Actions Required

### 1. Regenerate Firebase API Keys
**PRIORITY: URGENT**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `smpl-journal`
3. Navigate to **Project Settings** → **General**
4. Under **Your apps**, find your web app
5. Click **Show Config** to see current keys
6. **Regenerate the API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Select project: `smpl-journal`
   - Navigate to **APIs & Services** → **Credentials**
   - Find the API key: `AIzaSyAcKWMQHjUtAq9Bu-W57JI0E6vipRH3WkY`
   - Click **Delete** to revoke it
   - Create a **New API Key**
   - Restrict the new key to only your app domains

### 2. Set Up Environment Variables

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your NEW Firebase credentials to `.env`:**
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_NEW_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=smpl-journal.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=smpl-journal
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=smpl-journal.firebasestorage.app
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=290585147080
   EXPO_PUBLIC_FIREBASE_APP_ID=1:290585147080:web:215f6530a93fc6ec0f57fd
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-C2ENYKTYXW
   EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://smpl-journal-default-rtdb.asia-southeast1.firebasedatabase.app
   ```

3. **Verify `.env` is in `.gitignore`:**
   ```bash
   grep "^\.env$" .gitignore || echo ".env" >> .gitignore
   ```

### 3. Secure Firebase Project

1. **Enable App Check** (Recommended):
   - Go to Firebase Console → **App Check**
   - Register your app
   - Enable enforcement for Realtime Database and Firestore
   - This validates requests are from your legitimate app

2. **Restrict API Key** (Critical):
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to **APIs & Services** → **Credentials**
   - Edit your NEW API key
   - Under **Application restrictions**:
     - For web: Add your domain (e.g., `yourdomain.com`)
     - For mobile: Use Android/iOS app restrictions
   - Under **API restrictions**:
     - Select "Restrict key"
     - Only enable: Firebase, Realtime Database, Firestore, Auth

3. **Review Security Rules**:
   - Check `firestore.rules` and ensure they validate authentication
   - Check Realtime Database rules
   - Never allow public read/write without authentication

### 4. Check for Unauthorized Access

1. **Review Firebase Authentication logs:**
   - Firebase Console → **Authentication** → **Users**
   - Look for suspicious sign-ups

2. **Review Database access logs:**
   - Check for unusual patterns in read/write operations

3. **Monitor billing:**
   - Firebase Console → **Usage and billing**
   - Set up budget alerts
   - Check for unexpected spikes

### 5. Rotate Other Secrets (If Applicable)

- [ ] Database passwords
- [ ] Service account keys
- [ ] OAuth client secrets
- [ ] Any other API keys in the project

## What Was Exposed

The following credentials were in the public repository:

```
API Key: AIzaSyAcKWMQHjUtAq9Bu-W57JI0E6vipRH3WkY
Project ID: smpl-journal
App ID: 1:290585147080:web:215f6530a93fc6ec0f57fd
Measurement ID: G-C2ENYKTYXW
```

**Commit where exposed:** Check git history
**Repository:** Public GitHub repository
**Exposure duration:** Unknown - could be since first commit

## Prevention for Future

### Development Workflow
1. ✅ `.env` is now in `.gitignore`
2. ✅ Environment variables use `EXPO_PUBLIC_` prefix
3. ✅ `.env.example` template provided (no secrets)
4. ❌ **Never commit `.env` file**
5. ❌ **Never hardcode credentials in source code**

### Git Hooks (Optional but Recommended)
Add a pre-commit hook to detect secrets:

```bash
# Install git-secrets
brew install git-secrets

# Add to your repo
git secrets --install
git secrets --register-aws
git secrets --add 'AKIA[0-9A-Z]{16}'
git secrets --add 'AIza[0-9A-Za-z\\-_]{35}'
```

### CI/CD
- Store environment variables in CI/CD platform (GitHub Secrets, etc.)
- Never log environment variables in CI output
- Use Expo EAS Secrets for production builds

## Monitoring

Set up monitoring for:
- [ ] Unusual authentication patterns
- [ ] Spike in database reads/writes
- [ ] Unexpected billing charges
- [ ] Failed authentication attempts

## Incident Response Checklist

- [x] Issue identified and documented
- [ ] Old API keys revoked/deleted
- [ ] New API keys generated
- [ ] Environment variables configured
- [ ] API key restrictions applied
- [ ] App Check enabled (optional but recommended)
- [ ] Security rules reviewed
- [ ] Access logs checked
- [ ] Billing monitored
- [ ] Team notified
- [ ] Incident documented

## GitHub Pages / Web Deployment

After updating your `.env` file with new credentials:

### Local Deployments
Your existing deployment script will work automatically:
```bash
./deploy-gh-pages.sh
```
Expo reads the `.env` file during build.

### Automated Deployments (GitHub Actions)
If using automated deployments, add Firebase credentials as GitHub Secrets:

1. Go to GitHub repository **Settings** → **Secrets and variables** → **Actions**
2. Add all 8 `EXPO_PUBLIC_*` variables as secrets
3. GitHub Actions will create `.env` from secrets during build

See [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md) for detailed instructions.

## Support

- **Firebase Support:** https://firebase.google.com/support
- **Security Best Practices:** https://firebase.google.com/docs/projects/api-keys

## Timeline

- **Exposed:** Unknown (check git history)
- **Discovered:** February 18, 2026
- **Mitigated:** February 18, 2026 (environment variables + new API key)
- **Fully Resolved:** [TO BE COMPLETED after monitoring period]

---

**Remember:** Treat all previously exposed keys as compromised. Even if you don't see suspicious activity, regenerate them as a precaution.
