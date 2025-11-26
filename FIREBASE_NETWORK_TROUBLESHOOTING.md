# Firebase Network Error - Complete Troubleshooting Guide

## Current Error: `auth/network-request-failed`

This error indicates Firebase cannot reach its servers from your browser. This is typically caused by Content Security Policy, network restrictions, or browser security settings.

## ✅ **STEP 1: Quick Fixes (Try These First)**

### 1. Clear Browser Data
```bash
- Press Ctrl+Shift+Delete
- Select "Cached images and files" and "Site data"
- Click "Clear data"
- Hard refresh with Ctrl+F5
```

### 2. Test in Incognito/Private Mode
```bash
- Open browser incognito window (Ctrl+Shift+N in Chrome)
- Navigate to your signup/login page
- Try the email verification test
```

### 3. Disable Browser Extensions
```bash
- Temporarily disable:
  * Ad blockers (uBlock, AdBlock Plus)
  * Privacy extensions (Ghostery, Privacy Badger)
  * VPN extensions
  * Security extensions
- Try the test again
```

## 🔍 **STEP 2: Diagnostic Testing**

### Use the Debug Tools I've Created:

1. **Network Debug Page**: Open `network-debug.html` in your browser
   - Tests network connectivity
   - Checks Firebase configuration
   - Tests all Firebase API endpoints
   - Provides specific error diagnostics

2. **Email Verification Test**: Open `email-verification-test.html` in your browser
   - Tests end-to-end email verification flow
   - Validates ActionCodeSettings configuration

### Run These Tests:
- Click "Check Network Info" - verify you're online
- Click "Test Firebase Config" - verify Firebase loads
- Click "Test All Firebase Connections" - test API connectivity
- Try "Test Email Verification" - test the failing operation

## 🛠️ **STEP 3: Common Root Causes & Solutions**

### Cause A: Content Security Policy (CSP)
**Check if CSP is blocking Firebase:**
```javascript
// Check browser console for messages like:
// "Connecting to 'https://identitytoolkit.googleapis.com/...' violates Content Security Policy"
```

**Solution**: Your files already have proper CSP configured ✅

### Cause B: Corporate/School Network Restrictions
**Symptoms**: Works on mobile data but not on office network

**Solutions**:
1. Test on different network (mobile hotspot)
2. Ask IT admin to whitelist Firebase domains:
   - `*.googleapis.com`
   - `*.firebaseio.com`
   - `identitytoolkit.googleapis.com`
   - `firestore.googleapis.com`

### Cause C: Antivirus/Security Software
**Symptoms**: Works in incognito but not normal browsing

**Solutions**:
1. Temporarily disable antivirus real-time protection
2. Add Firebase domains to antivirus whitelist
3. Try different antivirus software

### Cause D: Firebase Configuration Issues
**Check Firebase Console**:
1. Go to [Firebase Console](https://console.firebase.google.com/project/foodmanager-19cbb/authentication/providers)
2. Verify Email/Password is enabled
3. Check "Authorized domains" includes your domain
4. Ensure project is active (not paused)

## 🧪 **STEP 4: Specific Email Verification Testing**

### Test Email Verification Flow:
```javascript
// Add this to browser console on your signup page:
async function testEmailVerification() {
    try {
        const auth = firebase.auth();
        const testEmail = 'test' + Date.now() + '@example.com';
        const userCredential = await auth.createUserWithEmailAndPassword(testEmail, 'TestPassword123!');
        const user = userCredential.user;
        console.log('✅ User created:', user.uid);
        
        await user.sendEmailVerification();
        console.log('✅ Email verification sent');
        
        // Clean up
        await user.delete();
        console.log('✅ Test user cleaned up');
        
    } catch (error) {
        console.error('❌ Error:', error.code, error.message);
    }
}

// Run the test
testEmailVerification();
```

## 📱 **STEP 5: Cross-Platform Testing**

### Test on Different Browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)  
- [ ] Safari (if on Mac)
- [ ] Edge (latest)

### Test on Different Devices:
- [ ] Desktop computer
- [ ] Mobile phone (use mobile data)
- [ ] Tablet device

## 🔧 **STEP 6: Advanced Troubleshooting**

### Check Firebase Service Status:
1. Visit: https://status.firebase.google.com/
2. Look for any outages affecting "Authentication" or "Identity and Access Management"

### Enable Firebase Debug Logging:
```javascript
// Add to your page before Firebase initialization:
firebase.auth().useDeviceLanguage();
firebase.auth().settings.appVerificationDisabledForTesting = false;

// Monitor console for detailed logs
```

### Network Analysis:
```javascript
// Check if specific Firebase domains are reachable:
fetch('https://identitytoolkit.googleapis.com')
    .then(response => console.log('✅ Auth API reachable'))
    .catch(error => console.error('❌ Auth API blocked:', error));

fetch('https://firestore.googleapis.com')
    .then(response => console.log('✅ Firestore API reachable'))
    .catch(error => console.error('❌ Firestore API blocked:', error));
```

## 🎯 **Expected Results**

After applying fixes, you should see:
- ✅ "Firebase initialized successfully"
- ✅ "Firebase Auth service available" 
- ✅ "Email verification sent successfully!"
- No network errors in browser console

## 🆘 **If Nothing Works**

1. **Deploy to Firebase Hosting**:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy --only hosting
   ```
   This bypasses local server issues and network restrictions.

2. **Try Alternative Email Provider**:
   - Test with @gmail.com, @yahoo.com, @outlook.com
   - Some corporate email providers block Firebase emails

3. **Check with Network Administrator**:
   - Ask about firewall rules blocking Firebase
   - Request specific domains be whitelisted

## 📞 **Support Information**

If you continue having issues:
1. **Screenshot the network debug results**
2. **Copy the exact error message**  
3. **Note which steps you've tried**
4. **Include browser console logs**

The network error should be resolved by following the steps above in order.