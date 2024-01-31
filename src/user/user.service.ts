import { Injectable, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { UserDocument } from './user.schema';
import { UserTokenBlacklistDocument } from './user-token-blacklist.schema';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel('User') private readonly userCollection: Model<UserDocument>,
    @InjectModel('UserTokenBlacklist')
    private readonly UserTokenBlacklistCollection: Model<UserTokenBlacklistDocument>,
  ) {}

  async getUserByPhone(phoneNumber: string) {
    const user = await this.userCollection.findOne({
      phoneNumber,
    });
    return user;
  }

  // TODO use the ID given from Auth service
  async createUserByPhone(phoneNumber: string, userId: string) {
    try {
      const user = new this.userCollection({ phoneNumber });
      await user.save(); // user is saved into DB by phoneNumber

      return user;
    } catch (createUserByPhone) {
      this.logger.error('Error in Creating User By phone', createUserByPhone);
    }
  }

  async findById(id: string) {
    return this.userCollection.findById(id);
  }

  private async _update(id: string, updateUserDto: any) {
    return this.userCollection
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
  }

  async tokenInBlackList(accessToken: string) {
    return this.UserTokenBlacklistCollection.findOne({
      token: accessToken,
    });
  }

  async updateUser(userId: string, updateDto: any) {
    return this._update(userId, updateDto);
  }
}
