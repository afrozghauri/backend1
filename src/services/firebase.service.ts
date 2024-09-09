import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import * as serviceAccount from 'src/config/quizzical-3497b-firebase-adminsdk-cxwux-7932457d7c.json';

@Injectable()
export class FirebaseService {
  private readonly adminApp: admin.app.App;

  constructor() {
    this.adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
    });
  }

  getAuth() {
    return this.adminApp.auth();
  }
}