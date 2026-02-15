const admin = require('firebase-admin');

let app;

const getApp = () => {
  if (app) return app;
  const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  app = admin.initializeApp({
    credential: admin.credential.cert(credentials),
    projectId: process.env.FIREBASE_PROJECT_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  return app;
};

const getAuthz = async (event) => {
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = await getApp().auth().verifyIdToken(token);
  return decoded;
};

module.exports = { admin, getApp, getAuthz };
