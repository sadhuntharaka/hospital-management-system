const { getApp, admin } = require('./_admin');

exports.handler = async (event) => {
  try {
    const { clinicName, adminEmail, adminPassword, adminName } = JSON.parse(event.body || '{}');
    if (!clinicName || !adminEmail || !adminPassword || !adminName) return { statusCode: 400, body: 'Missing required fields' };

    const app = getApp();
    const user = await app.auth().createUser({ email: adminEmail, password: adminPassword, displayName: adminName });
    const clinicRef = app.firestore().collection('clinics').doc();
    await app.auth().setCustomUserClaims(user.uid, { clinicId: clinicRef.id, role: 'admin' });

    await clinicRef.set({ name: clinicName, createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: user.uid });
    await clinicRef.collection('users').doc(user.uid).set({ uid: user.uid, email: adminEmail, displayName: adminName, role: 'admin', clinicId: clinicRef.id, active: true, createdAt: admin.firestore.FieldValue.serverTimestamp() });

    const defaults = [
      { name: 'General Consultation', amount: 3000 },
      { name: 'Follow-up Consultation', amount: 2000 },
    ];

    for (const service of defaults) {
      await clinicRef.collection('services').add({ ...service, createdBy: user.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    }

    return { statusCode: 200, body: JSON.stringify({ uid: user.uid, clinicId: clinicRef.id }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
