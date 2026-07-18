import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const DEV_SECRET = "bilis-tracking-dev-secret";

function getSecret() {
  if (process.env.NODE_ENV === "production") {
    if (!JWT_SECRET) {
      throw new Error(
        "🚨 KEAMANAN KRITIS: Anda tidak mengatur JWT_SECRET di Vercel (Production)!\nTambahkan Environment Variable JWT_SECRET dengan string acak (minimal 32 karakter) di Dashboard Vercel Anda agar sistem login bisa bekerja."
      );
    }
    return JWT_SECRET;
  }
  return JWT_SECRET || DEV_SECRET;
}

const COOKIE_NAME = "bilis_token";

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    },
    getSecret(),
    {
      expiresIn: "7d"
    }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

export function getCookieName() {
  return COOKIE_NAME;
}
