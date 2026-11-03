import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

import type { AppEnv } from '../config/env.validation';

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService<AppEnv, true>) {
    if (this.isConfigured()) {
      cloudinary.config({
        cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true }),
        api_key: this.config.get('CLOUDINARY_API_KEY', { infer: true }),
        api_secret: this.config.get('CLOUDINARY_API_SECRET', { infer: true }),
        secure: true,
      });
    }
  }

  isConfigured() {
    return Boolean(
      this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true }) &&
        this.config.get('CLOUDINARY_API_KEY', { infer: true }) &&
        this.config.get('CLOUDINARY_API_SECRET', { infer: true }),
    );
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Document uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }
  }

  uploadBuffer(buffer: Buffer, options: { folder: string; filename: string; mimeType: string }) {
    this.assertConfigured();
    const resourceType = options.mimeType.startsWith('image/') ? 'image' : 'raw';

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: resourceType,
          public_id: options.filename.replace(/\.[^.]+$/, ''),
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });
  }

  async destroy(publicId: string, mimeType: string) {
    this.assertConfigured();
    const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }
}
