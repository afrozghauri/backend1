// src/interfaces/request-with-user.interface.ts
import { Request } from 'express';
import * as admin from 'firebase-admin';

interface RequestWithUser extends Request {
  user: admin.auth.DecodedIdToken;
}

export { RequestWithUser };