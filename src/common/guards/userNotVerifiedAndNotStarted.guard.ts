import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { VerificationService } from '../../verification/verification.service';

@Injectable()
export class UserNotVerifiedBeforeAndNotStarted implements CanActivate {
  private readonly logger = new Logger(UserNotVerifiedBeforeAndNotStarted.name);
  constructor(private readonly verificationService: VerificationService) {}

  async canActivate(context: ExecutionContext) {
    try {
      const request = context.switchToHttp().getRequest();
      const userId = request.user?.sub;

      if (!userId) return false;

      const userVerifiedOrStarted =
        await this.verificationService.isUserVerifiedOrStarted(userId);
      if (!userVerifiedOrStarted) return true;
      throw new BadRequestException(
        'User Already Verified / Verification In-Progress',
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Error in UserNotVerifiedBeforeGuard', error);
      return false;
    }
  }
}
