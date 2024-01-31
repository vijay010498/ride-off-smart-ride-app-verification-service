import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUserInterceptor } from '../common/interceptors/current-user.interceptor';
import { Serialize } from '../common/interceptors/serialize.interceptor';
import { UserDto } from '../common/dtos/user.dto';
import { UserService } from './user.service';
// import { AccessTokenGuard } from '../common/guards/accessToken.guard';
// import { IsBlockedGuard } from '../common/guards/isBlocked.guard';
// import { TokenBlacklistGuard } from '../common/guards/tokenBlacklist.guard';
// import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('user')
@UseInterceptors(CurrentUserInterceptor)
@Serialize(UserDto)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // @UseGuards(AccessTokenGuard, IsBlockedGuard, TokenBlacklistGuard)
  // @Post()
  // @UseInterceptors(
  //   FileFieldsInterceptor([
  //     {
  //       name: 'selfi',
  //       maxCount: 1,
  //     },
  //     {
  //       name: 'photoId',
  //       maxCount: 1,
  //     },
  //   ]),
  // )
  // verifyUser(
  //   @UploadedFiles()
  //   images: {
  //     selfi?: Express.Multer.File[];
  //     photoId?: Express.Multer.File[];
  //   },
  // ) {
  //   return images;
  // }
}
