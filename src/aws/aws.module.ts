import { Module } from '@nestjs/common';
import { AwsService } from './aws.service';
import { MyConfigModule } from '../my-config/my-config.module';

@Module({
  imports: [MyConfigModule],
  providers: [AwsService],
  exports: [AwsService],
})
export class AwsModule {}
