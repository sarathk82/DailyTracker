# Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name: `daily-tracker` or `smpl-journal`
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Add Web App

1. In project overview, click the web icon (`</>`)
2. Register app:
   - App nickname: `Smpl Journal Web`
   - Check "Also set up Firebase Hosting"
3. Copy the Firebase configuration
4. Replace values in `src/config/firebase.ts`

```typescript
export const firebaseConfig = {
  apiKey: "AIza...",  // From Firebase Console
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

## Step 3: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Enable **Email/Password**:
   - Click "Email/Password"
   - Toggle "Enable"
   - Save
4. (Optional) Enable **Google Sign-In**:
   - Click "Google"
   - Toggle "Enable"
   - Select support email
   - Save

## Step 4: Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Select:
   - Location: Choose closest to your users
   - Start in **production mode** (we'll add rules)
4. Click "Enable"

## Step 5: Set Security Rules

1. In Firestore, go to "Rules" tab
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User metadata - only owner can read/write
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Encrypted entries - only owner
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Encrypted expenses - only owner
      match /expenses/{expenseId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Encrypted action items - only owner
      match /actionItems/{itemId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Click "Publish"

## Step 6: Enable Firebase Hosting

1. Go to **Hosting**
2. Click "Get started"
3. Follow setup instructions (we'll do this later)

## Step 7: Update App

1. Update `src/config/firebase.ts` with your config
2. Update `App.tsx` to use AuthProvider
3. Test authentication

## Verification Checklist

- [ ] Firebase project created
- [ ] Web app registered
- [ ] Firebase config copied to `firebase.ts`
- [ ] Email/Password authentication enabled
- [ ] Firestore database created
- [ ] Security rules deployed
- [ ] Firebase Hosting enabled

## Next Steps

After setup:
1. Run `npm install` (if not done)
2. Update `App.tsx` to wrap with `AuthProvider`
3. Test sign up/sign in
4. Verify encrypted data in Firestore
5. Deploy to hosting

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Check `apiKey` in `firebase.ts`
- Ensure Web app is created in Firebase Console

### "Missing or insufficient permissions"
- Verify Firestore security rules are published
- Check user is authenticated

### Build errors
```bash
npm install --legacy-peer-deps
```

## Cost Monitoring

Firebase Free Tier (Spark Plan):
- 50,000 reads/day
- 20,000 writes/day
- 1 GB storage
- Good for ~100 active users

Set up billing alerts:
1. Go to project settings
2. Set up budget alerts at $5, $10, $20
