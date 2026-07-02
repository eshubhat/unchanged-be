import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  IStorageProvider,
  STORAGE_PROVIDER,
  PresignedUploadResult,
} from './providers/storage.interface';

export type UploadFolder = 'products' | 'avatars' | 'returns' | 'banners' | 'brands';

const ALLOWED_MIME_TYPES: Record<UploadFolder, string[]> = {
  products: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
  avatars:  ['image/jpeg', 'image/png', 'image/webp'],
  returns:  ['image/jpeg', 'image/png'],
  banners:  ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  brands:   ['image/jpeg', 'image/png', 'image/svg+xml'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
    private readonly configService: ConfigService,
  ) {
    const driver = configService.get<string>('STORAGE_DRIVER', 'local');
    this.logger.log(`Storage driver: ${driver.toUpperCase()}`);
  }

  // ─── Presign ─────────────────────────────────────────────────────────────

  async getPresignedUrl(
    folder: UploadFolder,
    contentType: string,
    fileSizeBytes: number,
    userId: string,
  ): Promise<PresignedUploadResult> {
    // Validate MIME type
    const allowed = ALLOWED_MIME_TYPES[folder];
    if (!allowed.includes(contentType)) {
      throw new BadRequestException(
        `File type '${contentType}' is not allowed for '${folder}'. ` +
          `Allowed: ${allowed.join(', ')}`,
      );
    }

    // Validate file size
    if (fileSizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds the ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      );
    }

    // Build a unique object key
    const ext = this.mimeToExt(contentType);
    const userPath = userId ? `${userId}/` : '';
    const key = `${folder}/${userPath}${uuidv4()}.${ext}`;

    return this.storage.getPresignedUrl(key, contentType, fileSizeBytes);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async deleteFile(key: string): Promise<void> {
    const exists = await this.storage.exists(key);
    if (!exists) throw new NotFoundException(`File '${key}' not found`);
    await this.storage.delete(key);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  getPublicUrl(key: string): string {
    return this.storage.getPublicUrl(key);
  }

  async confirmUpload(key: string): Promise<boolean> {
    return this.storage.exists(key);
  }

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg':    'jpg',
      'image/png':     'png',
      'image/webp':    'webp',
      'image/svg+xml': 'svg',
      'video/mp4':     'mp4',
    };
    return map[mime] ?? 'bin';
  }
}
