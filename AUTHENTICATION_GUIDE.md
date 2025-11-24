# Lunch Manager Authentication Guide

## Overview

The Lunch Manager application features a comprehensive authentication system with role-based access control, public registration, and admin approval workflows. This guide explains how to use both user and admin authentication features.

## Table of Contents

1. [User Registration and Sign-In](#user-registration-and-sign-in)
2. [Admin Authentication](#admin-authentication)
3. [User Roles and Permissions](#user-roles-and-permissions)
4. [Admin Panel Features](#admin-panel-features)
5. [Security Features](#security-features)
6. [Troubleshooting](#troubleshooting)

---

## User Registration and Sign-In

### How to Register as a New User

1. **Access the Registration Page**
   - Visit the login page (`login.html`)
   - Click "Create an account" link at the bottom

2. **Step 1: Account Information**
   - Enter your **email address** (company email recommended)
   - Create a **strong password** (see password requirements below)
   - Confirm your password
   - Enter your **full name**

   **Password Requirements:**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - No spaces allowed

3. **Step 2: Role Selection and Terms**
   - **Choose your role:**
     - **Employee:** Immediate access after email verification
     - **Manager:** Requires admin approval before access
   - Fill optional fields (Department, Employee ID)
   - **Accept Terms of Service** (required)
   - Optionally accept marketing communications
   - Click "Create Account"

4. **Email Verification**
   - Check your email for a verification link
   - Click the link to verify your account
   - Your account status will depend on your role:

### How to Sign In

1. **Access the Login Page**
   - Visit `login.html`
   - Enter your email and password
   - Click "Sign In"

2. **Post-Login Behavior**
   - **Employees:** Redirected to menu page (`menu.html`)
   - **Managers:** If approved, redirected to menu page; if pending, shown approval message
   - **Admins:** Redirected to admin panel (`admin.html`)

### Account Statuses

- **Active:** Full access to the system
- **Pending Approval:** Manager accounts waiting for admin review
- **Inactive:** Disabled accounts (cannot sign in)

---

## Admin Authentication

### Initial Admin Setup

Admin accounts must be created manually in Firebase Console or through the existing user management system. The first admin account needs to be set up by a developer.

### Admin Sign-In Process

1. **Access Admin Panel**
   - Visit `login.html`
   - Enter admin credentials
   - Click "Sign In"
   - Automatically redirected to `admin.html`

### Admin Dashboard Features

#### User Approvals Section

**Review Pending Approvals:**
1. Navigate to "User Approvals" section
2. View pending manager registration requests
3. Each card shows:
   - User name and email
   - Requested role
   - Department and Employee ID (if provided)
   - Request timestamp

**Approval Actions:**
- **Quick Approve:** One-click approval
- **Quick Reject:** One-click rejection
- **Review:** Detailed review modal with notes

**Approval Process:**
1. Click "Review" for detailed information
2. Add optional notes about the decision
3. Click "Approve" or "Reject"
4. Approved users gain immediate access
5. Rejected users are disabled

#### User Management Section

**Create New Users:**
1. Go to "Create New User" section
2. Fill in user details (email, password, name, role)
3. Click "Create User"
4. User receives account credentials

**Manage Existing Users:**
- **Search and Filter:** Find users by name, email, role, or status
- **Edit Users:** Modify user details and roles
- **Reset Passwords:** Send password reset emails
- **Enable/Disable Accounts:** Control user access
- **Delete Users:** Permanently remove accounts

**User Status Filters:**
- **All Users:** Complete user list
- **Active:** Verified and enabled accounts
- **Inactive:** Disabled accounts
- **Pending Approval:** Awaiting admin review

---

## User Roles and Permissions

### Role Hierarchy

1. **Employee**
   - Access to menu ordering system
   - Can place lunch orders
   - View order history
   - Basic user permissions

2. **Manager**
   - All Employee permissions
   - May have additional reporting features
   - Requires admin approval to activate

3. **Admin**
   - Full system access
   - User management capabilities
   - Hotel and menu management
   - System configuration
   - User approval workflows

### Role-Based Access Control

**Navigation Menu Changes:**
- **Employees/Managers:** Standard menu with ordering features
- **Admins:** Additional admin panel access

**Route Protection:**
- Admin routes automatically redirect non-admin users
- Authentication required for all protected pages
- Session timeout after 30 minutes of inactivity

---

## Admin Panel Features

### Hotel Management

**Add New Hotels:**
1. Enter hotel name and type (Veg/Non-Veg)
2. Hotel appears in selection list

**Manage Hotels:**
- Edit hotel details (name, reviews, location, type)
- Add menu items to hotels
- Import CSV menu data
- Delete hotels (removes all menu items)

### Menu Management

**Add Menu Items:**
1. Select hotel from dropdown
2. Enter item details (name, price, category)
3. Set availability status
4. Optionally upload images

**Bulk Import:**
- Download CSV template
- Fill with menu data
- Upload and import multiple items

**Menu Item Controls:**
- Toggle availability
- Remove images
- Delete items

### System Settings

**Group Ordering Limits:**
- Set maximum amount per person
- Configure when group ordering is required

**Danger Zone:**
- Clear all orders (irreversible)
- Reset entire system (nuclear option)

---

## Security Features

### Password Security

- **Strong password requirements** enforced during registration
- **Password strength indicator** during signup
- **Secure password reset** via email
- **No plain text password storage**

### Account Security

- **Email verification** required for new accounts
- **Role-based approval** workflow for managers
- **Account lockout** for suspicious activity
- **Session management** with automatic logout

### Data Protection

- **Input sanitization** prevents XSS attacks
- **Rate limiting** on API calls
- **CSRF protection** on forms
- **Secure local storage** for sensitive data

### Access Control

- **Route protection** based on authentication status
- **Role-based permissions** throughout the application
- **Admin approval** required for elevated roles
- **Audit logging** of admin actions

---

## Troubleshooting

### Common User Issues

**"Account pending approval"**
- Manager accounts require admin review
- Contact your administrator
- Check back later or request status update

**"Email not verified"**
- Check spam/junk folder
- Request new verification email
- Ensure email address is correct

**"Invalid credentials"**
- Verify email and password
- Check for typos
- Try password reset if forgotten

**"Account disabled"**
- Contact administrator
- Account may have been deactivated
- Check email for notifications

### Common Admin Issues

**"No pending approvals"**
- All requests have been processed
- New manager registrations appear here
- Check user management for existing users

**"Cannot create user"**
- Check email format and uniqueness
- Ensure password meets requirements
- Verify Firebase configuration

**"User not appearing in list"**
- Check search filters
- Refresh the page
- Verify user was created successfully

### Technical Issues

**Session expired**
- Automatic logout after 30 minutes
- Sign in again to continue
- Data is preserved

**Page not loading**
- Check internet connection
- Clear browser cache
- Verify Firebase configuration

**Email not received**
- Check spam/junk folders
- Verify email address accuracy
- Contact support for manual verification

---

## Best Practices

### For Users

1. **Use company email** for registration
2. **Create strong passwords** following requirements
3. **Verify email promptly** after registration
4. **Keep login credentials secure**
5. **Log out when finished** on shared devices

### For Admins

1. **Review approvals promptly** to avoid user delays
2. **Use descriptive notes** when approving/rejecting requests
3. **Regularly audit user accounts** for security
4. **Communicate with users** about account status changes
5. **Maintain accurate user information**

### Security Recommendations

1. **Regular password changes** for admin accounts
2. **Monitor login activity** for suspicious behavior
3. **Keep approval workflows active** for manager roles
4. **Regular system backups** of user data
5. **Stay updated** with security best practices

---

## Support

For technical issues or questions about the authentication system:

1. **Check this guide** for common solutions
2. **Contact your administrator** for account-specific issues
3. **Review error messages** for specific guidance
4. **Clear browser cache** for loading issues

The authentication system is designed to be secure, user-friendly, and scalable for growing organizations.