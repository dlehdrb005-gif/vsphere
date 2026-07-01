import { NextResponse } from "next/server";
import { getClips } from "@/lib/vsphere-data";

export async function GET() {
  const clips = await getClips();

  return NextResponse.json({ data: clips });
}
