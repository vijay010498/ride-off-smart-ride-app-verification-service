import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MyConfigService } from '../my-config/my-config.service';
import * as Buffer from 'buffer';
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
      this.logger.log(
        `File uploaded to S3: s3://${this.configService.getAWSS3BucketName()}/${key}`,
      );
    } catch (error) {
      this.logger.error(
        `Error uploading file to S3: s3://${this.configService.getAWSS3BucketName()}/${key}`,
        error,
      );
      // TODO throw error
    }
  }
  uploadUserSelfie(userId: string, image: Buffer) {
    const selfieKey = `${userId}/verification/images/selfie.jpg`;
    return this._uploadFile(selfieKey, image);
  }
}
