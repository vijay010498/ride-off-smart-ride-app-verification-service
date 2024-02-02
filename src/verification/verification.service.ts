import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { VerificationDocument } from './verification.schema';

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
    this.logger.log('startUserVerification', verificationId);
  }
}
