import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import config from '../../config';

let firebaseApp: App | undefined;
let firebaseAuthInstance: Auth | undefined;

const getFirebaseApp = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  firebaseApp =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId: config.firebase.project_id,
            clientEmail: config.firebase.client_email,
            privateKey: config.firebase.private_key,
          }),
        });

  return firebaseApp;
};

export const firebaseAuth = {
  verifyIdToken: (idToken: string) => {
    if (!firebaseAuthInstance) {
      firebaseAuthInstance = getAuth(getFirebaseApp());
    }
    return firebaseAuthInstance.verifyIdToken(idToken);
  },
};
