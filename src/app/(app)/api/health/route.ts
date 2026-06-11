import { NextResponse } from "next/server";
import { checkDbHealth } from "@lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await checkDbHealth();
    return NextResponse.json(
      { status: "ok", db: "ok", ts: Date.now() },
      { status: 200 }
    );
  } catch (err) {
    console.error("[health] DB ping failed:", err);
    return NextResponse.json(
      { status: "error", db: "unreachable", ts: Date.now() },
      { status: 503 }
    );
  }
}
