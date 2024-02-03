import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './user.schema';
import { UserTokenBlacklistSchema } from './user-token-blacklist.schema';
import { S3Module } from '../s3/s3.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'User',
        schema: UserSchema,
      },
      {
        name: 'UserTokenBlacklist',
        schema: UserTokenBlacklistSchema,
      },
    ]),
    S3Module,
    VerificationModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
