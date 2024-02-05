import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import { UserDocument } from './user.schema';
import { UserTokenBlacklistDocument } from './user-token-blacklist.schema';
import { InjectModel } from '@nestjs/mongoose';
import * as Buffer from 'buffer';
import { S3Service } from '../s3/s3.service';
import { VerificationService } from '../verification/verification.service';
import { VerificationStatus } from '../common/enums/verification-status.enum';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel('User') private readonly userCollection: Model<UserDocument>,
    @InjectModel('UserTokenBlacklist')
    private readonly UserTokenBlacklistCollection: Model<UserTokenBlacklistDocument>,
    private readonly s3Service: S3Service,
    private readonly verificationService: VerificationService,
  ) {}

  async findById(id: string) {
    return this.userCollection.findById(id);
  }

  async tokenInBlackList(accessToken: string) {
    return this.UserTokenBlacklistCollection.findOne({
      token: accessToken,
    });
  }

  async verifyUser(userId: string, selfie: Buffer, photoId: Buffer) {
    try {
      // Create Verification ID
      const verificationId = new mongoose.Types.ObjectId();

      // upload selfie Photo and PhotoID
      const [selfieResponse, photoIdResponse] = await Promise.all([
        this.s3Service.uploadUserSelfie(userId, selfie, verificationId),
        this.s3Service.uploadUserPhotoId(userId, photoId, verificationId),
      ]);
      // Step - 2 Save Verification details in verification Collection with Image Urls
      await this.verificationService.createNewVerification(
        userId,
        verificationId,
        selfieResponse.s3URI,
        selfieResponse.imageURL,
        photoIdResponse.s3URI,
        photoIdResponse.imageURL,
      );

      // step-3 send verifyUser Event
      await this.verificationService.sendVerifyUserEvent(verificationId);

      // return response
      return {
        message: 'Verification Started',
        status: VerificationStatus.Started,
      };
    } catch (error) {
      this.logger.error('verifyUser-error', error);
      return new InternalServerErrorException('Server Error, Please try again');
    }
  }
}
