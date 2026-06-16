import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = this.jwtService.verify(token);
      (request as any).user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Token tidak valid atau sudah expired');
    }
  }
}
