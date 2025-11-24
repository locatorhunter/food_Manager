# Authentication Flow Documentation

This document provides step-by-step details for all authentication flows in the Lunch Manager application.

## Table of Contents
1. [User Signup Flow](#user-signup-flow)
2. [User Signin Flow](#user-signin-flow)
3. [Forgot Password Flow](#forgot-password-flow)
4. [Password Reset Flow](#password-reset-flow)
5. [Email Verification Flow](#email-verification-flow)
6. [Admin User Management Flow](#admin-user-management-flow)
7. [User Approval Workflow](#user-approval-workflow)
8. [Error Handling](#error-handling)

---

## User Signup Flow

### Overview
The signup flow allows new users to create accounts with role-based access (Employee, Manager, Admin).

### Step-by-Step Flow

#### Step 1: Navigate to Signup Page
1. User visits `signup.html`
2. Page loads with two-step signup form
3. Firebase initialization occurs
4. SecurityFramework validates inputs in real-time

#### Step 2: Complete Step 1 - Account Information
1. **Email Validation**:
   - User enters email address
   - SecurityFramework validates email format
   - Real-time validation shows error messages
   - Email must be valid format: `user@domain.com`

2. **Password Creation**:
   - User enters password
   - Password strength checker evaluates:
     - Minimum 8 characters
     - At least one uppercase letter
     - At least one lowercase letter
     - At least one number
     - No spaces allowed
   - Visual strength indicator shows: Weak/Medium/Strong
   - User confirms password (must match exactly)

3. **Display Name**:
   - User enters full name
   - Validation ensures:
     - 2-50 characters
     - Letters, spaces, hyphens, apostrophes only
     - No special characters that could cause XSS

4. **Next Step Validation**:
   - Click "Next Step" button
   - `validateStep1()` function runs:
     - Validates all fields
     - Checks email format
     - Verifies password strength
     - Confirms password match
     - Validates display name
   - If valid: proceeds to Step 2
   - If invalid: shows specific error messages

#### Step 3: Complete Step 2 - Role & Agreement
1. **Role Selection**:
   - User selects role (Employee/Manager):
     - **Employee**: Immediate access after email verification
     - **Manager**: Requires admin approval before access

2. **Optional Information**:
   - Department (optional)
   - Employee ID (optional)

3. **Terms Acceptance**:
   - Must accept Terms of Service and Privacy Policy
   - Marketing communications checkbox (optional)

4. **Form Submission**:
   - Click "Create Account" button
   - `submitSignup()` function executes:

```javascript
// Final validation before submission
if (!formData.email || !formData.password || !formData.displayName) {
    showToast('Please fill in all required fields', 'error');
    return;
}

if (formData.password !== formData.confirmPassword) {
    showToast('Passwords do not match', 'error');
    document.getElementById('signupConfirmPassword').focus();
    return;
}

if (!formData.acceptTerms) {
    showToast('You must accept the Terms of Service', 'error');
    return;
}
```

#### Step 4: Account Creation Process
1. **Loading State**: Show overlay with "Creating your account..."
2. **Duplicate Check**: `checkExistingUser(email)` verifies no existing account
3. **Firebase Auth Creation**: `createUserAccount(formData)` performs:
   - Creates Firebase Auth user
   - Sends email verification
   - Stores user data in Firestore:
     ```javascript
     const userData = {
         uid: user.uid,
         email: formData.email,
         displayName: formData.displayName,
         role: formData.role,
         department: formData.department || '',
         employeeId: formData.employeeId || '',
         emailVerified: false,
         disabled: formData.role === 'manager', // Managers need approval
         pendingApproval: formData.role === 'manager',
         acceptMarketing: formData.acceptMarketing,
         creationTime: new Date().toISOString(),
         lastLogin: null,
         createdBy: 'self-registration'
     };
     ```
4. **Approval Request**: For managers, creates approval request record
5. **Success Handling**: Shows success message and redirects to login after 3 seconds

### Error Scenarios
- **Email already exists**: Shows error, prevents duplicate account
- **Network error**: Shows error message, allows retry
- **Invalid email format**: Real-time validation prevents submission
- **Weak password**: Validation prevents submission
- **Password mismatch**: Validates confirmation matches

---

## User Signin Flow

### Overview
The signin flow authenticates users and directs them based on their role and approval status.

### Step-by-Step Flow

#### Step 1: Navigate to Login Page
1. User visits `login.html`
2. Page loads login form
3. Firebase authentication service initializes
4. AuthService monitors auth state changes

#### Step 2: User Input
1. **Email Entry**:
   - User enters email address
   - Optional: Real-time validation (if SecurityFramework available)

2. **Password Entry**:
   - User enters password
   - Optional: Show/hide password toggle functionality

3. **Forgot Password Link**:
   - Click "Forgot password?" link
   - Triggers `showForgotPassword()` function

#### Step 3: Form Submission
1. User clicks "Sign In" button
2. `login()` function in AuthService executes:

```javascript
async login(email, password) {
    // Validate inputs
    if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
    }

    // Check rate limiting
    if (!SecurityFramework.checkRateLimit('login', 5, 60000)) {
        return { success: false, error: 'Too many login attempts. Please try again later.' };
    }

    // Firebase authentication
    const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
    
    // Check email verification
    if (!user.emailVerified) {
        return { 
            success: false, 
            error: 'Please verify your email address before signing in.',
            requiresVerification: true,
            email: email
        };
    }

    // Check if user is disabled
    const userData = await this.getUserProfile(user.uid);
    if (userData && userData.disabled) {
        return { success: false, error: 'Your account has been disabled.' };
    }

    // Check pending approval
    if (userData && userData.pendingApproval) {
        return { 
            success: false, 
            error: 'Your account is pending approval.',
            pendingApproval: true
        };
    }

    return { success: true, user: { ...user, ...userData } };
}
```

#### Step 4: Post-Authentication Handling
1. **Success Cases**:
   - **Admin User**: Redirects to `admin.html`
   - **Manager/Employee**: Redirects to `menu.html`
   - Session data saved to sessionStorage
   - Inactivity tracking activated (30-minute timeout)

2. **Error Cases**:
   - **Invalid credentials**: Shows appropriate error message
   - **Email not verified**: Shows verification requirement message
   - **Account disabled**: Shows disabled account message
   - **Pending approval**: Shows approval pending message

#### Step 5: Session Management
1. **Session Storage**: User data saved with `saveSession()`
2. **Inactivity Timer**: 30-minute timeout with user activity tracking
3. **Auto-logout**: Timer resets on user activity (click, scroll, keypress)

---

## Forgot Password Flow

### Overview
The forgot password flow allows users to reset their passwords via email.

### Step-by-Step Flow

#### Step 1: Initiate Password Reset
1. User clicks "Forgot password?" link on login page
2. `showForgotPassword()` function executes

#### Step 2: Email Validation
1. **Extract Email**:
   - Gets email from login form field
   - Validates email is not empty

2. **Email Format Validation**:
   ```javascript
   // SecurityFramework validation if available
   const emailValidation = SecurityFramework.validateEmail(email);
   if (!emailValidation.isValid) {
       showToast(emailValidation.errors[0], 'error');
       return;
   }
   
   // Fallback regex validation
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(email)) {
       showToast('Please enter a valid email address', 'error');
       return;
   }
   ```

#### Step 3: Send Reset Email
1. **Loading State**: Show overlay "Sending password reset email..."
2. **Firebase Password Reset**:
   ```javascript
   await window.auth.sendPasswordResetEmail(email, window.actionCodeSettings);
   ```
3. **Success Handling**:
   - Hide loading overlay
   - Show success message: "Password reset email sent! Check your inbox and spam folder."
   - Clear email field
   - No automatic redirect (user can attempt login with new password)

#### Step 4: Error Handling
- **User not found**: "No account found with this email address."
- **Invalid email**: "Please enter a valid email address."
- **Too many requests**: "Too many requests. Please try again later."
- **Network error**: "Network error. Please check your connection."

---

## Password Reset Flow

### Overview
Users receive password reset emails and can create new passwords.

### Step-by-Step Flow

#### Step 1: Email Reception
1. User checks email (inbox or spam folder)
2. Opens password reset email from Firebase Auth
3. Clicks reset link

#### Step 2: Firebase Action Handling
1. Firebase Auth processes the action code
2. Redirects to configured URL with action parameters
3. Application handles the password reset flow

#### Step 3: New Password Entry
1. User enters new password
2. Password strength validation applies
3. User confirms new password
4. Form submission updates Firebase Auth password

#### Step 4: Completion
1. Password updated successfully
2. User can now login with new password
3. Session remains valid until logout

---

## Email Verification Flow

### Overview
New users must verify their email addresses before gaining access.

### Step-by-Step Flow

#### Step 1: Verification Email Sending
1. During signup, Firebase automatically sends verification email
2. Email sent to address provided during registration
3. Email contains verification link with action code

#### Step 2: User Email Verification
1. User receives email (check inbox and spam)
2. Clicks verification link in email
3. Firebase processes verification action
4. User account email verification status updated

#### Step 3: Login Process
1. User attempts to login
2. AuthService checks `emailVerified` status
3. If not verified: Shows error requiring verification
4. If verified: Proceeds with normal login flow

#### Step 4: Verification Status Check
```javascript
// During login
if (!user.emailVerified) {
    return { 
        success: false, 
        error: 'Please verify your email address before signing in.',
        requiresVerification: true,
        email: email
    };
}
```

---

## Admin User Management Flow

### Overview
Administrators can manage user accounts, approve requests, and control access.

### Step-by-Step Flow

#### Step 1: Access Admin Panel
1. Admin user logs in successfully
2. AuthService redirects to `admin.html`
3. Page initializes admin functionality

#### Step 2: View User Management Section
1. Navigate to "User Management" section
2. Page loads `displayUsersManagement()`
3. Fetches all users using `getAllUsers()`

#### Step 3: User List Display
1. **Users Fetched From**:
   - Primary: Firestore `users` collection
   - Fallback: Firebase Realtime Database `users` path

2. **User Card Display**:
   - User avatar (photo or initial)
   - Display name and email
   - Role badge (Admin/Manager/Employee)
   - Status indicator (Active/Inactive/Pending)
   - Creation and last login dates
   - Email verification status

#### Step 4: User Actions
1. **Edit User**:
   - Click "Edit" button
   - `editUser(userId)` function loads user data
   - Modal opens with editable fields (name, role)
   - Email field is read-only
   - Save changes with `updateUser()`

2. **Reset Password**:
   - Click "Reset Password" button
   - `resetUserPassword(userId, email)` function
   - Sends password reset email to user
   - Note: Requires server-side implementation for full functionality

3. **Toggle User Status**:
   - Click "Enable/Disable" button
   - `toggleUserStatus(userId, currentlyDisabled)` function
   - Updates `disabled` field in user record
   - Confirmation dialog prevents accidental changes

4. **Delete User**:
   - Click "Delete" button
   - `deleteUser(userId, email)` function
   - Double confirmation required
   - Permanently removes user from system

#### Step 5: Create New User
1. Fill form in "Create New User" section:
   - Email address
   - Temporary password
   - Display name
   - Role selection

2. Submit form:
   - `setupUserForm()` validates inputs
   - Creates user record in Firestore
   - Note: Full Firebase Auth user creation requires server-side implementation

---

## User Approval Workflow

### Overview
Manager role users require administrative approval before gaining system access.

### Step-by-Step Flow

#### Step 1: Manager Signup
1. User selects "Manager" role during signup
2. Account created with:
   ```javascript
   disabled: true,        // Account disabled until approved
   pendingApproval: true, // Flag for approval workflow
   ```

#### Step 2: Approval Request Creation
1. `createApprovalRequest(userData)` executes:
   ```javascript
   const approvalRequest = {
       userId: userData.uid,
       email: userData.email,
       displayName: userData.displayName,
       role: userData.role,
       department: userData.department,
       employeeId: userData.employeeId,
       requestTime: new Date().toISOString(),
       status: 'pending', // pending, approved, rejected
       reviewedBy: null,
       reviewedAt: null,
       notes: ''
   };
   ```

#### Step 3: Admin Notification
1. Admin sees pending approvals in User Management section
2. `displayPendingApprovals()` shows approval requests
3. Approval cards display user information and request details

#### Step 4: Admin Review Process
1. **Quick Actions**:
   - Click "Quick Approve" for immediate approval
   - Click "Quick Reject" for immediate rejection

2. **Detailed Review**:
   - Click "Review" button
   - `reviewApproval(userId)` loads detailed user information
   - Modal displays comprehensive user details
   - Admin can add review notes

3. **Approval Decision**:
   ```javascript
   // Approve user
   await window.db.collection('userApprovals').doc(currentApprovalUserId).update({
       status: 'approved',
       reviewedBy: currentUser.id,
       reviewedAt: new Date().toISOString(),
       notes: notes
   });

   // Enable user account
   await window.db.collection('users').doc(currentApprovalUserId).update({
       disabled: false,
       pendingApproval: false,
       approvedAt: new Date().toISOString(),
       approvedBy: currentUser.id
   });
   ```

4. **Rejection Decision**:
   ```javascript
   // Update approval status
   await window.db.collection('userApprovals').doc(currentApprovalUserId).update({
       status: 'rejected',
       reviewedBy: currentUser.id,
       reviewedAt: new Date().toISOString(),
       notes: notes
   });

   // Disable user account
   await window.db.collection('users').doc(currentApprovalUserId).update({
       disabled: true,
       pendingApproval: false,
       rejectedAt: new Date().toISOString(),
       rejectedBy: currentUser.id
   });
   ```

#### Step 5: User Notification
1. **Approved Users**:
   - Can now login and access the system
   - No additional notification (login success indicates approval)

2. **Rejected Users**:
   - Cannot login (account remains disabled)
   - Must contact administrator for re-evaluation

---

## Error Handling

### Common Error Scenarios

#### Network Errors
- **Detection**: ErrorHandler identifies network-related issues
- **User Message**: "Connection issue detected. Please check your internet connection."
- **Retry Logic**: Automatic retry with exponential backoff

#### Authentication Errors
- **Invalid Credentials**: "Invalid email or password"
- **Account Disabled**: "Your account has been disabled"
- **Email Not Verified**: "Please verify your email address"
- **Rate Limiting**: "Too many attempts. Please try again later"

#### Validation Errors
- **Weak Password**: Specific password requirement messages
- **Invalid Email**: Real-time email format validation
- **Duplicate Email**: "An account with this email already exists"
- **Missing Required Fields**: Field-specific error messages

#### Authorization Errors
- **Insufficient Permissions**: "Access denied. Please check your permissions."
- **Admin Required**: Redirect to login for non-admin users
- **Session Expired**: Automatic logout and redirect to login

### Error Recovery Mechanisms

#### Automatic Retry
- Network operations retry with exponential backoff
- Maximum 3 retry attempts
- User can manually retry via toast notification

#### Graceful Degradation
- Offline indicator for network issues
- Fallback to Firebase Realtime Database if Firestore fails
- Form validation continues working offline

#### User-Friendly Messages
- Technical errors converted to user-friendly messages
- Specific action guidance provided
- No sensitive information exposed in error messages

---

## Security Considerations

### Rate Limiting
- Login attempts: 5 per minute per IP
- Signup attempts: 3 per minute per IP
- Password reset: 3 per hour per email

### Input Validation
- All inputs sanitized using SecurityFramework
- XSS prevention through input filtering
- SQL injection prevention through parameterized queries

### Session Management
- Secure session storage in sessionStorage
- Automatic logout on inactivity (30 minutes)
- Session validation on page load

### Password Security
- Strong password requirements enforced
- Password strength validation
- No plaintext password storage
- Secure password reset mechanism

---

## Testing Guidelines

### Test Scenarios
1. **Successful Signup Flow**
   - Create employee account
   - Verify email reception
   - Complete email verification
   - Successful login

2. **Manager Approval Flow**
   - Create manager account
   - Verify pending approval status
   - Admin approval process
   - Manager login after approval

3. **Error Handling**
   - Invalid email formats
   - Weak passwords
   - Duplicate email addresses
   - Network connectivity issues

4. **Security Testing**
   - Rate limiting functionality
   - Input validation bypass attempts
   - Session timeout behavior
   - Unauthorized access prevention

### Test Data
- Use realistic email addresses for testing
- Test with various password strengths
- Create accounts with different roles
- Test approval/rejection workflows

---

*This documentation is maintained as part of the Lunch Manager authentication system. For updates or corrections, please refer to the source code in `js/auth.js`, `js/signup.js`, and `js/admin.js`.*