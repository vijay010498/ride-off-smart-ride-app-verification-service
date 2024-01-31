import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MyConfigService } from '../my-config/my-config.service';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';

@Injectable()
export class SqsService implements OnModuleInit {
  private readonly SQS: SQSClient;
  private readonly logger = new Logger(SqsService.name);
  constructor(private readonly configService: MyConfigService) {
    this.SQS = new SQSClient({
      apiVersion: 'latest',
      region: this.configService.getAwsRegion(),
      credentials: {
        accessKeyId: this.configService.getAWSSQSAccessID(),
        secretAccessKey: this.configService.getAWSSQSSecretKey(),
      },
    });
  }
  async onModuleInit() {
    this.startPolling();
  }

  private async startPolling() {
    try {
      await this._pollMessages();
    } catch (error) {
      this.logger.error('Error occurred during polling:', error);
      // Handle error (e.g., retry or exit)
    }
  }

  private async _pollMessages() {
    console.log('started-polling');

    // Define the function to execute for polling
    const pollFunction = async () => {
      console.log('inside-poll-func');
      try {
        const messages = await this.receiveMessages(
          this.configService.getSqsQueueURL(),
        );
        if (messages.length > 0) {
          // Process received messages
          console.log('Received messages:', messages);
          // await this.deleteMessages(messages);
        }
      } catch (error) {
        this.logger.error('Error occurred during polling:', error);
      }
    };

    // Poll immediately and then every 10 seconds
    pollFunction(); // Poll immediately
    setInterval(pollFunction, 10000); // Poll every 10 seconds
  }

  private async receiveMessages(queueUrl: string, maxMessages: number = 10) {
    try {
      const sqsConsumeCommand = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxMessages,
        //his parameter specifies the duration (in seconds) for which the call waits for a message to arrive in the queue before returning. 20 seconds, which means if there are no messages available in the queue, the call will wait up to 20 seconds for messages to arrive before returning an empty response. This helps reduce the number of empty responses and can improve efficiency.
        WaitTimeSeconds: 20,
        // This parameter specifies the duration (in seconds) that the received messages are hidden from subsequent retrieval requests. 5 seconds, which means once a message is received, it will be hidden from other consumers for 5 seconds. This prevents other consumers from processing the same message simultaneously, ensuring that each message is processed by only one consumer.
        VisibilityTimeout: 5,
        MessageAttributeNames: ['All'],
      });
      const { Messages } = await this.SQS.send(sqsConsumeCommand);
      return Messages ? Messages : [];
    } catch (receiveMessagesError) {
      this.logger.error('receiveMessagesError', receiveMessagesError);
      throw receiveMessagesError;
    }
  }

  private async deleteMessages(messages: any[]) {
    try {
      const deleteCommands = messages.map((message) => ({
        QueueUrl: this.configService.getSqsQueueURL(),
        ReceiptHandle: message.ReceiptHandle,
      }));
      for (const command of deleteCommands) {
        await this.SQS.send(new DeleteMessageCommand(command));
      }
    } catch (error) {
      console.error('Error deleting messages from SQS:', error);
      throw error;
    }
  }
}
