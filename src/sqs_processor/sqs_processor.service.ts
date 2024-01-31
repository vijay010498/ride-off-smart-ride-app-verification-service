import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';

import { Message } from '@aws-sdk/client-sqs';
import { Events } from './events.enums';

@Injectable()
export class SqsProcessorService {
  private readonly logger = new Logger(SqsProcessorService.name);

  constructor(private readonly userService: UserService) {}

  async ProcessSqsMessage(messages: Message[]) {
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

    try {
      await Promise.all(
        messages.map(({ Body }) => {
          try {
            const parsedBody = JSON.parse(Body);
            const parsedMessage = JSON.parse(parsedBody.Message);
            if (parsedMessage['EVENT_TYPE']) {
              const { EVENT_TYPE, user, userId, token, updatedUser } =
                parsedMessage;
              this.logger.log(EVENT_TYPE, user, userId, token, updatedUser);
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
          } catch (error) {
            this.logger.error('Error processing SQS message:', error);
          }
        }),
      );
    } catch (error) {
      this.logger.error('Error processing SQS messages:', error);
    }
  }

  private async _handleUserCreationByPhone(user: any, userId: string) {
    try {
      await this.userService.createUserByPhone(user, userId);
    } catch (error) {
      this.logger.error('Error creating user by phone:', error);
      throw error;
    }
  }

  private async _handleTokenBlackListEvent(token: string) {
    try {
      await this.userService.addTokenInBlackList(token);
    } catch (error) {
      this.logger.error('Error handleTokenBlackListEvent', error);
      throw error;
    }
  }

  private async _handleUserUpdatedEvent(updatedUser: any, userId: string) {
    try {
      await this.userService.updateUser(userId, updatedUser);
    } catch (error) {
      this.logger.error('Error handleUserUpdatedEvent', error);
      throw error;
    }
  }
}
