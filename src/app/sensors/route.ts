import { NextResponse } from "next/server";
import { getSensorsWithStatus } from "@/lib/sensors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sensors = await getSensorsWithStatus();
    return NextResponse.json({ sensors });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal mengambil data sensor" },
      { status: 500 }
    );
  }
}
