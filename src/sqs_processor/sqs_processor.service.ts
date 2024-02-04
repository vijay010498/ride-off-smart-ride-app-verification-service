import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';

import { Message } from '@aws-sdk/client-sqs';
import { Events } from '../common/enums/events.enums';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from '../user/user.schema';
import { UserTokenBlacklistDocument } from '../user/user-token-blacklist.schema';

@Injectable()
export class SqsProcessorService {
  private readonly logger = new Logger(SqsProcessorService.name);

  constructor(
    @InjectModel('User') private readonly userCollection: Model<UserDocument>,
    @InjectModel('UserTokenBlacklist')
    private readonly UserTokenBlacklistCollection: Model<UserTokenBlacklistDocument>,
  ) {}

  async ProcessSqsMessage(messages: Message[]) {
    // MSG send from SNS
    // {
    //   "Type": "Notification",
    //   "MessageId": "78e129db-1700-5996-bc95-77e8af13e104",
    //    "TopicArn": "arn:aws:sns:ca-central-1:414388150256:AUTH_TOPIC",
    //    "Message": "{\"user\":{\"phoneNumber\":\"437-556-4035\",\"signedUp\":false,\"isBlocked\":false,\"faceIdVerified\":false,\"lastLocation\":{\"type\":\"Point\",\"coordinates\":[0,0]},\"_id\":\"65b9b5d223ea97619d96eecd\",\"createdAt\":\"2024-01-31T02:52:02.186Z\",\"updatedAt\":\"2024-01-31T02:52:02.186Z\",\"__v\":0},\"EVENT_TYPE\":\"USER_CREATED_BY_PHONE\",\"userId\":\"65b9b5d223ea97619d96eecd\"}",
    //   "Timestamp": "2024-01-31T02:52:03.181Z",
    //  "SignatureVersion": "1",
    //  "Signature": "qFnbYt5ekboyJnE/z7qnRhCI69Qty6eOoviZm7wljohOmG/IHI/DAzbaEgye1EgZKsIhfq3comz+gZcpqZEajx5+kpBiikqn2yYcQ0y7toC3yN6biqi+8SVdExsoPtilWMiHs1nPudMaJycCkBrbfdkwKuAndirnJ0buGK3X0w03q+UzHgaZ0oSGyucHRuDrxWgrtQWByAb3QzbYtzr8Tk9b89fFFb683tj96+5Mg9etLk2OYn5P3Xr8t3suDo0XjgvsCHgg85iXaCx+et0FFgh19c3e/I3aN/oOtJPgbtLr78UiIN1pGmnHuHhj4Q2Orp5mtiX/zllFttiXQlw1jg==",
    //   "SigningCertURL": "https://sns.ca-central-1.amazonaws.com/SimpleNotificationService-60eadc530605d63b8e62a523676ef735.pem",
    //   "UnsubscribeURL": "https://sns.ca-central-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:ca-central-1:414388150256:AUTH_TOPIC:3e716bb1-2203-42f3-b5ee-709f7f27f82e"
    //  }

    // MSG send by SQS itself - see sqs.service.ts - _sendMessageToQueue
    //  [
    //   {
    //       "Body": "{\"verificationId\":\"65bf79e5be3e93bcf3619176\",\"EVENT_TYPE\":\"VERIFY_USER\"}",
    //       "MD5OfBody": "acc487ccc75b2c30db363a9922a53c85",
    //       "MessageId": "c926b139-0dfd-4090-ab14-ed91b3613876",
    //       "ReceiptHandle": "AQEBwX/oYCl5joawrsI6MKIsxLCY6NxlAu8fjA4PqRUbarpS8qfq0quC0qrCaaQroF8ZISpbKpQzLcFfv7IEwqe8AoWYZ6WjxlO93bir/pvrx5tiDhOhvoU48bPkcCsgEJbx5gFNTcEaox+/1NG0pPUwZq8fwkjSk44FQKvc8TsmR7XxCR9kKCq1iRCeukKLajvGlJYSNlsXxDzZYpP2vPXeRfnM89hpE5abL5QEWoq0oDgJO1mlZzVOfYtyKAI9ZkAMiV151yn9wewGR1yPNU4zUQg4fw+iZZJDWoSGz9fP9GSjvpT9FbOkUmfdsjb9d0MmYAsdkJN3eyXQBqf8ZFyVLQk5+izlrEc64syuWjT96teezE4tVrKNfeum0ljFJ4KgyB4dHeWUOfE+1SX55Qpe9w=="
    //      }
    // ]

    this.logger.log('receivedMessages', messages);
    try {
      await Promise.all(
        messages.map(({ Body }) => {
          try {
            const parsedBody = JSON.parse(Body);
            if (parsedBody.Message) {
              // Message sent by SNS
              const parsedMessage = JSON.parse(parsedBody.Message);
              if (parsedMessage['EVENT_TYPE']) {
                return this._handleMessageEventsSentBySNS(parsedMessage);
              }
            } else {
              // Message sent by Queue itself
              if (parsedBody['EVENT_TYPE'])
                return this._handleMessageEventsSentBySqs(parsedBody);
            }
          } catch (error) {
            this.logger.error('Error Parsing SQS message:', error);
          }
        }),
      );
    } catch (error) {
      this.logger.error('Error processing SQS messages:', error);
      throw error;
    }
  }

  private async _handleMessageEventsSentBySqs(parsedBody: any) {
    const { EVENT_TYPE, verificationId } = parsedBody;
    this.logger.log(
      '_handleMessageEventsSentBySqs',
      EVENT_TYPE,
      verificationId,
    );
    switch (EVENT_TYPE) {
      case Events.verifyUser:
        return this._handleVerifyUser(verificationId);
      default:
        this.logger.warn(`Unhandled event type: ${EVENT_TYPE}`);
        break;
    }
  }

  private async _handleMessageEventsSentBySNS(parsedMessage: any) {
    const { EVENT_TYPE, user, userId, token, updatedUser } = parsedMessage;
    this.logger.log(
      '_handleMessageEventsSentBySNS',
      EVENT_TYPE,
      user,
      userId,
      token,
      updatedUser,
    );
    switch (EVENT_TYPE) {
      case Events.userCreatedByPhone:
        return this._handleUserCreationByPhone(user, userId);
      case Events.tokenBlackList:
        return this._handleTokenBlackListEvent(token);
      case Events.userUpdated:
        return this._handleUserUpdatedEvent(updatedUser, userId);
      default:
        this.logger.warn(`Unhandled event type: ${EVENT_TYPE}`);
        break;
    }
  }

  private async _handleUserCreationByPhone(
    receivedUserObject: any,
    userId: string,
  ) {
    try {
      // check if user already exists
      const existingUser = await this.userCollection.findById(userId);
      if (existingUser) throw new Error('User With Given Id already exists');
      const user = new this.userCollection({ ...receivedUserObject });
      await user.save();

      return user;
    } catch (error) {
      this.logger.error('_handleUserCreationByPhone-error', error);
      throw error;
    }
  }

  private async _handleTokenBlackListEvent(token: string) {
    try {
      const blackListToken = new this.UserTokenBlacklistCollection({
        token,
      });
      await blackListToken.save();
    } catch (error) {
      this.logger.error('_handleTokenBlackListEvent - error', error);
      throw error;
    }
  }

  private async _handleUserUpdatedEvent(updatedUser: any, userId: string) {
    try {
      await this.userCollection
        .findByIdAndUpdate(userId, updatedUser, { new: true })
        .exec();
    } catch (error) {
      this.logger.error('Error handleUserUpdatedEvent', error);
      throw error;
    }
  }

  private async _handleVerifyUser(verificationId: string) {
    this.logger.log('_handleVerifyUser', verificationId);
  }
}
