# Enable Cloud Firestore API

## Current Error

```
Cloud Firestore API has not been used in project foodmanager-19cbb before or it is disabled. 
Enable it by visiting https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=foodmanager-19cbb 
then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.
```

## Solution: Enable Firestore API

### Quick Fix - Direct Link

Click this link to enable Firestore API directly:
**[Enable Firestore API for foodmanager-19cbb](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=foodmanager-19cbb)**

Then click the **"ENABLE"** button.

### Alternative Method - Via Firebase Console

#### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/project/foodmanager-19cbb/firestore)
2. Select your project: **foodmanager-19cbb**

#### Step 2: Create Firestore Database
1. Click **Firestore Database** in the left sidebar
2. Click **Create database** button
3. Choose **Start in production mode** (we'll set rules later)
4. Click **Next**
5. Select a location (choose closest to your users, e.g., `asia-south1` for India)
6. Click **Enable**

#### Step 3: Wait for Provisioning
- Firestore will take 1-2 minutes to provision
- You'll see a loading screen
- Once complete, you'll see the Firestore console

#### Step 4: Set Security Rules
1. Click on the **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - allow authenticated users to manage their own data, admins can manage all
    match /users/{userId} {
      // Allow anyone to create user documents (for signup)
      allow create: if true;

      // Users can read/update their own data
      allow read, update: if request.auth != null && request.auth.uid == userId;

      // Admins can read all user data
      allow read: if request.auth != null &&
                     exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';

      // Admins can update any user data
      allow update: if request.auth != null &&
                       exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // User approvals - only admins can manage
    match /userApprovals/{userId} {
      allow create: if true; // Allow creation during signup
      allow read, write: if request.auth != null &&
                            exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Orders collection - users can manage their own, admins can see all
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read, update, delete: if request.auth != null &&
                                      resource.data.userId == request.auth.uid;
      allow read: if request.auth != null &&
                     exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Hotels and menus - authenticated users can read, admins can write
    match /hotels/{hotelId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /menus/{menuId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Settings - only admins
    match /settings/{settingId} {
      allow read, write: if request.auth != null &&
                            exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

3. Click **Publish**

## What This Fixes

After enabling Firestore:
- ✅ User data will be stored successfully
- ✅ User profiles can be retrieved
- ✅ Orders can be saved
- ✅ Hotels and menus can be managed

## Current Status

Based on your console output:
- ✅ **Firebase Auth** - Working! User created: `BgpUE5dFD4c5ixBGuyCGKAWxx8E2`
- ✅ **Email Verification** - Sent successfully
- ❌ **Firestore** - Not enabled (needs to be enabled)

## After Enabling Firestore

1. **Refresh** your signup page
2. **Try signing up** again (or the current signup should complete)
3. **Check console** - you should see:
   ```
   Creating Firebase Auth user...
   Firebase Auth user created: [uid]
   Sending email verification...
   Email verification sent
   Storing user data in Firestore...
   User data stored in Firestore  ← This should now work!
   ```

## Troubleshooting

### If Firestore is Already Enabled

If you see Firestore in Firebase Console but still get the error:

1. **Check API is enabled** in Google Cloud Console:
   - Go to [Google Cloud Console APIs](https://console.cloud.google.com/apis/dashboard?project=foodmanager-19cbb)
   - Search for "Cloud Firestore API"
   - Ensure it shows "Enabled"

2. **Wait a few minutes** - API enablement can take 2-5 minutes to propagate

3. **Clear browser cache** and try again

### If You Get Permission Errors

After enabling Firestore, if you get permission denied errors:

1. Check that security rules are published
2. Ensure the rules allow user creation (see Step 4 above)
3. Verify the user is authenticated before writing

## Quick Checklist

Before testing signup again:

- [ ] Firestore API is enabled
- [ ] Firestore database is created
- [ ] Security rules are set and published
- [ ] Waited 2-3 minutes for changes to propagate
- [ ] Browser cache cleared
- [ ] `127.0.0.1` added to Firebase authorized domains (for email verification)

## Summary

**Current Progress:**
1. ✅ CSP issues - Fixed
2. ✅ Email/Password authentication - Enabled
3. ✅ User creation - Working
4. ✅ Email verification - Working
5. 🔄 **Firestore API - Needs to be enabled** ← You are here
6. ⏳ User data storage - Will work after Firestore is enabled

## Direct Action Required

**Click here to enable Firestore now:**  
[https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=foodmanager-19cbb](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=foodmanager-19cbb)

Or create Firestore database here:  
[https://console.firebase.google.com/project/foodmanager-19cbb/firestore](https://console.firebase.google.com/project/foodmanager-19cbb/firestore)

After enabling, your signup will complete successfully! 🎉
