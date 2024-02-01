import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { MyConfigModule } from '../my-config/my-config.module';

@Module({
  imports: [MyConfigModule],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
