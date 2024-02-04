import { Module } from '@nestjs/common';
import { RekognitionService } from './rekognition.service';
import { MyConfigModule } from '../my-config/my-config.module';
import { MongooseModule } from '@nestjs/mongoose';
import { VerificationSchema } from '../verification/verification.schema';
import { SnsModule } from '../sns/sns.module';

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
  ],
  providers: [RekognitionService],
  exports: [RekognitionService],
})
export class RekognitionModule {}
