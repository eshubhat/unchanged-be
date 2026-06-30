import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageProvider, PresignedUploadResult } from './storage.interface';

/**
 * S3StorageProvider
 * ──────────────────
 * Uses AWS S3 pre-signed PUT URLs so the client uploads directly —
 * file data never passes through this API server.
 *
 * When to use: production, when you need a CDN, public-facing media.
 *
 * Required env vars:
 *   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET
 *
 * Optional:
 *   CDN_BASE_URL  — set to CloudFront URL to serve files via CDN
 */
@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;
  private readonly presignExpiry = 300; // 5 minutes

  constructor(private readonly configService: ConfigService) {
    this.bucket = configService.getOrThrow<string>('AWS_S3_BUCKET');

    const region = configService.getOrThrow<string>('AWS_REGION');

    this.baseUrl = configService.get<string>(
      'CDN_BASE_URL',
      `https://${this.bucket}.s3.${region}.amazonaws.com`,
    );

    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.logger.log(`S3StorageProvider initialized. Bucket: ${this.bucket}`);
  }

  async getPresignedUrl(
    key: string,
    contentType: string,
    fileSizeBytes: number,
  ): Promise<PresignedUploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSizeBytes,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: this.presignExpiry,
    });

    return {
      uploadUrl,
      publicUrl: this.getPublicUrl(key),
      key,
      expiresIn: this.presignExpiry,
      method: 'PUT',
    };
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted S3 object: ${key}`);
  }

  getPublicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
