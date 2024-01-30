import { Module } from '@nestjs/common';
import { RefreshTokenStrategy } from './strategies/refreshToken.strategy';
import { AccessTokenStrategy } from './strategies/accessToken.strategy';
import { JwtModule } from '@nestjs/jwt';
import { MyConfigModule } from '../my-config/my-config.module';

@Module({
  imports: [MyConfigModule, JwtModule.register({})],
  controllers: [],
  providers: [AccessTokenStrategy, RefreshTokenStrategy],
})
export class TokenModule {}
