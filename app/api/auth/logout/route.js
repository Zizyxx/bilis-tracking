import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/api-auth.mjs";

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearSessionCookie(response);
}
