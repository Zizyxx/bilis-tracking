import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "bilis-tracking-dev-secret";
const COOKIE_NAME = "bilis_token";

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getCookieName() {
  return COOKIE_NAME;
}
