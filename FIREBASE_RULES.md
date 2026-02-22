# Firebase Security Rules Documentation

## Overview
This document explains the security rules configured for Firebase services and how to deploy them.

## Rules Files

### 1. Firestore Rules (`firestore.rules`)
Protects Firestore database containing encrypted user data.

**Key Security Features:**
- ✅ Default deny all access
- ✅ Requires Firebase Authentication for all operations
- ✅ Users can only access their own data (userId match)
- ✅ Validates required fields (encryptedData, timestamps)
- ✅ Limits data size (entries: 100KB, expenses/actions: 50KB)
- ✅ Separates create/update/delete permissions for fine-grained control

**Protected Collections:**
- `/users/{userId}` - User profile and metadata
- `/users/{userId}/entries/{entryId}` - Encrypted journal entries
- `/users/{userId}/expenses/{expenseId}` - Encrypted expense records
- `/users/{userId}/actionItems/{itemId}` - Encrypted action items

### 2. Realtime Database Rules (`database.rules.json`)
Protects Firebase Realtime Database used for device-to-device sync relay.

**Key Security Features:**
- ✅ Default deny all access except sync path
- ✅ Validates data structure and types
- ✅ Limits data size (max 1MB per sync)
- ✅ Timestamp validation (±1 minute from server time)
- ✅ Restricts unexpected fields
- ✅ Validates sync message types

**Protected Paths:**
- `/sync/{deviceId}` - Temporary sync data relay (encrypted, auto-deleted after read)

**Validation Rules:**
- Type: Must be 'pairing_confirmation' or 'sync_data'
- Device IDs: Max 100 characters
- Device names: Max 200 characters
- Sync keys: Max 500 characters
- Sync data: Max 1MB (encrypted)
- Timestamps: Within ±1 minute of current time

## Deploying Rules

### Prerequisites
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize project (if not already done):
   ```bash
   firebase init
   ```
   Select:
   - Firestore
   - Realtime Database
   - Hosting (if deploying web app)

### Deploy All Rules
```bash
# Deploy all rules at once
firebase deploy --only firestore:rules,database:rules

# Or deploy individually
firebase deploy --only firestore:rules
firebase deploy --only database:rules
```

### Verify Deployment
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to:
   - **Firestore Database** → **Rules** tab
   - **Realtime Database** → **Rules** tab
4. Verify rules are active and timestamp is recent

## Security Considerations

### What's Protected ✅
- User data requires authentication
- Users can only access their own data
- Data structure validation prevents malformed data
- Size limits prevent abuse
- Encrypted data in transit and at rest

### Known Limitations ⚠️
- **Realtime Database P2P Sync**: Open read/write to `/sync/{deviceId}` path
  - **Why**: Device-based sync without user authentication
  - **Mitigation**: Data is encrypted end-to-end, temporary (auto-deleted), size-limited
  - **Future**: Consider adding custom authentication tokens

### Best Practices
1. **Regenerate Firebase Keys**: Follow `SECURITY_REGENERATE_KEYS.md` to create new API keys
2. **Monitor Usage**: Check Firebase Console for suspicious activity
3. **Review Logs**: Enable audit logs in Firebase Console
4. **Update Rules**: Review and update rules as app features evolve
5. **Test Rules**: Use Firebase Rules Playground to test before deploying

## Testing Rules

### Firestore Rules Testing
```javascript
// In Firebase Console Rules Playground
// Test as authenticated user
auth: {uid: 'user123'}
location: /users/user123/entries/entry456
operation: read
// Should succeed

// Test as different user
auth: {uid: 'user999'}
location: /users/user123/entries/entry456
operation: read
// Should fail
```

### Realtime Database Rules Testing
```json
// Test sync write
{
  "type": "sync_data",
  "fromDevice": "device_abc123",
  "deviceName": "My Phone",
  "data": "encrypted_data_here",
  "timestamp": 1234567890000
}
```

## Troubleshooting

### "Permission Denied" Errors
1. Verify user is authenticated
2. Check userId matches in path
3. Verify required fields are present
4. Check data size limits

### Rules Not Updating
1. Wait 1-2 minutes for propagation
2. Clear Firebase Console cache
3. Re-deploy: `firebase deploy --only firestore:rules,database:rules`
4. Check for syntax errors in rules files

## Monitoring

### Firebase Console Alerts
You should see:
- ✅ Firestore rules: Secure (green)
- ✅ Realtime Database rules: Secure with warnings (yellow/green)
  - Warning about public `/sync/` path is expected due to P2P architecture

### Periodic Review
- Monthly: Review access patterns in Firebase Console
- Quarterly: Audit rules for new security best practices
- On feature changes: Update rules to match new data structures

## Additional Resources
- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Realtime Database Security Rules](https://firebase.google.com/docs/database/security)
- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist)
