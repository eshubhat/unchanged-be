import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { STORAGE_PROVIDER } from './providers/storage.interface';

@Module({
  imports: [
    ConfigModule,
    // Use memory storage so we can save files programmatically in local mode
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [UploadsController],
  providers: [
    UploadsService,

    // ── Storage Provider Factory ──────────────────────────────────────────
    // Reads STORAGE_DRIVER from .env and binds the correct implementation.
    // No other code changes are needed to switch between local and S3.
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const driver = configService.get<string>('STORAGE_DRIVER', 'local');

        if (driver === 's3') {
          const requiredKeys = [
            'AWS_REGION',
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_S3_BUCKET',
          ];

          const missing = requiredKeys.filter((k) => !configService.get(k));
          if (missing.length > 0) {
            throw new Error(
              `STORAGE_DRIVER=s3 requires these env vars: ${missing.join(', ')}`,
            );
          }

          return new S3StorageProvider(configService);
        }

        // Default: local
        return new LocalStorageProvider(configService);
      },
    },

    // Make LocalStorageProvider available for injection in controller
    // (needed for saveFile() and getFullPath() which are local-only methods)
    LocalStorageProvider,
  ],
  exports: [UploadsService, STORAGE_PROVIDER],
})
export class UploadsModule {}
