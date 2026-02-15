const { getApp, admin, getAuthz } = require('./_admin');

exports.handler = async (event) => {
  try {
    const caller = await getAuthz(event);
    if (!caller || caller.role !== 'admin') return { statusCode: 403, body: 'Forbidden' };

    const { invoiceId } = JSON.parse(event.body || '{}');
    const app = getApp();
    const clinicRef = app.firestore().collection('clinics').doc(caller.clinicId);
    const invoiceRef = clinicRef.collection('invoices').doc(invoiceId);

    await app.firestore().runTransaction(async (trx) => {
      const invoiceSnap = await trx.get(invoiceRef);
      if (!invoiceSnap.exists) throw new Error('Invoice not found');
      trx.update(invoiceRef, { status: 'void', voidedAt: admin.firestore.FieldValue.serverTimestamp(), voidedBy: caller.uid });
      trx.set(clinicRef.collection('auditLogs').doc(), { type: 'invoice_voided', invoiceId, createdBy: caller.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
