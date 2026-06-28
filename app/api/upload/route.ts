import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// En local los archivos van a public/uploads y se sirven estáticamente.
// En producción (Railway) se setea UPLOADS_DIR a un path del volumen
// persistente (ej. /data/uploads) y se sirven vía /api/files/[name].
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
const USING_VOLUME = !!process.env.UPLOADS_DIR;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await mkdir(UPLOADS_DIR, { recursive: true });

  // Nombre único: timestamp + nombre original saneado
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const nombre = `${Date.now()}_${safe}`;
  await writeFile(path.join(UPLOADS_DIR, nombre), buffer);

  const url = USING_VOLUME ? `/api/files/${nombre}` : `/uploads/${nombre}`;
  return NextResponse.json({ url, nombre: file.name, tipo: file.type });
}
