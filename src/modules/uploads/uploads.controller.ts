import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UploadsService, UploadFolder } from './uploads.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { STORAGE_PROVIDER } from './providers/storage.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../../common/enums';
import { ConfigService } from '@nestjs/config';

class PresignRequestDto {
  @ApiProperty({ enum: ['products', 'avatars', 'returns', 'banners', 'brands'] })
  @IsEnum(['products', 'avatars', 'returns', 'banners', 'brands'])
  folder: UploadFolder;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  contentType: string;

  @ApiProperty({ example: 2097152, description: 'File size in bytes (max 10MB)' })
  @IsNumber()
  @Min(1)
  @Max(10 * 1024 * 1024)
  fileSizeBytes: number;
}

@ApiTags('Uploads')
@Controller({ path: 'uploads', version: '1' })
export class UploadsController {
  private readonly storageDriver: string;

  constructor(
    private readonly uploadsService: UploadsService,
    private readonly configService: ConfigService,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: any,
  ) {
    this.storageDriver = configService.get<string>('STORAGE_DRIVER', 'local');
  }

  // ─── Step 1: Get Upload URL ────────────────────────────────────────────────

  @Public()
  @ApiBearerAuth()
  @Post('presign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a URL to upload a file',
    description:
      '**local driver**: Returns uploadUrl pointing to POST /uploads/receive (use FormData).\n' +
      '**s3 driver**: Returns a pre-signed S3 PUT URL — PUT file body directly.',
  })
  async getPresignedUrl(
    @Body() dto: PresignRequestDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.uploadsService.getPresignedUrl(
      dto.folder,
      dto.contentType,
      dto.fileSizeBytes,
      userId,
    );
  }

  // ─── Step 2 (local only): Receive uploaded file ────────────────────────────

  /**
   * This endpoint is ONLY used by the local storage driver.
   * With S3, the client uploads directly to S3 — this route is never hit.
   *
   * The client sends a multipart/form-data POST with field name "file".
   */
  @Public()
  @Post('receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive a file upload (local driver only)',
    description: 'Only active when STORAGE_DRIVER=local. Used by the client after getting presign URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async receiveFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('key') key: string,
  ) {
    if (this.storageDriver !== 'local') {
      throw new BadRequestException(
        'This endpoint is only available when STORAGE_DRIVER=local. ' +
          'With S3, upload directly to the presigned URL.',
      );
    }

    if (!file) {
      throw new BadRequestException('No file provided. Use multipart/form-data with field name "file".');
    }

    if (!key) {
      throw new BadRequestException('Query param "key" is required.');
    }

    const localProvider = this.storageProvider as LocalStorageProvider;
    await localProvider.saveFile(key, file.buffer);

    return {
      key,
      publicUrl: this.uploadsService.getPublicUrl(key),
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  // ─── Serve static files (local driver only) ────────────────────────────────

  /**
   * Serves uploaded files stored on disk.
   * Path traversal is prevented in LocalStorageProvider.getFullPath().
   */
  @Public()
  @Get('files/*')
  @ApiOperation({
    summary: 'Serve a stored file (local driver only)',
    description: 'Not needed with S3 — files are served directly from S3/CloudFront.',
  })
  async serveFile(@Param('0') filePath: string, @Res() res: Response) {
    if (this.storageDriver !== 'local') {
      throw new NotFoundException('File serving is handled by CDN in non-local mode');
    }

    const localProvider = this.storageProvider as LocalStorageProvider;
    const fullPath = localProvider.getFullPath(filePath);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File not found');
    }

    const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
    const stat = fs.statSync(fullPath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    res.setHeader('ETag', `"${stat.mtime.getTime()}-${stat.size}"`);

    fs.createReadStream(fullPath).pipe(res);
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  @Public()
  @ApiBearerAuth()
  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin: Delete a stored file by key' })
  @ApiParam({ name: 'key', description: 'File key returned by presign' })
  async deleteFile(@Param('key') key: string) {
    await this.uploadsService.deleteFile(decodeURIComponent(key));
  }

  // ─── Confirm upload (optional, call after upload completes) ───────────────

  @Public()
  @ApiBearerAuth()
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a file was uploaded successfully' })
  async confirmUpload(@Body('key') key: string) {
    if (!key) throw new BadRequestException('key is required');
    const exists = await this.uploadsService.confirmUpload(key);
    return { key, exists, publicUrl: exists ? this.uploadsService.getPublicUrl(key) : null };
  }
}
