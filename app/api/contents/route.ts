import { NextResponse } from "next/server";
import { getContents } from "@/lib/vsphere-data";

export async function GET() {
  const contents = await getContents();

  return NextResponse.json({ data: contents });
}
