import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyConfigService {
  constructor(private readonly configService: ConfigService) {}

  getMongoUri(): string {
    const URI = this.configService.get<string>('MONGODB_URI_VERIFY');
    console.log('getMongoUri', URI);
    return URI;
  }
}
