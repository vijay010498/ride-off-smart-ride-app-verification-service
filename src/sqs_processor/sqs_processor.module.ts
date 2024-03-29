import { Module } from '@nestjs/common';
import { SqsProcessorService } from './sqs_processor.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '../user/user.schema';
import { UserTokenBlacklistSchema } from '../user/user-token-blacklist.schema';
import { RekognitionModule } from '../rekognition/rekognition.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      // we are not using userModule to avoid circular dependency -> userModule->VerificationModule->SqsModule->SqsProcessor->UserModule
      {
        name: 'User',
        schema: UserSchema,
      },
      {
        name: 'UserTokenBlacklist',
        schema: UserTokenBlacklistSchema,
      },
    ]),
    RekognitionModule,
  ],
  providers: [SqsProcessorService],
  exports: [SqsProcessorService],
})
export class SqsProcessorModule {}
