import { Injectable, BadRequestException, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getStorage, Storage } from 'firebase-admin/storage';
import { App } from 'firebase-admin/app';
import { v4 as uuid } from 'uuid';
import { FIREBASE_APP } from '../firestore/firestore.constants';

@Injectable()
export class UploadService implements OnModuleInit {
  private storage: Storage | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(FIREBASE_APP) private readonly firebaseApp: App,
  ) {}

  onModuleInit() {
    try {
      this.storage = getStorage(this.firebaseApp);
      console.log('✅ Firebase Storage initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Storage:', error);
      this.storage = null;
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    tenantId: string,
  ): Promise<{ url: string; path: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.storage) {
      throw new BadRequestException('Storage service not initialized');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    try {
      const bucket = this.storage.bucket();
      const fileExtension = file.originalname.split('.').pop() || 'jpg';
      const fileName = `${folder}/${tenantId}/${uuid()}.${fileExtension}`;
      const fileRef = bucket.file(fileName);

      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            tenantId,
            uploadedAt: new Date().toISOString(),
          },
        },
        public: true,
      });

      const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      return {
        url,
        path: fileName,
      };
    } catch (error) {
      const uploadError = error as Error & { code?: string; details?: unknown };
      console.error('Failed to upload file:', {
        error: uploadError?.message,
        stack: uploadError?.stack,
        code: uploadError?.code,
        details: uploadError?.details,
        bucket: this.storage?.bucket()?.name,
        folder,
        tenantId,
        fileName: file?.originalname,
      });
      throw new BadRequestException(`Failed to upload file: ${uploadError.message}`);
    }
  }
}
