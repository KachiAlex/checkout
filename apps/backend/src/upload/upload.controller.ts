import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type UploadRequest = Request & {
  user?: { tenantId?: string };
  body?: {
    folder?: string;
    tenantId?: string;
    [key: string]: unknown;
  };
};

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get()
  @ApiOperation({ summary: 'Check if upload endpoint is available' })
  @ApiResponse({ status: 200, description: 'Upload endpoint is available' })
  check() {
    return { status: 'ok', message: 'Upload endpoint is available' };
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a file (image) to Firebase Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          example: 'logos',
        },
        tenantId: {
          type: 'string',
          example: 'tenant-123',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or request' })
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: UploadRequest) {
    // With multipart/form-data, body fields are parsed by multer and available in req.body
    const folder = req.body?.folder;
    const tenantId = req.body?.tenantId;

    console.log('[UploadController] Upload request received:', {
      hasFile: !!file,
      fileName: file?.originalname,
      fileSize: file?.size,
      fileMimetype: file?.mimetype,
      folder,
      tenantId,
      bodyFields: Object.keys(req.body || {}),
      userTenantId: req.user?.tenantId,
    });

    if (!file) {
      console.error('[UploadController] No file provided in request');
      throw new BadRequestException('No file provided');
    }

    // Use tenantId from JWT if not provided in body
    const effectiveTenantId = tenantId || req.user?.tenantId;

    if (!effectiveTenantId) {
      console.error('[UploadController] No tenant ID available:', {
        tenantId,
        userTenantId: req.user?.tenantId,
      });
      throw new BadRequestException('Tenant ID is required');
    }

    // Default folder to 'uploads' if not provided
    const effectiveFolder = folder || 'uploads';

    return this.uploadService.uploadFile(file, effectiveFolder, effectiveTenantId);
  }
}
