import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserService } from '../../user/user.service';

@Injectable()
export class TokenBlacklistGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}
  async canActivate(context: ExecutionContext) {
    try {
      const request = context.switchToHttp().getRequest();
      const accessToken = request.user?.accessToken;

      if (!accessToken) return false;

      const tokenInBlackList =
        await this.userService.tokenInBlackList(accessToken);

      if (tokenInBlackList) return false;
      return true;
    } catch (error) {
      console.error('Error in TokenBlacklistGuard:', error);
      return false;
    }
  }
}
