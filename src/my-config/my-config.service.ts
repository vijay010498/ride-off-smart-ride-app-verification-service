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

  getAWSSNSAccessID(): string {
    return this.configService.get<string>('aws_sns_access_key_id');
  }

  getAWSSNSSecretKey(): string {
    return this.configService.get<string>('aws_sns_secret_access_key');
  }
}
