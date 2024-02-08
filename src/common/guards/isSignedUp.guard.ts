import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { UserService } from '../../user/user.service';
@Injectable()
export class IsSignedUpGuard implements CanActivate {
  private readonly logger = new Logger(IsSignedUpGuard.name);
  constructor(private readonly userService: UserService) {}
  async canActivate(context: ExecutionContext) {
    try {
      const request = context.switchToHttp().getRequest();
      const userId = request.user?.sub;

      if (!userId) return false;

      const user = await this.userService.findById(userId);

      if (user && user.signedUp) {
        return true;
      }
      throw new BadRequestException('User Should be SignedUp to get Verified');
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Error in IsSignedUpGuard:', error);
      return false;
    }
  }
}
