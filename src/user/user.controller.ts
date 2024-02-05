import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUserInterceptor } from '../common/interceptors/current-user.interceptor';
import { UserService } from './user.service';
import { AccessTokenGuard } from '../common/guards/accessToken.guard';
import { IsBlockedGuard } from '../common/guards/isBlocked.guard';
import { TokenBlacklistGuard } from '../common/guards/tokenBlacklist.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VerifyUserDto } from './dtos/verify-user.dto';
import { ImageFileFilter } from './ImageFileFilter';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsSignedUpGuard } from '../common/guards/isSignedUp.guard';
import { UserNotVerifiedBeforeAndNotStarted } from '../common/guards/userNotVerifiedAndNotStarted.guard';

interface UploadedFilesDto extends VerifyUserDto {
  selfie: Express.Multer.File[];
  photoId: Express.Multer.File[];
}

@Controller('user')
@UseGuards(AccessTokenGuard, IsBlockedGuard, TokenBlacklistGuard)
@UseInterceptors(CurrentUserInterceptor)
//@Serialize(UserDto)
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @UseGuards(IsSignedUpGuard, UserNotVerifiedBeforeAndNotStarted) // user should be signedUp and should not be verified and Verification should not be started before to request new verification
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: 'selfie',
          maxCount: 1,
        },
        {
          name: 'photoId',
          maxCount: 1,
        },
      ],
      {
        limits: {
          fileSize: 50 * 1024 * 1024, // 50 MB
        },
        fileFilter: new ImageFileFilter().fileFilter.bind(
          new ImageFileFilter(),
        ),
      },
    ),
  )
  async verifyUser(
    @UploadedFiles()
    files: UploadedFilesDto,
    @CurrentUser() user: any,
  ) {
    if (!files || !files.selfie || !files.photoId) {
      throw new BadRequestException(
        'Both selfie and photoId fields are required',
      );
    }
    // TODO add code to make sure photoId is actual PhotoId not just face Photo
    // Only Image upload happens in sync - verification happens in async
    return this.userService.verifyUser(
      user.id,
      files.selfie[0].buffer,
      files.photoId[0].buffer,
    );
  }
}
