export interface PresignedUploadResult {
  uploadUrl: string;      // URL the client PUTs/POSTs to
  publicUrl: string;      // URL to access the file after upload
  key: string;            // Opaque key stored in DB
  expiresIn: number;      // Seconds until uploadUrl expires (0 = no expiry)
  method: 'PUT' | 'POST'; // HTTP method client should use
}

/**
 * IStorageProvider is the abstraction that UploadsService depends on.
 * Swap implementations by changing STORAGE_DRIVER in .env
 *
 * Drivers:
 *  - 'local'  → saves to ./uploads/, served via /files/* route  (default, free)
 *  - 's3'     → AWS S3 + optional CloudFront CDN                (optional, paid)
 */
export interface IStorageProvider {
  /**
   * Returns a URL that the client uses to upload a file directly
   * (pre-signed S3 PUT, or our own upload endpoint for local).
   */
  getPresignedUrl(
    key: string,
    contentType: string,
    fileSizeBytes: number,
  ): Promise<PresignedUploadResult>;

  /**
   * Delete a file by its key.
   */
  delete(key: string): Promise<void>;

  /**
   * Build the public-facing URL from a stored key.
   */
  getPublicUrl(key: string): string;

  /**
   * Confirm the file actually exists (used after upload).
   */
  exists(key: string): Promise<boolean>;
}

export const STORAGE_PROVIDER = Symbol('IStorageProvider');
