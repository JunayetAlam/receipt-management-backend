import { UserRoleEnum } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRoleEnum;
  name: string;
  profilePhoto?: string;
};

declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}

export {};
