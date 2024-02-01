import { Injectable, Logger } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { MyConfigService } from '../my-config/my-config.service';
@Injectable()
export class S3Service {
  private readonly S3: S3Client;
  private readonly logger = new Logger(S3Service.name);
  constructor(private readonly configService: MyConfigService) {
    this.S3 = new S3Client({
      apiVersion: 'latest',
      region: this.configService.getAwsRegion(),
      credentials: {
        accessKeyId: this.configService.getAWSSQSAccessID(),
        secretAccessKey: this.configService.getAWSSQSSecretKey(),
      },
    });
  }
}
