import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserService } from '../../user/user.service';

@Injectable()
export class IsBlockedGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext) {
    try {
      const request = context.switchToHttp().getRequest();
      const userId = request.user?.sub;

      if (!userId) return false;

      const user = await this.userService.findById(userId);

      return user && !user.isBlocked;
    } catch (error) {
      console.error('Error in IsBlockedGuard:', error);
      return false;
    }
  }
}
