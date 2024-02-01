import { Injectable, Logger } from '@nestjs/common';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { MyConfigService } from '../my-config/my-config.service';

@Injectable()
export class AwsService {
  private readonly logger = new Logger(AwsService.name);
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
}
