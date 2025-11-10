import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { initializeApp, App, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore, Settings } from 'firebase-admin/firestore';
import { FIREBASE_APP, FIRESTORE } from './firestore.constants';
import { FirestoreService } from './firestore.service';

const firestoreSettings: Settings = {
  ignoreUndefinedProperties: true,
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: FIREBASE_APP,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): App => {
        const existingApp = getApps()[0];
        if (existingApp) {
          return existingApp;
        }

        const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY');

        if (projectId && clientEmail && privateKey) {
          const serviceAccount = {
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          };
          return initializeApp({
            credential: cert(serviceAccount),
            projectId,
          });
        }

        return initializeApp({
          credential: applicationDefault(),
        });
      },
    },
    {
      provide: FIRESTORE,
      inject: [FIREBASE_APP],
      useFactory: (app: App): Firestore => {
        const firestore = getFirestore(app);
        firestore.settings(firestoreSettings);
        return firestore;
      },
    },
    FirestoreService,
  ],
  exports: [FirestoreService, FIRESTORE],
})
export class FirestoreModule {}

