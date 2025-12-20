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
        const storageBucket = configService.get<string>('FIREBASE_STORAGE_BUCKET');

        if (projectId && clientEmail && privateKey) {
          const serviceAccount = {
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          };
          return initializeApp({
            credential: cert(serviceAccount),
            projectId,
            storageBucket,
          });
        }

        return initializeApp({
          credential: applicationDefault(),
          storageBucket: configService.get<string>('FIREBASE_STORAGE_BUCKET'),
        });
      },
    },
    {
      provide: FIRESTORE,
      inject: [FIREBASE_APP, ConfigService],
      useFactory: (app: App, configService: ConfigService): Firestore => {
        const firestore = getFirestore(app);
        firestore.settings(firestoreSettings);
        
        // Check if using Firestore Emulator
        const emulatorHost = configService.get<string>('FIRESTORE_EMULATOR_HOST');
        if (emulatorHost) {
          // The Admin SDK automatically connects to emulator when FIRESTORE_EMULATOR_HOST is set
          // But we need to ensure the project ID is set for emulator
          const projectId = configService.get<string>('FIREBASE_PROJECT_ID') || 'demo-pos-checkout';
          process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
          process.env.GCLOUD_PROJECT = projectId;
        }
        
        return firestore;
      },
    },
    FirestoreService,
  ],
  exports: [FirestoreService, FIRESTORE, FIREBASE_APP],
})
export class FirestoreModule {}

