import { Module } from '@nestjs/common';
import { AccessTokenStrategy } from './strategies/accessToken.strategy';
import { JwtModule } from '@nestjs/jwt';
import { MyConfigModule } from '../my-config/my-config.module';

@Module({
  imports: [MyConfigModule, JwtModule.register({})],
  controllers: [],
  providers: [AccessTokenStrategy],
})
export class TokenModule {}
