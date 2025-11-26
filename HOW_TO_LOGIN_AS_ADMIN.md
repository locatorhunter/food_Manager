# How to Login as Admin

## Method 1: Update User Role in Firestore Console (Recommended)

### Step 1: Go to Firestore Console
1. Open [Firebase Console - Firestore](https://console.firebase.google.com/project/foodmanager-19cbb/firestore/data)
2. Navigate to **Firestore Database** → **Data** tab

### Step 2: Find Your User Document
1. Click on the **`users`** collection
2. Find your user document (e.g., `BgpUE5dFD4c5ixBGuyCGKAWxx8E2` or `QRj3mmztENWzxaRBkMfYB0TKwPt1`)
3. Click on the document ID to open it

### Step 3: Update the Role Field
1. Find the **`role`** field (currently set to `employee`)
2. Click on the value `employee`
3. Change it to: `admin`
4. Click **Update**

### Step 4: Logout and Login Again
1. Go to your app and **logout**
2. **Login** again with the same credentials
3. You'll be redirected to **admin.html** instead of menu.html

## Method 2: Create Admin User via Signup

### Step 1: Sign Up with New Email
1. Go to `signup.html`
2. Fill in the form with a new email (e.g., `admin@company.com`)
3. Choose role: **Employee** (we'll change it later)
4. Complete signup

### Step 2: Update Role in Firestore
Follow Method 1, Steps 1-4 above to change the role to `admin`

## Method 3: Manually Create Admin User in Firestore

### Step 1: Create User in Firebase Auth
1. Go to [Firebase Console - Authentication](https://console.firebase.google.com/project/foodmanager-19cbb/authentication/users)
2. Click **Add user**
3. Enter email: `admin@company.com`
4. Enter password: (choose a strong password)
5. Click **Add user**
6. Copy the **User UID** (e.g., `abc123xyz456`)

### Step 2: Create User Document in Firestore
1. Go to [Firestore Data](https://console.firebase.google.com/project/foodmanager-19cbb/firestore/data)
2. Click on **`users`** collection
3. Click **Add document**
4. **Document ID**: Paste the User UID from Step 1
5. Add these fields:

```
Field Name          Type        Value
-------------------------------------------
uid                 string      [User UID from Step 1]
email               string      admin@company.com
displayName         string      Admin User
role                string      admin
emailVerified       boolean     true
disabled            boolean     false
pendingApproval     boolean     false
creationTime        string      2025-11-21T11:30:00.000Z
lastLogin           string      2025-11-21T11:30:00.000Z
createdBy           string      manual-creation
```

6. Click **Save**

### Step 3: Login as Admin
1. Go to `login.html`
2. Enter email: `admin@company.com`
3. Enter the password you set
4. Click **Sign In**
5. You'll be redirected to **admin.html**

## Quick Fix for Existing User

If you want to make `vijaytest5555@gmail.com` an admin:

1. Go to [Firestore](https://console.firebase.google.com/project/foodmanager-19cbb/firestore/data)
2. Click **users** collection
3. Find document with email `vijaytest5555@gmail.com`
4. Click on the document
5. Find the **role** field
6. Change value from `employee` to `admin`
7. Click **Update**
8. **Logout** from the app
9. **Login** again with `vijaytest5555@gmail.com`
10. You'll now be redirected to admin panel!

## Verify Admin Access

After logging in as admin, you should:
- ✅ Be redirected to `admin.html` instead of `menu.html`
- ✅ See the admin navigation menu
- ✅ Have access to admin features (manage hotels, users, etc.)

## Admin Features Available

Once logged in as admin, you can:
- 📊 View all orders and analytics
- 🏨 Manage hotels and menus
- 👥 Approve/reject user registrations
- ⚙️ Configure system settings
- 📈 Generate reports

## Troubleshooting

### Issue: Still redirected to menu.html after changing role

**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Clear sessionStorage: Open browser console (F12) and run:
   ```javascript
   sessionStorage.clear()
   ```
3. Logout and login again

### Issue: Can't find user document in Firestore

**Solution:**
1. Check if Firestore database is created
2. Check if user signed up successfully
3. Look for the user's UID in Firebase Authentication
4. Search for that UID in Firestore users collection

### Issue: Role changes but still shows employee features

**Solution:**
1. Logout completely
2. Close all browser tabs
3. Open new tab and login again
4. The role should now be updated

## Security Note

⚠️ **Important**: In production, you should:
- Never allow users to self-assign admin role
- Implement proper admin approval workflow
- Use Firebase Security Rules to restrict role changes
- Only allow existing admins to create new admin users

## Recommended Firestore Security Rules for Admin

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can read their own profile
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Users can create their own profile during signup
      allow create: if request.auth == null || request.auth.uid == userId;
      
      // Only admins can update user roles
      allow update: if request.auth != null && (
        (request.auth.uid == userId && !('role' in request.resource.data.diff(resource.data))) ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      
      // Admins can read all users
      allow read: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

This prevents users from changing their own role to admin!
