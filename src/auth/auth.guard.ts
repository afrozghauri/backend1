import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1]; // Extract token from Authorization header

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      request.user = decodedToken; // Attach user information to the request
      return true;
    } catch (error) {
      console.error('Error verifying token in FirebaseAuthGuard:', error);// Log any errors
      throw new UnauthorizedException('Unauthorized');
    }
  }
}