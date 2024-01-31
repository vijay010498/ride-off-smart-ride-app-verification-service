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
}
