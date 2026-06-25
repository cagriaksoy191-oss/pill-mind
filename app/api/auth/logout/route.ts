// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

import { verifyCSRF } from "@/lib/auth";

export async function POST(request: Request) {
  // CSRF & Origin Doğrulaması
  if (!verifyCSRF(request)) {
    return NextResponse.json(
      { error: "Güvenlik doğrulaması başarısız oldu (CSRF engellendi)." },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ success: true });
  
  // Oturum çerezini siliyoruz
  response.cookies.set("session", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  
  return response;
}
