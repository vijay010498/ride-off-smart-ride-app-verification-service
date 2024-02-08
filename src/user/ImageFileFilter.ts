import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { FileFilterCallback } from 'multer';

export class ImageFileFilter {
  private readonly allowedExtensions = ['.jpg', '.jpeg'];

  fileFilter(req: any, file: any, callback: FileFilterCallback): void {
    const ext = extname(file.originalname);
    if (!this.isValidExtension(ext)) {
      callback(
        new BadRequestException(
          `Only ${this.allowedExtensions.join(', ')} files are allowed`,
        ),
      );
    } else {
      callback(null, true);
    }
  }

  private isValidExtension(ext: string): boolean {
    return this.allowedExtensions.includes(ext.toLowerCase());
  }
}
