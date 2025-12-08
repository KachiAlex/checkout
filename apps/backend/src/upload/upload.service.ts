import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getApp } from 'firebase-admin/app';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadService {
  private storage: Storage;

  constructor(private readonly configService: ConfigService) {
    try {
      const app = getApp();
      this.storage = getStorage(app);
    } catch (error) {
      console.error('Failed to initialize Firebase Storage:', error);
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

    // Validate file type (only images)
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    try {
      const bucket = this.storage.bucket();
      const fileExtension = file.originalname.split('.').pop() || 'jpg';
      const fileName = `${folder}/${tenantId}/${uuid()}.${fileExtension}`;
      const fileRef = bucket.file(fileName);

      // Upload file
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            tenantId,
            uploadedAt: new Date().toISOString(),
          },
        },
        public: true, // Make file publicly accessible
      });

      // Get public URL
      const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      return {
        url,
        path: fileName,
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new BadRequestException('Failed to upload file');
    }
  }
}

