const { getApp, admin, getAuthz } = require('./_admin');

const ALLOWED_ROLES = new Set([
  'admin',
  'doctor',
  'receptionist',
  'pharmacy',
  'manager',
]);

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const caller = await getAuthz(event);
    if (!caller || caller.role !== 'admin') {
      return { statusCode: 403, body: 'Forbidden' };
    }

    const { uid, clinicId, role, displayName, email } = JSON.parse(event.body || '{}');

    if (!uid || !clinicId || !role) {
      return { statusCode: 400, body: 'uid, clinicId and role are required' };
    }

    if (caller.clinicId !== clinicId) {
      return { statusCode: 403, body: 'Cannot manage users outside your clinic' };
    }

    if (!ALLOWED_ROLES.has(role)) {
      return { statusCode: 400, body: 'Invalid role' };
    }

    const app = getApp();
    const authUser = await app.auth().getUser(uid);
    await app.auth().setCustomUserClaims(uid, { clinicId, role });

    const profileRef = app
      .firestore()
      .collection('clinics')
      .doc(clinicId)
      .collection('users')
      .doc(uid);

    const profileSnap = await profileRef.get();
    await profileRef.set(
      {
        uid,
        clinicId,
        role,
        email: email || authUser.email || '',
        displayName: displayName || authUser.displayName || authUser.email || uid,
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: caller.uid,
        createdAt: profileSnap.exists
          ? profileSnap.data()?.createdAt || admin.firestore.FieldValue.serverTimestamp()
          : admin.firestore.FieldValue.serverTimestamp(),
        createdBy: profileSnap.exists ? profileSnap.data()?.createdBy || caller.uid : caller.uid,
      },
      { merge: true },
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, uid, clinicId, role }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
