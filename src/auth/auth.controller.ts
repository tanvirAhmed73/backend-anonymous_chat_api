import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LoginDto } from '../common/dto/login.dto';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.username);
  }
}
