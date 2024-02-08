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
import { ImageFileFilter } from './ImageFileFilter';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsSignedUpGuard } from '../common/guards/isSignedUp.guard';
import { UserNotVerifiedBeforeAndNotStarted } from '../common/guards/userNotVerifiedAndNotStarted.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { VerifyUserResponseDto } from './dtos/verify-user-response.dto';
import { UploadFilesDto } from './dtos/upload-files.dto';

@ApiBearerAuth()
@ApiTags('USER')
@ApiForbiddenResponse({
  description: 'AccessToken is not Valid / User is blocked',
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized',
})
@Controller('user')
@UseGuards(AccessTokenGuard, IsBlockedGuard, TokenBlacklistGuard)
@UseInterceptors(CurrentUserInterceptor)
//@Serialize(UserDto)
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiResponse({
    description: 'Verification Started',
    type: VerifyUserResponseDto,
  })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Face Verification Of User' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        selfie: {
          type: 'string',
          format: 'binary',
          description: 'Selfie image file (only .jpg or .jpeg files allowed)',
        },
        photoId: {
          type: 'string',
          format: 'binary',
          description: 'Photo ID image file (only .jpg or .jpeg files allowed)',
        },
      },
      required: ['selfie', 'photoId'],
    },
  })
  @UseGuards(IsSignedUpGuard, UserNotVerifiedBeforeAndNotStarted) // user should be signedUp and should not be verified and Verification should not be started before to request new verification
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
    files: UploadFilesDto,
    @CurrentUser() user: any,
  ) {
    if (!files || !files.selfie || !files.photoId) {
      throw new BadRequestException(
        'Both selfie and photoId fields are required',
      );
    }
    // Only Image upload happens in sync - verification happens in async
    return this.userService.verifyUser(
      user.id,
      files.selfie[0].buffer,
      files.photoId[0].buffer,
    );
  }
}
