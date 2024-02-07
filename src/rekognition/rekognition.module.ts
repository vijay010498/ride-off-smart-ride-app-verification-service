import { Module } from '@nestjs/common';
import { RekognitionService } from './rekognition.service';
import { MyConfigModule } from '../my-config/my-config.module';
import { MongooseModule } from '@nestjs/mongoose';
import { VerificationSchema } from '../verification/verification.schema';
import { SnsModule } from '../sns/sns.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    MyConfigModule,
    MongooseModule.forFeature([
      // Not using VerificationModule here oto avoid circular dependency VerificationModule->SqsModule->SqsProcessorModule->RekognitionModule->VerificationModule
      {
        name: 'Verification',
        schema: VerificationSchema,
      },
    ]),
    SnsModule,
    S3Module,
  ],
  providers: [RekognitionService],
  exports: [RekognitionService],
})
export class RekognitionModule {}
