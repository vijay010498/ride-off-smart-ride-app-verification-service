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

interface UploadedFilesDto extends VerifyUserDto {
  selfie: Express.Multer.File[];
  photoId: Express.Multer.File[];
}

@Controller('user')
@UseInterceptors(CurrentUserInterceptor)
//@Serialize(UserDto)
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @UseGuards(AccessTokenGuard, IsBlockedGuard, TokenBlacklistGuard)
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
  verifyUser(
    @UploadedFiles()
    files: UploadedFilesDto,
  ) {
    try {
      if (!files || !files.selfie || !files.photoId) {
        throw new Error('Both selfie and photoId fields are required');
      }
      return files;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
