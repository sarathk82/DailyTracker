# GitHub Pages Deployment Setup

## Quick Answer
✅ **Your local deployments will work fine!** The `deploy-gh-pages.sh` script uses your local `.env` file automatically.

When you run `./deploy-gh-pages.sh`, Expo reads the `.env` file during build, so your new API key is included in the deployment.

---

## For Local Deployments (Current Setup)

Just run your deployment script as usual:

```bash
./deploy-gh-pages.sh
```

Expo automatically reads `.env` during the `npx expo export --platform web` step.

---

## For Automated GitHub Actions Deployments (Optional)

If you want automatic deployments when you push to GitHub, you need to set up GitHub Secrets.

### Step 1: Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of these secrets (copy values from your `.env` file):

| Secret Name | Value from .env |
|-------------|----------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Your new API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `smpl-journal.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `smpl-journal` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `smpl-journal.firebasestorage.app` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `290585147080` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Your App ID |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | Your Measurement ID |
| `EXPO_PUBLIC_FIREBASE_DATABASE_URL` | Your Database URL |

### Step 2: Enable GitHub Actions Workflow

The workflow file `.github/workflows/deploy-gh-pages.yml` has been created. It will:

- ✅ Trigger automatically on pushes to `master` or `main` branch
- ✅ Create `.env` file from GitHub Secrets during build
- ✅ Build and deploy to GitHub Pages
- ✅ Support manual triggering via "Run workflow" button

### Step 3: Enable GitHub Pages (if not already done)

1. Go to **Settings** → **Pages**
2. Under **Source**, select: **Deploy from a branch**
3. Select branch: **gh-pages**
4. Select folder: **/ (root)**
5. Click **Save**

---

## Verification

### Test Local Deployment
```bash
# Build locally to verify .env is being read
npx expo export --platform web

# Check if Firebase config is in the build
grep "AIzaSyCgSHa2" dist/_expo/static/js/web/*.js
# Should show your API key is embedded in the bundle
```

### Test Automated Deployment (if set up)
1. Push a commit to master/main
2. Go to **Actions** tab on GitHub
3. Watch the "Deploy to GitHub Pages" workflow
4. Check for any errors in the build logs

---

## Troubleshooting

### Local deployment not picking up .env
- Ensure `.env` exists in project root
- Check Expo is reading it: `echo $EXPO_PUBLIC_FIREBASE_API_KEY` (won't work, but shows env vars are local only)
- Clear Expo cache: `npx expo start --clear`

### GitHub Actions failing
- Verify all 8 secrets are set in GitHub Settings
- Check workflow logs for specific errors
- Ensure gh-pages branch exists after first deployment

### App deployed but Firebase not connecting
- Check browser console for Firebase errors
- Verify API key is correctly embedded: View page source → search for "firebase"
- Ensure API key restrictions in Google Cloud Console allow your GitHub Pages domain

---

## Security Notes

✅ **Local .env**: Never committed (in .gitignore)
✅ **GitHub Secrets**: Encrypted and never exposed in logs
✅ **Build output**: API keys are embedded in JavaScript (normal for web apps)
✅ **GitHub Pages domain**: Add to Firebase API key restrictions

**Important**: EXPO_PUBLIC_* variables are embedded in the client-side JavaScript bundle. This is normal and expected. Protect them by:
1. Restricting the Firebase API key to your domains only
2. Using Firebase Security Rules to protect data
3. Enabling Firebase App Check (recommended)

---

## Current Status

- ✅ `.env` file created with new API key
- ✅ `.env` in `.gitignore` (secure)
- ✅ Local deployment script ready: `./deploy-gh-pages.sh`
- ✅ GitHub Actions workflow ready (needs secrets added)
- ⏳ GitHub Secrets: **Not configured yet** (only needed for automated deployments)

**Next step**: Run `./deploy-gh-pages.sh` to deploy with your new API key!
