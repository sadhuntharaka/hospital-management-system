const { getApp, admin } = require('./_admin');

const ROLES = [
  { role: 'admin', localPart: 'admin', displayName: 'Admin' },
  { role: 'doctor', localPart: 'doctor', displayName: 'Doctor' },
  { role: 'receptionist', localPart: 'reception', displayName: 'Reception' },
  { role: 'pharmacy', localPart: 'pharmacy', displayName: 'Pharmacy' },
  { role: 'manager', localPart: 'manager', displayName: 'Manager' },
];

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const bootstrapSecret = event.headers['x-bootstrap-secret'];
    if (!bootstrapSecret || bootstrapSecret !== process.env.BOOTSTRAP_SECRET) {
      return { statusCode: 403, body: 'Forbidden' };
    }

    const payload = JSON.parse(event.body || '{}');
    const clinicName = payload.clinicName;
    const emailDomain = (payload.emailDomain || 'myclinic.lk').toLowerCase().trim();

    if (!clinicName) {
      return { statusCode: 400, body: 'clinicName is required' };
    }

    const defaultPassword = process.env.CLINIC_DEFAULT_PASSWORD;
    if (!defaultPassword) {
      return { statusCode: 500, body: 'CLINIC_DEFAULT_PASSWORD is not configured' };
    }

    const app = getApp();
    const db = app.firestore();

    const lockRef = db.collection('system').doc('bootstrap');
    const clinicRef = db.collection('clinics').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    let locked = false;
    await db.runTransaction(async (trx) => {
      const lockSnap = await trx.get(lockRef);
      if (lockSnap.exists && lockSnap.data()?.locked === true) {
        locked = true;
        return;
      }

      trx.set(lockRef, {
        locked: true,
        clinicId: clinicRef.id,
        lockedAt: now,
      });

      trx.set(clinicRef, {
        name: clinicName,
        bootstrapLocked: true,
        createdAt: now,
        createdBy: 'bootstrapClinic',
      });
    });

    if (locked) {
      return { statusCode: 409, body: JSON.stringify({ message: 'Already bootstrapped' }) };
    }

    const accounts = [];
    let adminUid = null;

    for (const roleConfig of ROLES) {
      const email = `${roleConfig.localPart}@${emailDomain}`;
      const user = await app.auth().createUser({
        email,
        password: defaultPassword,
        displayName: roleConfig.displayName,
      });

      if (roleConfig.role === 'admin') adminUid = user.uid;

      await app.auth().setCustomUserClaims(user.uid, {
        clinicId: clinicRef.id,
        role: roleConfig.role,
      });

      await clinicRef.collection('users').doc(user.uid).set(
        {
          uid: user.uid,
          email,
          displayName: roleConfig.displayName,
          role: roleConfig.role,
          clinicId: clinicRef.id,
          active: true,
          mustChangePassword: true,
          createdAt: now,
          createdBy: adminUid || user.uid,
        },
        { merge: true },
      );

      accounts.push({ role: roleConfig.role, email, uid: user.uid });
    }

    const defaultServices = [
      { name: 'General Consultation', amount: 3000 },
      { name: 'Follow-up Consultation', amount: 2000 },
    ];

    for (const service of defaultServices) {
      await clinicRef.collection('services').add({
        ...service,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: adminUid || 'bootstrapClinic',
      });
    }

    await clinicRef.collection('settings').doc('bootstrap').set({
      locked: true,
      lockedAt: admin.firestore.FieldValue.serverTimestamp(),
      lockedBy: adminUid || 'bootstrapClinic',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        clinicId: clinicRef.id,
        accounts,
        note: 'Default password set; must change on first login.',
      }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
