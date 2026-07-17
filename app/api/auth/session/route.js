import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth.mjs";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
