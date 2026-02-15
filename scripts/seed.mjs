import admin from 'firebase-admin';

const serviceJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceJson) throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceJson)),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

const run = async () => {
  const clinicName = process.argv[2] || 'Demo Clinic';
  const adminEmail = process.argv[3] || 'admin@clinic.lk';
  const adminPassword = process.argv[4] || 'ChangeMe123!';
  const adminName = process.argv[5] || 'Clinic Admin';

  const user = await admin.auth().createUser({ email: adminEmail, password: adminPassword, displayName: adminName });
  const clinicRef = db.collection('clinics').doc();
  await admin.auth().setCustomUserClaims(user.uid, { clinicId: clinicRef.id, role: 'admin' });

  await clinicRef.set({ name: clinicName, createdBy: user.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  await clinicRef.collection('users').doc(user.uid).set({ uid: user.uid, email: adminEmail, role: 'admin', clinicId: clinicRef.id, displayName: adminName, active: true });

  const services = [
    { name: 'General Consultation', amount: 3000 },
    { name: 'ECG', amount: 4500 },
  ];

  const items = [
    { name: 'Paracetamol 500mg', reorderLevel: 50, buyingPrice: 8, sellingPrice: 12, kind: 'drug' },
    { name: 'Bandage Roll', reorderLevel: 20, buyingPrice: 90, sellingPrice: 120, kind: 'supply' },
  ];

  for (const service of services) await clinicRef.collection('services').add({ ...service, createdBy: user.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  for (const item of items) {
    const itemRef = await clinicRef.collection('items').add({ ...item, createdBy: user.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    await clinicRef.collection('stockBatches').add({ itemId: itemRef.id, batchNo: `INIT-${Date.now()}`, expiryDate: '2027-12-31', qty: 100, remainingQty: 100, createdBy: user.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }

  console.log(JSON.stringify({ clinicId: clinicRef.id, adminUid: user.uid }, null, 2));
};

run();
