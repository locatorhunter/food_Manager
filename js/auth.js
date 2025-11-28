// ========================================
// Authentication Service
// ========================================

class AuthService {
    constructor() {
        this.currentUser = null;
        this.inactivityTimer = null;
        this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        this.init();
    }

    init() {
        // Listen for auth state changes
        window.auth.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in
                console.log('User signed in:', user.email);
                
                // Check if email is verified BEFORE allowing access
                if (!user.emailVerified) {
                    console.log('Email not verified, signing out user');
                    showToast('Please verify your email address before accessing the application. Check your inbox for a verification email.', 'warning');
                    await window.auth.signOut();
                    this.currentUser = null;
                    this.clearSession();
                    this.clearInactivityTimer();
                    
                    // Redirect to login page with verification message
                    if (!window.location.pathname.includes('login.html')) {
                        window.location.href = 'login.html?message=verify-email';
                    }
                    return;
                }
                
                const userData = await this.getUserProfile(user.uid);
                
                // Handle case where userData might be null
                if (userData) {
                    // Update role for specific user if needed
                    if (user.email === 'vijaytest5555@gmail.com' && userData.role !== 'admin') {
                        console.log('Updating user role to admin for', user.email);
                        try {
                            await window.db.collection('users').doc(user.uid).update({
                                role: 'admin',
                                lastUpdated: new Date().toISOString(),
                                updatedBy: 'auto-update'
                            });
                            userData.role = 'admin';
                            console.log('User role updated to admin successfully');
                        } catch (error) {
                            console.error('Failed to update user role:', error);
                        }
                    }

                    this.currentUser = { ...user, ...userData };
                    this.saveSession(this.currentUser);
                    this.setupInactivityTracking();

                    // Only redirect if on login page
                    if (window.location.pathname.includes('login.html')) {
                        this.redirectBasedOnRole(userData.role);
                    }
                } else {
                    console.warn('User profile not found in Firestore, creating profile...');
                    // Create user profile if it doesn't exist
                    await this.createUserProfile(user);
                    this.currentUser = { ...user, role: user.email === 'vijaytest5555@gmail.com' ? 'admin' : 'employee' };
                    this.saveSession(this.currentUser);
                    this.setupInactivityTracking();

                    // Only redirect if on login page
                    if (window.location.pathname.includes('login.html')) {
                        this.redirectBasedOnRole(this.currentUser.role);
                    }
                }
            } else {
                // User is signed out
                console.log('User signed out');
                this.currentUser = null;
                this.clearSession();
                this.clearInactivityTimer();
                this.showLoginRequired();
            }
        });
    }

    async createUserProfile(user) {
        try {
            // Make specific user admin for testing
            const isAdminUser = user.email === 'vijaytest5555@gmail.com';
            const userRef = window.db.collection('users').doc(user.uid);
            await userRef.set({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                emailVerified: user.emailVerified,
                role: isAdminUser ? 'admin' : 'employee',
                disabled: false,
                pendingApproval: false,
                creationTime: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                createdBy: 'auto-created-on-login'
            });
            console.log('User profile created successfully');
        } catch (error) {
            console.error('Error creating user profile:', error);
        }
    }

    async login(email, password) {
        try {
            showLoadingOverlay('Signing you in...');

            // Validate inputs first
            if (!email || !password) {
                hideLoadingOverlay();
                return { success: false, error: 'Email and password are required' };
            }

            // Check rate limiting
            if (typeof SecurityFramework !== 'undefined' && SecurityFramework.checkRateLimit) {
                if (!SecurityFramework.checkRateLimit('login', 5, 60000)) { // 5 attempts per minute
                    hideLoadingOverlay();
                    return { success: false, error: 'Too many login attempts. Please try again later.' };
                }
            }

            const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Check if email is verified
            if (!user.emailVerified) {
                hideLoadingOverlay();
                return { 
                    success: false, 
                    error: 'Please verify your email address before signing in. Check your inbox for a verification email.',
                    requiresVerification: true,
                    email: email
                };
            }

            // Check if user is disabled
            const userData = await this.getUserProfile(user.uid);
            if (userData && userData.disabled) {
                hideLoadingOverlay();
                return { success: false, error: 'Your account has been disabled. Please contact an administrator.' };
            }

            // Check if user is pending approval (for managers)
            if (userData && userData.pendingApproval) {
                hideLoadingOverlay();
                return { 
                    success: false, 
                    error: 'Your account is pending approval. Please check back later or contact an administrator.',
                    pendingApproval: true
                };
            }

            // Update last login
            await this.updateLastLogin(user.uid);

            hideLoadingOverlay();
            return { success: true, user: { ...user, ...userData } };

        } catch (error) {
            hideLoadingOverlay();
            console.error('Login error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    async logout() {
        try {
            await window.auth.signOut();
            this.clearSession();
            showToast('Logged out successfully');
            window.location.href = 'login.html';
        } catch (error) {
            showToast('Error logging out', 'error');
        }
    }

    async getUserProfile(uid) {
        try {
            const userDoc = await window.db.collection('users').doc(uid).get();
            return userDoc.exists ? userDoc.data() : null;
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    async updateLastLogin(uid) {
        try {
            const userRef = window.db.collection('users').doc(uid);
            const userDoc = await userRef.get();
            
            if (userDoc.exists) {
                // Document exists, update it
                await userRef.update({
                    lastLogin: new Date().toISOString()
                });
            } else {
                // Document doesn't exist, create it with basic info
                console.warn('User document not found, creating basic profile');
                const user = window.auth.currentUser;
                if (user) {
                    await userRef.set({
                        uid: uid,
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        emailVerified: user.emailVerified,
                        role: 'employee', // Default role
                        disabled: false,
                        pendingApproval: false,
                        creationTime: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                        createdBy: 'auto-created-on-login'
                    });
                }
            }
        } catch (error) {
            console.error('Error updating last login:', error);
            // Don't throw error, just log it - login should still succeed
        }
    }

    saveSession(userData) {
        sessionStorage.setItem('user', JSON.stringify(userData));
    }

    clearSession() {
        sessionStorage.removeItem('user');
    }

    getCurrentUser() {
        const userData = sessionStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    redirectBasedOnRole(role) {
        // Check if user needs approval
        const user = this.getCurrentUser();
        if (user && user.pendingApproval) {
            showToast('Your account is pending approval. Please check back later or contact an administrator.', 'warning');
            this.logout();
            return;
        }

        // Redirect both admin and employees to home page
        window.location.href = 'index.html';
    }

    showLoginRequired() {
        // Only redirect to login if not already on login page, index page, signup page, or authenticated pages
        const currentPath = window.location.pathname;
        const publicPages = ['login.html', 'index.html', 'signup.html'];
        const authenticatedPages = ['menu.html', 'dashboard.html', 'admin.html'];
        
        const isPublicPage = publicPages.some(page => currentPath.includes(page));
        const isAuthenticatedPage = authenticatedPages.some(page => currentPath.includes(page));
        
        // Only redirect if not on a public page and not already on an authenticated page
        if (!isPublicPage && !isAuthenticatedPage) {
            window.location.href = 'login.html';
        } else if (!isPublicPage && isAuthenticatedPage) {
            // User is on an authenticated page but not signed in - redirect to login
            window.location.href = 'login.html';
        }
    }

    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.'
        };

        return errorMessages[errorCode] || 'An error occurred. Please try again.';
    }

    // Check if user has required role
    hasRole(requiredRole) {
        const user = this.getCurrentUser();
        return user && user.role === requiredRole;
    }

    // Check if user is admin
    isAdmin() {
        return this.hasRole('admin');
    }

    setupInactivityTracking() {
        this.clearInactivityTimer();

        const resetTimer = () => {
            this.clearInactivityTimer();
            this.inactivityTimer = setTimeout(() => {
                this.logout();
                showToast('Session expired due to inactivity', 'warning');
            }, this.SESSION_TIMEOUT);
        };

        // Reset timer on user activity
        document.addEventListener('click', resetTimer);
        document.addEventListener('keypress', resetTimer);
        document.addEventListener('scroll', resetTimer);
        document.addEventListener('mousemove', resetTimer);

        // Start initial timer
        resetTimer();
    }

    clearInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }
}

// Global auth instance
window.authService = new AuthService();

// Login form handling
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            if (!email || !password) {
                showToast('Please fill in all fields', 'error');
                return;
            }

            const result = await window.authService.login(email, password);

            if (result.success) {
                showToast(`Welcome back!`);
            } else {
                showToast(result.error, 'error');
            }
        });
    }
});

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.password-toggle');

    if (passwordInput && toggleBtn) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }
}

async function showForgotPassword() {
    const emailInput = document.getElementById('email');
    const email = emailInput ? emailInput.value.trim() : '';
    
    if (!email) {
        showToast('Please enter your email address first', 'warning');
        emailInput?.focus();
        return;
    }

    // Validate email format
    if (typeof SecurityFramework !== 'undefined' && SecurityFramework.validateEmail) {
        const emailValidation = SecurityFramework.validateEmail(email);
        if (!emailValidation.isValid) {
            showToast(emailValidation.errors[0], 'error');
            emailInput?.focus();
            return;
        }
    } else {
        // Fallback validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address', 'error');
            emailInput?.focus();
            return;
        }
    }

    try {
        showLoadingOverlay('Sending password reset email...');
        
        // Send password reset email using Firebase Auth
        await window.auth.sendPasswordResetEmail(email, window.actionCodeSettings);
        
        hideLoadingOverlay();
        showToast('Password reset email sent! Check your inbox and spam folder. You can also use this to verify your email address.', 'success');
        
        // Clear the email field
        if (emailInput) {
            emailInput.value = '';
        }
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Password reset error:', error);
        
        let errorMessage = 'Failed to send password reset email. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many requests. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your connection.';
                break;
        }
        
        showToast(errorMessage, 'error');
    }
}

async function resendVerificationEmail() {
    // Check multiple sources for pending email
    let pendingEmail = sessionStorage.getItem('pendingVerificationEmail');
    
    // Also check localStorage as backup
    if (!pendingEmail) {
        pendingEmail = localStorage.getItem('resendVerificationEmail');
    }
    
    // If still no email, check if user is logged in but unverified
    if (!pendingEmail) {
        try {
            const currentUser = window.auth.currentUser;
            if (currentUser && !currentUser.emailVerified) {
                // User is logged in but email not verified
                pendingEmail = currentUser.email;
                // Store it for future use
                sessionStorage.setItem('pendingVerificationEmail', pendingEmail);
            }
        } catch (error) {
            console.error('Error checking current user:', error);
        }
    }
    
    if (!pendingEmail) {
        // No pending verification found - provide user with clear options
        hideLoadingOverlay();
        showToast('No pending verification found.', 'warning');
        
        // Offer multiple options to the user
        setTimeout(() => {
            const email = prompt('Enter your email address to send verification, or click Cancel to use the signup page:');
            if (email && email.trim()) {
                sendVerificationByEmail(email.trim());
            } else {
                // User cancelled or entered nothing - guide to signup
                showToast('Redirecting to signup page where you can enter your email and receive verification.', 'info');
                setTimeout(() => {
                    window.location.href = 'signup.html';
                }, 1500);
            }
        }, 500);
        return;
    }
    
    // We have a pending email
    try {
        showLoadingOverlay('Sending verification email...');
        
        console.log('Resending verification for email:', pendingEmail);
        
        // Use the working password reset method to send verification email
        try {
            await window.auth.sendPasswordResetEmail(pendingEmail, window.actionCodeSettings);
            hideLoadingOverlay();
            showToast(`Verification email sent to ${pendingEmail}! Check your inbox and spam folder.`, 'success');
            
            // Update storage
            localStorage.setItem('resendVerificationEmail', pendingEmail);
            sessionStorage.setItem('pendingVerificationEmail', pendingEmail);
            
            return;
            
        } catch (resetError) {
            console.log('Password reset failed, trying signup approach:', resetError.code);
            
            // If password reset fails with user-not-found, guide to signup
            if (resetError.code === 'auth/user-not-found') {
                hideLoadingOverlay();
                showToast('No account found. Please sign up to create an account.', 'info');
                setTimeout(() => {
                    window.location.href = `signup.html?email=${encodeURIComponent(pendingEmail)}`;
                }, 2000);
                return;
            }
            
            // Other errors - try signup redirect
            hideLoadingOverlay();
            showToast('Preparing verification email...', 'info');
            
            setTimeout(() => {
                window.location.href = `signup.html?email=${encodeURIComponent(pendingEmail)}&resend=true`;
            }, 1000);
        }
        
    } catch (error) {
        console.error('Resend verification error:', error);
        hideLoadingOverlay();
        showToast('Failed to resend verification email. Please try signing up again.', 'error');
    }
}

// Helper function to send verification email to a logged-in user
async function sendVerificationEmailToUser(user) {
    try {
        showLoadingOverlay('Sending verification email...');
        
        await user.sendEmailVerification(window.actionCodeSettings);
        hideLoadingOverlay();
        showToast('Verification email sent! Please check your inbox and spam folder.', 'success');
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error sending verification email to user:', error);
        showToast('Failed to send verification email. Please try again later.', 'error');
    }
}

// Direct function to send verification email by email address
async function sendVerificationByEmail(email) {
    try {
        showLoadingOverlay('Sending verification email...');
        
        console.log('sendVerificationByEmail called for:', email);
        
        // Check if we have a valid email
        if (!email || !email.includes('@')) {
            hideLoadingOverlay();
            showToast('Please provide a valid email address.', 'error');
            return;
        }
        
        // Method 1: Try to send password reset email (which works reliably)
        // This serves as a verification email for unverified accounts
        try {
            await window.auth.sendPasswordResetEmail(email, window.actionCodeSettings);
            hideLoadingOverlay();
            showToast(`Verification email sent to ${email}! Check your inbox and spam folder.`, 'success');
            
            // Store the email for tracking
            localStorage.setItem('resendVerificationEmail', email);
            sessionStorage.setItem('pendingVerificationEmail', email);
            
            return;
            
        } catch (resetError) {
            console.log('Password reset failed, trying alternative method:', resetError.code);
            
            // Method 2: If password reset fails, try to create a temporary verification flow
            if (resetError.code === 'auth/user-not-found') {
                // User doesn't exist, guide to signup
                hideLoadingOverlay();
                showToast('No account found with this email. Please sign up to create an account and receive a verification email.', 'info');
                setTimeout(() => {
                    window.location.href = `signup.html?email=${encodeURIComponent(email)}`;
                }, 2000);
                return;
            }
            
            // Other errors - try the signup redirect approach
            hideLoadingOverlay();
            showToast('Sending verification through secure method...', 'info');
            
            setTimeout(() => {
                window.location.href = `signup.html?email=${encodeURIComponent(email)}&verify=true`;
            }, 1000);
        }
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error sending verification by email:', error);
        showToast('Failed to send verification email. Please try signing up again.', 'error');
    }
}

// Debug function to check email verification status
async function debugEmailVerification() {
    console.log('=== EMAIL VERIFICATION DEBUG ===');
    console.log('1. Checking sessionStorage...');
    console.log('   pendingVerificationEmail:', sessionStorage.getItem('pendingVerificationEmail'));
    
    console.log('2. Checking localStorage...');
    console.log('   resendVerificationEmail:', localStorage.getItem('resendVerificationEmail'));
    
    console.log('3. Checking current user...');
    const currentUser = window.auth.currentUser;
    if (currentUser) {
        console.log('   Current user:', currentUser.email);
        console.log('   Email verified:', currentUser.emailVerified);
        console.log('   User UID:', currentUser.uid);
    } else {
        console.log('   No current user signed in');
    }
    
    console.log('4. Checking actionCodeSettings...');
    console.log('   actionCodeSettings:', window.actionCodeSettings);
    
    console.log('=== END DEBUG ===');
}

// Make debug function globally available for testing
window.debugEmailVerification = debugEmailVerification;

// Test function for email verification
async function testEmailVerification() {
    console.log('🧪 TESTING EMAIL VERIFICATION SYSTEM 🧪');
    
    try {
        // Test 1: Check if Firebase auth is working
        console.log('✅ Test 1: Firebase Auth status:', window.auth ? 'Available' : 'Not available');
        
        // Test 2: Check actionCodeSettings
        console.log('✅ Test 2: Action Code Settings:', window.actionCodeSettings ? 'Configured' : 'Not configured');
        
        // Test 3: Test password reset functionality (should work)
        const testEmail = 'test@example.com';
        console.log('📧 Test 3: Testing password reset email...');
        
        try {
            await window.auth.sendPasswordResetEmail(testEmail);
            console.log('✅ Test 3: Password reset email sent successfully (test@example.com)');
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log('✅ Test 3: Password reset system working (expected user-not-found for test email)');
            } else {
                console.log('❌ Test 3: Password reset failed:', error.code);
            }
        }
        
        // Test 4: Check storage
        console.log('✅ Test 4: Session Storage - pendingVerificationEmail:', sessionStorage.getItem('pendingVerificationEmail') || 'Not set');
        console.log('✅ Test 4: Local Storage - resendVerificationEmail:', localStorage.getItem('resendVerificationEmail') || 'Not set');
        
        console.log('🎯 RECOMMENDATION: If password reset works but verification doesn\'t, use "Forgot Password" for email verification!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    console.log('🧪 END EMAIL VERIFICATION TEST 🧪');
}

// Make test function globally available
window.testEmailVerification = testEmailVerification;

// Make functions globally available
window.togglePassword = togglePassword;
window.showForgotPassword = showForgotPassword;
window.resendVerificationEmail = resendVerificationEmail;
window.sendVerificationByEmail = sendVerificationByEmail;
window.debugEmailVerification = debugEmailVerification;
window.testEmailVerification = testEmailVerification;