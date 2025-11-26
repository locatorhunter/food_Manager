const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated and is an admin.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const adminUser = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();
  if (!adminUser.exists || adminUser.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can delete users."
    );
  }

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'uid' argument."
    );
  }

  try {
    // Delete the user from Firebase Authentication.
    await admin.auth().deleteUser(uid);

    // Delete the user's document from Firestore.
    await admin.firestore().collection("users").doc(uid).delete();

    return { message: `Successfully deleted user ${uid}` };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new functions.https.HttpsError("internal", "Error deleting user.");
  }
});

exports.createUser = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated and is an admin.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const adminUser = await admin
    .firestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();
  if (!adminUser.exists || adminUser.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can create users."
    );
  }

  const { email, password, displayName, role, department, employeeId } = data;

  if (!email || !password || !displayName || !role) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with email, password, displayName and role arguments."
    );
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    const now = new Date().toISOString();
    const currentUser = context.auth;

    const userData = {
        email: email,
        displayName: displayName,
        role: role,
        department: department || '',
        employeeId: employeeId || '',
        emailVerified: false,
        disabled: role === 'manager', // Managers need approval
        pendingApproval: role === 'manager',
        creationTime: now,
        lastLogin: null,
        lastActivity: null,
        createdBy: currentUser ? currentUser.uid : 'admin',
        lastUpdated: now,
        updatedBy: currentUser ? currentUser.uid : 'admin',
        uid: userRecord.uid
    };

    await admin.firestore().collection("users").doc(userRecord.uid).set(userData);

    if (role === 'manager') {
        const approvalRequest = {
            userId: userRecord.uid,
            email: email,
            displayName: displayName,
            role: role,
            department: department,
            employeeId: employeeId,
            requestTime: new Date().toISOString(),
            status: 'pending',
            reviewedBy: null,
            reviewedAt: null,
            notes: 'Created by admin'
        };

        await admin.firestore().collection('userApprovals').doc(userRecord.uid).set(approvalRequest);
    }

    return { uid: userRecord.uid };
  } catch (error) {
    console.error("Error creating user:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
