import { Module } from '@nestjs/common';
import { SqsService } from './sqs.service';
import { MyConfigModule } from '../my-config/my-config.module';

@Module({
  imports: [MyConfigModule],
  providers: [SqsService],
})
export class SqsModule {}
