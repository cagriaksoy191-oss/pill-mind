// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body as { email: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Geçersiz bir e-posta adresi girdiniz." },
        { status: 400 },
      );
    }

    let user;
    try {
      // Yeni kullanıcıyı oluşturmayı dene (hata fırlatırsa e-posta zaten kullanımda demektir)
      user = await prisma.user.create({
        data: { email: email.toLowerCase().trim() },
      });
    } catch (e: any) {
      // Prisma Unique Constraint Violation
      if (e.code === "P2002") {
        return NextResponse.json(
          { error: "Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut." },
          { status: 400 },
        );
      }
      throw e;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("[PillMind Register Endpoint Error]:", error);
    return NextResponse.json(
      { error: "Kayıt sırasında sistemsel bir hata oluştu." },
      { status: 500 },
    );
  }
}
