import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { VerificationDocument } from './verification.schema';
import { VerificationStatus } from '../common/enums/verification-status.enum';
import { SqsService } from '../sqs/sqs.service';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  constructor(
    @InjectModel('Verification')
    private readonly verificationCollection: Model<VerificationDocument>,
    private readonly sqsService: SqsService,
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

  async sendVerifyUserEvent(verificationId: mongoose.Types.ObjectId) {
    try {
      await this.sqsService.verifyUserEvent(verificationId);
    } catch (error) {
      // code to update user verification status to failed - if any error in publishing sqs event
      await this.verificationCollection.findByIdAndUpdate(
        verificationId,
        {
          status: VerificationStatus.Failed,
          verificationFailedReason: 'Server Error',
        },
        { new: true },
      );
      throw error;
    }
  }

  async isUserVerifiedOrStarted(userId: string) {
    const userVerifiedOrStarted = await this.verificationCollection.findOne({
      userId,
      status: {
        $in: [VerificationStatus.Verified, VerificationStatus.Started],
      },
    });
    if (userVerifiedOrStarted) {
      return {
        status: userVerifiedOrStarted.status,
      };
    }
    return false;
  }
}
