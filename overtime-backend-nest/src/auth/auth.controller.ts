import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return { success: true, data };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return { success: true, ...result };
  }
}
