import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { GoogleSignInDto } from './dto/google-signin.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CurrentUserId } from '../common/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('google')
  async signInWithGoogle(@Body() dto: GoogleSignInDto) {
    const { tokens, profile } = await this.auth.signInWithGoogle(dto.idToken);
    return { ...tokens, profile };
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUserId() userId: string) {
    return this.auth.getProfile(userId);
  }

  /** Body carries a fresh Firebase ID token (re-auth) for the signed-in account. */
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  @HttpCode(200)
  async deleteAccount(
    @CurrentUserId() userId: string,
    @Body() dto: GoogleSignInDto,
  ) {
    await this.auth.deleteAccount(userId, dto.idToken);
    return { deleted: true };
  }
}
