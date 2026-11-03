import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ApiKeysModule } from '../api-keys/api-keys.module';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

@Module({
  imports: [ApiKeysModule, JwtModule.register({})],
  controllers: [OAuthController],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}
