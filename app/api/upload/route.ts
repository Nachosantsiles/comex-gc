import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  // Nombre único: timestamp + nombre original saneado
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const nombre = `${Date.now()}_${safe}`;
  await writeFile(path.join(uploadsDir, nombre), buffer);

  return NextResponse.json({ url: `/uploads/${nombre}`, nombre: file.name, tipo: file.type });
}
