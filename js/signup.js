// ========================================
// Signup Page Functionality
// ========================================

let currentStep = 1;
let passwordStrength = 0;

// Initialize signup page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeSignupPage();
    });
} else {
    // DOM is already ready
    initializeSignupPage();
}

function initializeSignupPage() {
    console.log('Initializing signup page...');
    setupFormValidation();
    setupPasswordStrengthChecker();
    setupRoleSelection();
    setupModalHandlers();
    
    // Check URL parameters for resend verification
    const urlParams = new URLSearchParams(window.location.search);
    const resendEmail = urlParams.get('email');
    const isResend = urlParams.get('resend') === 'true';
    
    if (resendEmail && isResend) {
        console.log('Handling resend verification for:', resendEmail);
        // Pre-fill the email field
        const emailField = document.getElementById('email');
        if (emailField) {
            emailField.value = resendEmail;
        }
        
        // Show resend verification modal or automatically trigger resend
        setTimeout(() => {
            handleResendVerification(resendEmail);
        }, 500);
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Clear any existing pending verification email when page loads (unless we're resending)
    if (!isResend) {
        sessionStorage.removeItem('pendingVerificationEmail');
    }
    
    console.log('Signup page initialized successfully');
}

async function handleResendVerification(email) {
    try {
        showLoadingOverlay('Checking account status...');
        
        // Try to check if user exists in Firestore
        const userExists = await checkExistingUser(email);
        
        if (userExists.exists) {
            console.log('User found in Firestore:', userExists.data);
            
            const userData = userExists.data;
            
            if (userData.emailVerified) {
                // Account is already verified
                showToast('This email is already verified. Please try logging in.', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                // Account exists but not verified
                showToast('Account found but not verified. Since you know your password, please use "Forgot Password" on the login page to receive a verification email.', 'info');
                
                // Store the email for easy access
                localStorage.setItem('resendVerificationEmail', email);
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            }
        } else {
            // User doesn't exist, this is likely a new signup
            showToast('No account found with this email. Please complete the signup process to create a new account and receive a verification email.', 'info');
        }
        
    } catch (error) {
        console.error('Error handling resend verification:', error);
        showToast('Error checking account status. Please try signing up again.', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

function setupFormValidation() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (currentStep === 2) {
            // Validate step 2 and submit
            if (!validateStep2()) return;
            await submitSignup();
        }
    });

    // Handle Next Step button
    const nextStepBtn = document.getElementById('nextStepBtn');
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (validateStep1()) {
                nextStep(2);
            }
        });
    }
}

function setupPasswordStrengthChecker() {
    const passwordInput = document.getElementById('signupPassword');
    if (!passwordInput) return;

    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = SecurityFramework.validatePassword(password);

        updatePasswordStrength(strength);
    });
}

function updatePasswordStrength(validationResult) {
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    if (!strengthFill || !strengthText) return;

    let percentage = 0;
    let text = 'Password strength: ';
    let color = '#ef4444'; // red

    switch (validationResult.strength) {
        case 'weak':
            percentage = 25;
            text += 'Weak';
            color = '#ef4444';
            break;
        case 'medium':
            percentage = 50;
            text += 'Medium';
            color = '#f59e0b';
            break;
        case 'strong':
            percentage = 100;
            text += 'Strong';
            color = '#10b981';
            break;
    }

    strengthFill.style.width = percentage + '%';
    strengthFill.style.backgroundColor = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
}

function setupRoleSelection() {
    const roleOptions = document.querySelectorAll('.role-option');

    roleOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            roleOptions.forEach(opt => opt.classList.remove('selected'));

            // Add selected class to clicked option
            this.classList.add('selected');

            // Check the radio button
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
        });
    });
}

function setupModalHandlers() {
    // Terms modal
    const termsModal = document.getElementById('termsModal');
    const privacyModal = document.getElementById('privacyModal');

    // Close modals
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal')) {
            termsModal.style.display = 'none';
            privacyModal.style.display = 'none';
        }
    });
}

function nextStep(step) {
    document.getElementById(`step${currentStep}`).style.display = 'none';
    document.getElementById(`step${step}`).style.display = 'block';
    currentStep = step;
}

function prevStep(step) {
    document.getElementById(`step${currentStep}`).style.display = 'none';
    document.getElementById(`step${step}`).style.display = 'block';
    currentStep = step;
}

function validateStep1() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const displayName = document.getElementById('signupDisplayName').value.trim();

    // Clear previous errors
    clearValidationErrors();

    let isValid = true;

    // Validate email
    if (typeof SecurityFramework !== 'undefined' && SecurityFramework.validateEmail) {
        const emailValidation = SecurityFramework.validateEmail(email);
        if (!emailValidation.isValid) {
            showFieldError('signupEmail', emailValidation.errors[0]);
            isValid = false;
        }
    } else {
        showFieldError('signupEmail', 'Email validation not available');
        isValid = false;
    }

    // Validate password
    if (typeof SecurityFramework !== 'undefined' && SecurityFramework.validatePassword) {
        const passwordValidation = SecurityFramework.validatePassword(password);
        if (!passwordValidation.isValid) {
            showFieldError('signupPassword', passwordValidation.errors[0]);
            isValid = false;
        }
    } else {
        showFieldError('signupPassword', 'Password validation not available');
        isValid = false;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
        showFieldError('signupConfirmPassword', 'Passwords do not match');
        isValid = false;
    }

    // Validate display name
    if (typeof isValidName === 'function') {
        const nameValidation = isValidName(displayName);
        if (!nameValidation.isValid) {
            showFieldError('signupDisplayName', nameValidation.errors[0]);
            isValid = false;
        }
    } else {
        showFieldError('signupDisplayName', 'Name validation not available');
        isValid = false;
    }

    return isValid;
}

function validateStep2() {
    const acceptTerms = document.getElementById('acceptTerms').checked;
    const selectedRole = document.querySelector('input[name="userRole"]:checked');

    // Clear previous errors
    clearValidationErrors();

    let isValid = true;

    // Check terms acceptance
    if (!acceptTerms) {
        showFieldError('acceptTerms', 'You must accept the Terms of Service');
        isValid = false;
    }

    // Check role selection
    if (!selectedRole) {
        showToast('Please select a role', 'error');
        isValid = false;
    }

    return isValid;
}

function clearValidationErrors() {
    // Remove error classes and messages
    document.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });

    document.querySelectorAll('.validation-error').forEach(el => {
        el.remove();
    });
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.add('is-invalid');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.textContent = message;

    field.parentNode.appendChild(errorDiv);
}

async function submitSignup() {
    const formData = {
        email: document.getElementById('signupEmail').value.trim(),
        password: document.getElementById('signupPassword').value,
        confirmPassword: document.getElementById('signupConfirmPassword').value,
        displayName: document.getElementById('signupDisplayName').value.trim(),
        role: document.querySelector('input[name="userRole"]:checked')?.value,
        department: document.getElementById('signupDepartment').value.trim(),
        employeeId: document.getElementById('signupEmployeeId').value.trim(),
        acceptTerms: document.getElementById('acceptTerms').checked,
        acceptMarketing: document.getElementById('acceptMarketing').checked
    };

    try {
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

        if (!formData.role) {
            showToast('Please select a role', 'error');
            return;
        }

        showLoadingOverlay('Creating your account...');

        // Check if email already exists
        const existingUserCheck = await checkExistingUser(formData.email);
        if (existingUserCheck.exists) {
            // Handle existing user gracefully
            showAccountExistsOptions(existingUserCheck);
            return;
        }

        // Create user account
        const result = await createUserAccount(formData);

        if (result.success) {
            showToast('Account created successfully! Please check your email for verification. If you don\'t see it, check your spam folder.', 'success');

            // Clear form
            document.getElementById('signupForm').reset();
            
            // Show additional guidance for email verification
            setTimeout(() => {
                showToast('Didn\'t receive the email? Use the "Resend verification email" link on the login page.', 'info', 6000);
            }, 2000);
            
            // Redirect to login after a delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 5000);
        } else {
            // Only show error if we haven't already handled the situation
            if (!result.handled) {
                showToast(result.error, 'error');
            }
        }

    } catch (error) {
        console.error('Signup error:', error);
        showToast('An error occurred during signup. Please try again.', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

async function checkExistingUser(email) {
    try {
        // Check if user exists in Firestore
        const userQuery = await window.db.collection('users').where('email', '==', email).get();

        if (!userQuery.empty) {
            const userDoc = userQuery.docs[0];
            const userData = userDoc.data();
            
            // Return detailed information about the existing user
            return {
                exists: true,
                uid: userData.uid,
                email: userData.email,
                displayName: userData.displayName,
                emailVerified: userData.emailVerified || false,
                role: userData.role,
                disabled: userData.disabled || false,
                pendingApproval: userData.pendingApproval || false,
                creationTime: userData.creationTime,
                lastLogin: userData.lastLogin
            };
        }

        return { exists: false };
    } catch (error) {
        console.error('Error checking existing user:', error);
        return { exists: false, error: error.message };
    }
}

async function resendVerificationForExistingUser(existingUser) {
    try {
        console.log('Attempting to resend verification for existing user:', existingUser.email);
        
        // Try to get the current Firebase Auth user by forcing a password reset or sign-in attempt
        // Since we can't directly get a user by email without admin SDK, we'll use a different approach
        
        // For now, we'll show a message that instructs the user to use the login page
        showToast(`We found your existing account (${existingUser.email}). Please go to the login page and click "Resend verification email" to receive a new verification link.`, 'info', 8000);
        
        // Store the email for the resend function on login page
        sessionStorage.setItem('pendingVerificationEmail', existingUser.email);
        
        // Redirect to login page after a delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 4000);
        
        return { success: true, message: 'Redirecting to login page for email resend' };
        
    } catch (error) {
        console.error('Error resending verification for existing user:', error);
        return { 
            success: false, 
            error: 'Failed to resend verification email. Please contact support or try using the login page.',
            fallbackMessage: `Account exists (${existingUser.email}) but verification resend failed. Please use the login page.`
        };
    }
}

function showAccountExistsOptions(existingUser) {
    // Create a custom modal or use enhanced toast to show options
    const options = {
        email: existingUser.email,
        displayName: existingUser.displayName,
        status: existingUser.emailVerified ? 'verified' : 'unverified',
        role: existingUser.role
    };
    
    let message = `We found your existing account:\n\n`;
    message += `📧 Email: ${options.email}\n`;
    message += `👤 Name: ${options.displayName}\n`;
    message += `📋 Status: ${options.status === 'verified' ? '✅ Verified' : '❌ Not Verified'}\n`;
    message += `👔 Role: ${options.role}\n\n`;
    
    if (!options.status || options.status === 'unverified') {
        message += `Would you like us to send a new verification email?`;
        
        if (confirm(message)) {
            resendVerificationForExistingUser(existingUser);
        } else {
            showToast('You can always resend the verification email from the login page.', 'info');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    } else {
        message += `Your account is already verified. You can sign in directly.`;
        showToast(message, 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
    }
}

async function createUserAccount(formData) {
    console.log('Creating Firebase Auth user...');
    try {
        // Create Firebase Auth user
        const userCredential = await window.auth.createUserWithEmailAndPassword(
            formData.email,
            formData.password
        );

        const user = userCredential.user;
        console.log('Firebase Auth user created:', user.uid);

        // Send email verification with simplified approach
        console.log('Sending email verification...');
        let emailSent = false;
        let verificationError = null;
        
        try {
            // Method 1: Try simple email verification without actionCodeSettings
            await user.sendEmailVerification();
            emailSent = true;
            console.log('Email verification sent successfully (simple method)');
            
        } catch (error1) {
            console.warn('Simple method failed, trying with actionCodeSettings:', error1.code);
            verificationError = error1;
            
            try {
                // Method 2: Try with actionCodeSettings if available
                if (window.actionCodeSettings) {
                    await user.sendEmailVerification(window.actionCodeSettings);
                    emailSent = true;
                    console.log('Email verification sent with actionCodeSettings');
                }
            } catch (error2) {
                console.warn('actionCodeSettings method also failed:', error2.code);
                verificationError = error2;
            }
        }
        
        // Store user email temporarily for resend functionality regardless of success
        sessionStorage.setItem('pendingVerificationEmail', formData.email);
        
        if (!emailSent && verificationError) {
            console.error('Email verification failed completely:', verificationError);
            
            let errorMessage = 'Account created but verification email failed to send. ';
            
            switch (verificationError.code) {
                case 'auth/unauthorized-continue-uri':
                    errorMessage += 'Domain not authorized. Please contact support.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Please check your email address and try again.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage += 'Too many requests. Please try again later.';
                    break;
                default:
                    errorMessage += 'You can request a new verification email from the login page.';
            }
            
            console.warn('Email verification error details:', errorMessage);
        }

        // IMPORTANT: Sign out the user immediately after signup
        // Firebase automatically signs in users after createUserWithEmailAndPassword
        // We need to sign them out so they must verify their email before accessing the app
        console.log('Signing out user to enforce email verification...');
        await window.auth.signOut();
        console.log('User signed out successfully');

        // Prepare user data for Firestore
        const userData = {
            uid: user.uid,
            email: formData.email,
            displayName: formData.displayName,
            role: formData.role,
            department: formData.department || '',
            employeeId: formData.employeeId || '',
            emailVerified: false,
            disabled: formData.role === 'manager', // Managers need approval
            pendingApproval: formData.role === 'manager', // Managers need approval
            acceptMarketing: formData.acceptMarketing,
            creationTime: new Date().toISOString(),
            lastLogin: null,
            createdBy: 'self-registration'
        };

        console.log('Storing user data in Firestore...');
        // Store user data in Firestore
        await window.db.collection('users').doc(user.uid).set(userData);
        console.log('User data stored in Firestore');

        // If employee, auto-approve. If manager, create approval request
        if (formData.role === 'manager') {
            console.log('Creating approval request for manager...');
            await createApprovalRequest(userData);
            console.log('Approval request created');
        }

        return { success: true, user: userData };

    } catch (error) {
        console.error('Error creating user account:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        // Handle email already in use error
        if (error.code === 'auth/email-already-in-use') {
            console.log('Email already in use in Firebase Auth, checking Firestore...');
            
            // Check if user exists in Firestore
            const existingUserCheck = await checkExistingUser(formData.email);
            if (existingUserCheck.exists) {
                // User exists in both Firebase Auth and Firestore
                showAccountExistsOptions(existingUserCheck);
                return { success: false, handled: true };
            } else {
                // User exists in Firebase Auth but not in Firestore (incomplete registration)
                showToast('We found an incomplete registration with this email. Redirecting to login page to complete verification.', 'info');
                sessionStorage.setItem('pendingVerificationEmail', formData.email);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
                return { success: false, handled: true };
            }
        }

        // Clean up on error
        try {
            if (window.auth.currentUser) {
                console.log('Cleaning up failed registration...');
                await window.auth.currentUser.delete();
                console.log('Cleanup completed');
            }
        } catch (cleanupError) {
            console.error('Error cleaning up failed registration:', cleanupError);
        }

        return {
            success: false,
            error: getSignupErrorMessage(error.code)
        };
    }
}

async function createApprovalRequest(userData) {
    try {
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

        await window.db.collection('userApprovals').doc(userData.uid).set(approvalRequest);
    } catch (error) {
        console.error('Error creating approval request:', error);
    }
}

function getSignupErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
        'auth/network-request-failed': 'Network error. Please check your connection and try again.',
        'auth/too-many-requests': 'Too many signup attempts. Please try again later.',
        'auth/operation-not-allowed': 'Email/password authentication is not enabled. Please contact administrator.',
        'auth/invalid-api-key': 'Invalid Firebase API key. Please check configuration.',
        'auth/app-deleted': 'Firebase app has been deleted. Please contact administrator.',
        'auth/app-not-authorized': 'This domain is not authorized for Firebase authentication.',
        'auth/argument-error': 'Invalid argument provided to authentication method.',
        'auth/invalid-api-key': 'Your API key is invalid. Please check your Firebase configuration.',
        'auth/invalid-user-token': 'User token is invalid or expired.',
        'auth/network-request-failed': 'Network request failed. Please check your internet connection.',
        'auth/requires-recent-login': 'This operation requires recent authentication. Please sign in again.',
        'auth/too-many-requests': 'Too many requests. Please try again later.',
        'auth/user-disabled': 'This user account has been disabled.',
        'auth/user-token-expired': 'User token has expired. Please sign in again.',
        'auth/web-storage-unsupported': 'Web storage is not supported in this browser.',
        'auth/invalid-credential': 'Invalid credential provided.',
        'auth/user-mismatch': 'The supplied credentials do not correspond to the previously signed in user.',
        'auth/invalid-verification-code': 'Invalid verification code.',
        'auth/invalid-verification-id': 'Invalid verification ID.',
        'auth/missing-verification-code': 'Missing verification code.',
        'auth/quota-exceeded': 'Quota exceeded. Please try again later.',
        'auth/captcha-check-failed': 'reCAPTCHA check failed.',
        'auth/invalid-phone-number': 'Invalid phone number.',
        'auth/missing-phone-number': 'Missing phone number.',
        'auth/auth-domain-config-required': 'Auth domain configuration required.',
        'auth/cancelled-popup-request': 'Popup request cancelled.',
        'auth/popup-blocked': 'Popup blocked by browser.',
        'auth/popup-closed-by-user': 'Popup closed by user.',
        'auth/unauthorized-domain': 'This domain is not authorized for OAuth operations.',
        'auth/invalid-action-code': 'Invalid action code.',
        'auth/wrong-password': 'Wrong password.',
        'auth/invalid-persistence-type': 'Invalid persistence type.',
        'auth/unsupported-persistence-type': 'Unsupported persistence type.',
        'auth/email-change-needs-verification': 'Email change needs verification.',
        'auth/account-exists-with-different-credential': 'Account exists with different credential.',
        'auth/credential-already-in-use': 'Credential already in use.',
        'auth/timeout': 'Operation timed out.'
    };

    return errorMessages[errorCode] || `An error occurred during signup (${errorCode}). Please try again.`;
}

function showTermsOfService() {
    document.getElementById('termsModal').style.display = 'flex';
}

function showPrivacyPolicy() {
    document.getElementById('privacyModal').style.display = 'flex';
}

// Enhanced password toggle function
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggleBtn = input.parentNode.querySelector('.password-toggle');

    if (input && toggleBtn) {
        if (input.type === 'password') {
            input.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            input.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }
}

// Make functions globally available
window.nextStep = nextStep;
window.prevStep = prevStep;
window.showTermsOfService = showTermsOfService;
window.showPrivacyPolicy = showPrivacyPolicy;
window.togglePassword = togglePassword;

// Initialize signup page when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Signup page loaded successfully');
    
    // Test if required functions are available
    setTimeout(() => {
        console.log('SecurityFramework available:', typeof window.SecurityFramework !== 'undefined');
        console.log('Firebase Auth initialized:', !!window.auth);
        console.log('Firestore initialized:', !!window.db);
    }, 500);
});

// Expose functions globally for use in other scripts
window.handleResendVerification = handleResendVerification;