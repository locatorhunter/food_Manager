// Script to update user role to admin
// Run this in browser console on any page

async function updateUserRole(uid, role = 'admin') {
    try {
        console.log('Updating user with UID:', uid);

        // Update the user document using the actual Firebase Auth UID
        const userRef = window.db.collection('users').doc(uid);
        await userRef.update({
            role: role,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'admin-script'
        });

        console.log('User role updated to', role, 'successfully');

        // Update sessionStorage to reflect the new role immediately
        const currentUserData = window.authService ? window.authService.getCurrentUser() : null;
        if (currentUserData) {
            const updatedUserData = { ...currentUserData, role: role };
            sessionStorage.setItem('user', JSON.stringify(updatedUserData));
            console.log('Session storage updated with new role');
        }

        showToast('User role updated successfully!');

        // Reload page to ensure all components use the updated role
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {
        console.error('Error updating user role:', error);
        showToast('Error updating user role', 'error');
    }
}

// Update the current user to admin
const currentUser = window.auth ? window.auth.currentUser : null;
if (currentUser && currentUser.uid) {
    console.log('Current user UID:', currentUser.uid);
    updateUserRole(currentUser.uid, 'admin');
} else {
    console.log('No current user found');
}