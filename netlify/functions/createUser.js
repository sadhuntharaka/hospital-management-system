const { getApp, admin, getAuthz } = require('./_admin');

exports.handler = async (event) => {
  try {
    const caller = await getAuthz(event);
    if (!caller || caller.role !== 'admin') return { statusCode: 403, body: 'Forbidden' };

    const { email, password, displayName, role } = JSON.parse(event.body || '{}');
    const app = getApp();
    const user = await app.auth().createUser({ email, password, displayName });
    await app.auth().setCustomUserClaims(user.uid, { clinicId: caller.clinicId, role });

    await app
      .firestore()
      .collection('clinics')
      .doc(caller.clinicId)
      .collection('users')
      .doc(user.uid)
      .set({ uid: user.uid, email, displayName, role, clinicId: caller.clinicId, active: true, createdBy: caller.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });

    return { statusCode: 200, body: JSON.stringify({ uid: user.uid }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
