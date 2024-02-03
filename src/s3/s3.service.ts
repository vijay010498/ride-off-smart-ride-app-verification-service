import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MyConfigService } from '../my-config/my-config.service';
import * as Buffer from 'buffer';
import mongoose from 'mongoose';
@Injectable()
export class S3Service {
  private readonly S3: S3Client;
  private readonly logger = new Logger(S3Service.name);
  constructor(private readonly configService: MyConfigService) {
    this.S3 = new S3Client({
      apiVersion: 'latest',
      region: this.configService.getAwsRegion(),
      credentials: {
        accessKeyId: this.configService.getAWSS3AccessID(),
        secretAccessKey: this.configService.getAWSS3SecretKey(),
      },
    });
  }

  private async _uploadFile(key: string, fileContent: Buffer) {
    try {
      const uploadCommand = new PutObjectCommand({
        Bucket: this.configService.getAWSS3BucketName(),
        Key: key,
        Body: fileContent,
      });
      await this.S3.send(uploadCommand);
      const s3URI = `s3://${this.configService.getAWSS3BucketName()}/${key}`;
      const objectURL = `https://${this.configService.getAWSS3BucketName()}.s3.${this.configService.getAwsRegion()}.amazonaws.com/${key}`;
      this.logger.log(
        `File uploaded to s3 URI: ${s3URI} , Object URL: ${objectURL}`,
      );

      return {
        s3URI,
        imageURL: objectURL,
      };
    } catch (error) {
      this.logger.error(`Error uploading file to S3`, error);
      throw error;
    }
  }
  uploadUserSelfie(
    userId: string,
    selfieImage: Buffer,
    verificationId: mongoose.Types.ObjectId,
  ) {
    const selfieKey = `${userId}/verification/${verificationId}/images/selfie.jpg`;
    return this._uploadFile(selfieKey, selfieImage);
  }

  uploadUserPhotoId(
    userId: string,
    photoIdImage: Buffer,
    verificationId: mongoose.Types.ObjectId,
  ) {
    const selfieKey = `${userId}/verification/${verificationId}/images/photoId.jpg`;
    return this._uploadFile(selfieKey, photoIdImage);
  }
}
