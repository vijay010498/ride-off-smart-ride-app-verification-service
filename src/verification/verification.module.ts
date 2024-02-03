import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { MongooseModule } from '@nestjs/mongoose';
import { VerificationSchema } from './verification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Verification',
        schema: VerificationSchema,
      },
    ]),
  ],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
