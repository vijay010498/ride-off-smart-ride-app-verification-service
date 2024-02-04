import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyConfigService {
  constructor(private readonly configService: ConfigService) {}

  getMongoUri(): string {
    return this.configService.get<string>('MONGODB_URI_VERIFY');
  }

  getMongoDatabase(): string {
    return this.configService.get<string>('MONGO_VERIFY_DATABASE');
  }

  getJwtAccessSecret(): string {
    return this.configService.get<string>('JWT_ACCESS_SECRET');
  }

  getJwtRefreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET');
  }

  getNodeEnv(): string {
    return this.configService.get<string>('NODE_ENV');
  }

  getAWSSQSAccessID(): string {
    return this.configService.get<string>('aws_sqs_access_key_id');
  }

  getAWSSQSSecretKey(): string {
    return this.configService.get<string>('aws_sqs_secret_access_key');
  }

  getAwsRegion(): string {
    return this.configService.get<string>('aws_region');
  }

  getSqsQueueName(): string {
    return this.configService.get<string>('aws_sqs_queue_name');
  }

  getSqsQueueURL(): string {
    return this.configService.get<string>('aws_sqs_queue_url');
  }

  getAWSSNSAccessID(): string {
    return this.configService.get<string>('aws_sns_access_key_id');
  }

  getAWSSNSSecretKey(): string {
    return this.configService.get<string>('aws_sns_secret_access_key');
  }

  getVerifyTopicSNSArn(): string {
    return this.configService.get<string>('VERIFY_TOPIC_SNS_ARN');
  }

  getAWSS3AccessID(): string {
    return this.configService.get<string>('aws_s3_access_key_id');
  }

  getAWSS3SecretKey(): string {
    return this.configService.get<string>('aws_s3_secret_access_key');
  }

  getAWSS3BucketName(): string {
    return this.configService.get<string>('aws_verifiation_s3_bucket');
  }

  getAWSRekognitionAccessID(): string {
    return this.configService.get<string>('aws_rekognition_access_key_id');
  }

  getAWSRekognitionSecretKey(): string {
    return this.configService.get<string>('aws_rekognition_secret_access_key');
  }
}
