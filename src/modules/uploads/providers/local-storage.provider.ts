import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageProvider, PresignedUploadResult } from './storage.interface';

/**
 * LocalStorageProvider
 * ─────────────────────
 * Stores files on the local filesystem under ./uploads/<key>.
 * Files are served back through the /files/* static route built into
 * UploadsController — no external dependency required.
 *
 * When to use: development, self-hosted servers, budget deployments.
 *
 * Upload flow (local):
 *   1. Client calls POST /api/v1/uploads/presign → gets { uploadUrl, key }
 *   2. Client POSTs the file to uploadUrl  (our own API endpoint)
 *   3. UploadsController.receiveFile() saves it to disk
 *   4. Client stores publicUrl in DB via product/avatar update calls
 */
@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir: string;
  private readonly appBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = configService.get<string>('LOCAL_UPLOAD_DIR', './uploads');
    this.appBaseUrl = configService.get<string>(
      'APP_BASE_URL',
      'http://localhost:3000',
    );

    // Ensure upload directory exists on startup
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  async getPresignedUrl(
    key: string,
    contentType: string,
    _fileSizeBytes: number,
  ): Promise<PresignedUploadResult> {
    // The "pre-signed" URL is simply our own upload endpoint.
    // The client POSTs the raw file body to this URL.
    const uploadUrl = `${this.appBaseUrl}/api/v1/uploads/receive?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`;

    return {
      uploadUrl,
      publicUrl: this.getPublicUrl(key),
      key,
      expiresIn: 0,     // no expiry for local uploads
      method: 'POST',
    };
  }

  /**
   * Called by UploadsController.receiveFile() — the actual file save.
   */
  async saveFile(key: string, buffer: Buffer): Promise<void> {
    const fullPath = this.getFullPath(key);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, buffer);
    this.logger.log(`Saved file: ${fullPath}`);
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`Deleted file: ${fullPath}`);
    }
  }

  getPublicUrl(key: string): string {
    return `${this.appBaseUrl}/api/v1/uploads/files/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(this.getFullPath(key));
  }

  getFullPath(key: string): string {
    // Sanitize to prevent path traversal attacks
    const sanitized = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.uploadDir, sanitized);
  }
}
