import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { MongooseModule } from '@nestjs/mongoose';
import { VerificationSchema } from './verification.schema';
import { SqsModule } from '../sqs/sqs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Verification',
        schema: VerificationSchema,
      },
    ]),
    SqsModule,
  ],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
