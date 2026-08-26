/**
 * TOKEN-BASED AUTH remnant.
 * Not used by default. Session cookies are the active auth path.
 * Restore this helper if you switch back to JWT access tokens.
 */
import jwt, { Secret, SignOptions } from 'jsonwebtoken';

export const generateToken = (
  payload: { id: string; name: string; email: string; role: string },
  secret: Secret,
  expiresIn: SignOptions['expiresIn'],
) => {
  const token = jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn,
  });
  return token;
};
