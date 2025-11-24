# Enable Email/Password Authentication in Firebase

## Current Error

```
Firebase: The given sign-in provider is disabled for this Firebase project. 
Enable it in the Firebase console, under the sign-in method tab of the Auth section. 
(auth/operation-not-allowed)
```

## Solution: Enable Email/Password Authentication

### Step-by-Step Instructions

#### 1. Go to Firebase Console
Open: [https://console.firebase.google.com/project/foodmanager-19cbb/authentication/providers](https://console.firebase.google.com/project/foodmanager-19cbb/authentication/providers)

Or manually navigate:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **foodmanager-19cbb**
3. Click **Authentication** in the left sidebar
4. Click the **Sign-in method** tab

#### 2. Enable Email/Password Provider

1. In the **Sign-in providers** list, find **Email/Password**
2. Click on **Email/Password** row
3. Click the **Enable** toggle switch (turn it ON)
4. Click **Save**

#### 3. Verify Settings

After enabling, you should see:
- ✅ **Email/Password** - Status: **Enabled**
- The provider should show a green checkmark or "Enabled" status

### Visual Guide

```
Firebase Console → Authentication → Sign-in method

┌─────────────────────────────────────────────────────┐
│ Sign-in providers                                   │
├─────────────────────────────────────────────────────┤
│ Provider              Status        Actions         │
├─────────────────────────────────────────────────────┤
│ Email/Password        Disabled      [Edit]          │  ← Click here
│ Google                Disabled      [Edit]          │
│ Facebook              Disabled      [Edit]          │
│ ...                                                  │
└─────────────────────────────────────────────────────┘

After clicking Edit:
┌─────────────────────────────────────────────────────┐
│ Email/Password                                      │
├─────────────────────────────────────────────────────┤
│ Enable                                              │
│ [Toggle Switch: OFF → ON]  ← Turn this ON          │
│                                                     │
│ Email link (passwordless sign-in)                  │
│ [Toggle Switch: OFF]       ← Keep this OFF         │
│                                                     │
│                              [Cancel]  [Save]       │
└─────────────────────────────────────────────────────┘
```

### Important Notes

1. **Only enable Email/Password** - Don't enable "Email link (passwordless sign-in)" unless you specifically need it
2. **No additional configuration needed** - Just toggle the switch and save
3. **Changes take effect immediately** - No waiting period

## After Enabling

### Test the Signup

1. **Refresh** your signup page: `http://localhost:8000/signup.html`
2. **Fill out the form** with:
   - Email: Use a real email you can access
   - Password: At least 8 characters
   - Full Name: Your name
   - Role: Employee (for immediate access)
3. **Submit the form**
4. **Check for success message**: "Account created successfully! Please check your email for verification."

### Expected Console Output

After enabling Email/Password authentication, you should see:

```
Creating Firebase Auth user...
Firebase Auth user created: [some-uid-here]
Sending email verification...
Email verification sent
Storing user data in Firestore...
User data stored in Firestore
```

### Check Your Email

1. **Check inbox** for verification email from Firebase
2. **Check spam folder** if not in inbox
3. **Click verification link** in the email
4. **Return to login page** and sign in

## Troubleshooting

### If Email/Password is Already Enabled

If the provider shows as "Enabled" but you still get the error:

1. **Disable and re-enable** the provider
2. **Wait 1-2 minutes** for changes to propagate
3. **Clear browser cache** and try again
4. **Try in incognito mode**

### If You Can't Access Firebase Console

You need to be:
- **Project Owner** or **Editor** role
- Logged in with the Google account that created the project

Contact the project owner to:
1. Add you as an editor
2. Or enable Email/Password authentication for you

### If Error Persists

Check these settings in Firebase Console:

1. **Authentication → Settings → Authorized domains**
   - Ensure `localhost` is listed
   - Add it if missing

2. **Firestore Database → Rules**
   - Ensure rules allow user creation
   - Recommended rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow create: if request.auth == null || request.auth.uid == userId;
         allow read, update: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

3. **Project Settings → General**
   - Verify project ID matches: `foodmanager-19cbb`
   - Verify API key matches in your code

## Quick Checklist

Before testing signup again:

- [ ] Email/Password authentication is **Enabled** in Firebase Console
- [ ] `localhost` is in **Authorized domains**
- [ ] Firestore rules allow user creation
- [ ] Browser cache is cleared
- [ ] Using a valid, accessible email address
- [ ] Password is at least 8 characters

## Next Steps

After enabling Email/Password authentication:

1. ✅ **CSP is fixed** (already done)
2. ✅ **Email/Password enabled** (you'll do this now)
3. 🔄 **Test signup** (after enabling)
4. 📧 **Verify email** (check inbox)
5. 🔐 **Test login** (after verification)

## Direct Link

**Enable Email/Password Now:**  
[https://console.firebase.google.com/project/foodmanager-19cbb/authentication/providers](https://console.firebase.google.com/project/foodmanager-19cbb/authentication/providers)

Click the link above, find "Email/Password", click Edit, toggle Enable to ON, and click Save.

That's it! 🎉
