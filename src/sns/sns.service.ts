import { Injectable, Logger } from '@nestjs/common';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { MyConfigService } from '../my-config/my-config.service';
import mongoose from 'mongoose';
import { Events } from '../common/enums/events.enums';

@Injectable()
export class SnsService {
  private readonly logger = new Logger(SnsService.name);
  private readonly SNS: SNSClient;

  constructor(private readonly configService: MyConfigService) {
    this.SNS = new SNSClient({
      apiVersion: 'latest',
      region: this.configService.getAwsRegion(),
      credentials: {
        accessKeyId: this.configService.getAWSSNSAccessID(),
        secretAccessKey: this.configService.getAWSSNSSecretKey(),
      },
    });
  }

  private async _publishToVerifyTopicARN(Message: string) {
    try {
      const messageParams = {
        Message,
        TopicArn: this.configService.getVerifyTopicSNSArn(),
      };

      const { MessageId } = await this.SNS.send(
        new PublishCommand(messageParams),
      );
      this.logger.log('_publishToVerifyTopicARN-success', MessageId);
    } catch (_publishToVerifyTopicARNError) {
      this.logger.error(
        'publishToVerifyTopicARN',
        _publishToVerifyTopicARNError,
      );
    }
  }

  async publishUserFaceVerifiedEvent(
    userId: mongoose.Types.ObjectId,
    verificationId: mongoose.Types.ObjectId,
  ) {
    const snsMessage = {
      userId,
      verificationId,
      EVENT_TYPE: Events.userFaceVerified,
    };
    // {"userId": "65b84dffb9fe51e7778da", "verificationId": "65b84dffb9fe51e777asds", "EVENT_TYPE":"VERIFY_USER_FACE_VERIFIED"}
    return this._publishToVerifyTopicARN(JSON.stringify(snsMessage));
  }
}
