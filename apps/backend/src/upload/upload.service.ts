import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { put } from '@vercel/blob';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {}

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    tenantId: string,
  ): Promise<{ url: string; path: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    const vercelBlobToken = this.configService.get<string>('VERCEL_BLOB_RW_TOKEN');
    if (!vercelBlobToken) {
      throw new BadRequestException('Blob storage is not configured');
    }

    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${folder}/${tenantId}/${uuid()}.${fileExtension}`;
    const blobPath = fileName.replace(/\\/g, '/');

    try {
      const response = await put(blobPath, file.buffer, {
        access: 'public',
        contentType: file.mimetype,
        token: vercelBlobToken,
        addRandomSuffix: false,
        cacheControlMaxAge: 31_536_000,
      });

      return {
        url: response.url,
        path: blobPath,
      };
    } catch (error) {
      console.error('Failed to upload file:', {
        error: error?.message,
        stack: error?.stack,
        folder,
        tenantId,
        fileName: file?.originalname,
      });
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }
}

