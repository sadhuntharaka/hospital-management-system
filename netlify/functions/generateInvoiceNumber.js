const { getApp, admin, getAuthz } = require('./_admin');

exports.handler = async (event) => {
  try {
    const caller = await getAuthz(event);
    if (!caller) return { statusCode: 401, body: 'Unauthorized' };

    const app = getApp();
    const counterRef = app.firestore().collection('clinics').doc(caller.clinicId).collection('meta').doc('invoiceCounter');

    const invoiceNumber = await app.firestore().runTransaction(async (trx) => {
      const snap = await trx.get(counterRef);
      const next = (snap.data()?.value || 0) + 1;
      trx.set(counterRef, { value: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return `INV-${String(next).padStart(6, '0')}`;
    });

    return { statusCode: 200, body: JSON.stringify({ invoiceNumber }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
