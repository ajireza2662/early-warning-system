import { NextResponse } from "next/server";
import { getSensorHistory } from "@/lib/sensors";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const history = await getSensorHistory(params.id);
    return NextResponse.json({ sensorId: params.id, history });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal mengambil history sensor" },
      { status: 500 }
    );
  }
}
