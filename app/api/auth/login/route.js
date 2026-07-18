import { NextResponse } from "next/server";
import { findUserByCredentials, withSessionCookie } from "@/lib/api-auth.mjs";

export async function POST(request) {
  const { role, identifier, password } = await request.json();

  if (!role || !identifier || !password) {
    return NextResponse.json(
      { error: "Role, identifier, dan password wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const user = await findUserByCredentials(role, identifier, password);

    if (!user) {
      return NextResponse.json(
        { error: "Login gagal. Periksa kembali kredensial Anda." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ user });
    return withSessionCookie(response, user);
  } catch (error) {
    if (error.message === "Akun dinonaktifkan") {
      return NextResponse.json(
        { error: "Akun Anda telah dinonaktifkan oleh Admin." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat login." },
      { status: 500 }
    );
  }
}
