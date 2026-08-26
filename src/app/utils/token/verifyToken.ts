/**
 * TOKEN-BASED AUTH remnant.
 * Not used by default. Session cookies are the active auth path.
 * Restore this helper if you switch back to JWT access tokens.
 */
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';

export const verifyToken = (token: string, secret: Secret) => {
  return jwt.verify(token, secret) as JwtPayload;
};
