# Cross-Device Sync Implementation Plan

## Architecture Overview

### Current State
- Local-only storage (AsyncStorage)
- No authentication
- No cloud sync
- Data stays on device

### Target State
- Multi-device sync (like WhatsApp)
- End-to-end encryption
- Authentication required
- PWA + Web + Mobile apps
- Offline-first with cloud backup

## Implementation Steps

### Phase 1: Firebase Setup (Week 1)

#### 1.1 Install Dependencies
```bash
npm install firebase
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
npm install crypto-js
npm install @react-native-async-storage/async-storage
```

#### 1.2 Create Firebase Project
1. Go to https://console.firebase.google.com
2. Create new project: "DailyTracker"
3. Enable Authentication (Email, Google, Apple)
4. Enable Firestore Database
5. Enable Firebase Hosting

#### 1.3 Security Rules (Firestore)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data - only owner can read/write
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Encrypted entries
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Encrypted expenses
      match /expenses/{expenseId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Encrypted action items
      match /actionItems/{itemId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Phase 2: Authentication (Week 1)

#### 2.1 Create Auth Context
```typescript
// src/contexts/AuthContext.tsx
- User state management
- Sign in/up with email
- Google/Apple sign-in
- Password reset
- Session persistence
```

#### 2.2 Auth Screens
- Login screen
- Signup screen
- Forgot password
- Profile/settings

### Phase 3: Encryption (Week 2)

#### 3.1 Encryption Strategy
**Master Key Generation:**
- Derived from user password using PBKDF2
- Never stored in plain text
- Used to encrypt/decrypt all data

**Data Encryption:**
- AES-256 encryption for all entries
- Each document encrypted before upload
- Decrypted on device after download

#### 3.2 Implementation
```typescript
// src/utils/encryption.ts
- generateMasterKey(password, salt)
- encryptData(data, masterKey)
- decryptData(encryptedData, masterKey)
- hashPassword(password)
```

### Phase 4: Cloud Sync (Week 2)

#### 4.1 Sync Service
```typescript
// src/services/SyncService.ts
- Upload encrypted entries
- Download encrypted entries
- Conflict resolution
- Offline queue
- Real-time listeners
```

#### 4.2 Storage Migration
- Migrate from AsyncStorage to hybrid approach
- Local cache + Cloud backup
- Offline-first architecture

### Phase 5: PWA Configuration (Week 3)

#### 5.1 Service Worker
```javascript
// public/service-worker.js
- Cache static assets
- Offline fallback
- Background sync
```

#### 5.2 Web App Manifest
```json
{
  "name": "Smpl Journal",
  "short_name": "Smpl Journal",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/"
}
```

#### 5.3 Install Prompt
- Add to Home Screen banner
- iOS Safari instructions
- Android Chrome install

### Phase 6: Web Deployment (Week 3)

#### 6.1 Vercel/Netlify Setup
```bash
# Build for web
npx expo export --platform web

# Deploy to Vercel
vercel --prod

# Or deploy to Firebase Hosting
firebase deploy --only hosting
```

#### 6.2 Custom Domain
- Configure DNS
- SSL certificate
- CDN setup

## Data Model

### User Document
```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  encryptionSalt: string; // For key derivation
  createdAt: Date;
  lastSync: Date;
}
```

### Encrypted Entry
```typescript
interface EncryptedEntry {
  id: string;
  userId: string;
  encryptedData: string; // AES-256 encrypted JSON
  iv: string; // Initialization vector
  createdAt: Date;
  updatedAt: Date;
  deleted: boolean;
}
```

## Security Considerations

1. **Master Key**
   - Never sent to server
   - Derived from password locally
   - Not recoverable if password forgotten

2. **Zero-Knowledge**
   - Server cannot read user data
   - All encryption/decryption on client

3. **Password Reset**
   - Requires re-encryption of all data
   - Or permanent data loss (user choice)

4. **Device Trust**
   - Optional biometric on mobile
   - Session tokens for convenience

## Cost Estimate (Firebase)

- **Spark Plan (Free):**
  - 50k reads/day
  - 20k writes/day
  - 1GB storage
  - Good for ~100 active users

- **Blaze Plan (Pay-as-you-go):**
  - $0.06 per 100k reads
  - $0.18 per 100k writes
  - $0.18/GB storage
  - ~$5-20/month for 1000 users

## Timeline

- Week 1: Firebase + Auth
- Week 2: Encryption + Sync
- Week 3: PWA + Deployment
- Week 4: Testing + Polish

## Next Steps

1. Create Firebase project
2. Install dependencies
3. Implement authentication
4. Add encryption layer
5. Build sync service
6. Configure PWA
7. Deploy to web

Would you like me to start implementing?
