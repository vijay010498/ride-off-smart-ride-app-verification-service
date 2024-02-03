import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { VerificationDocument } from './verification.schema';
import { VerificationStatus } from '../common/enums/verification-status.enum';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  constructor(
    @InjectModel('Verification')
    private readonly verificationCollection: Model<VerificationDocument>,
  ) {}

  async createNewVerification(
    userId: string,
    verificationId: mongoose.Types.ObjectId,
    selfieS3URI: string,
    selfieObjectURL: string,
    photoIdS3URI: string,
    photoIdObjectURL: string,
  ) {
    // verification status is default to started - check schema
    const verification = new this.verificationCollection({
      _id: verificationId,
      userId,
      selfieS3URI,
      selfieObjectURL,
      photoIdS3URI,
      photoIdObjectURL,
    });
    return verification.save();
  }

  async startUserVerification(verificationId: mongoose.Types.ObjectId) {
    // TODO Implement Verification Logic
    this.logger.log('startUserVerification', verificationId);
  }

  async isUserVerifiedOrStarted(userId: string) {
    const userVerifiedOrStarted = await this.verificationCollection.findOne({
      userId,
      status: {
        $in: [VerificationStatus.Verified, VerificationStatus.Started],
      },
    });
    if (userVerifiedOrStarted) return true;
    return false;
  }
}
