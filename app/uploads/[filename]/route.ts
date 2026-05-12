import fs from "fs";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
};

function toWorkspacePath(envValue: string | undefined, fallback: string) {
  const normalized = (envValue || fallback).replace(/^[/\\]+/, "");
  return path.join(process.cwd(), normalized);
}

function resolveVideoPath(filename: string) {
  const fromEnv = toWorkspacePath(process.env.UPLOAD_DIR, "uploads");
  const fromUploads = path.join(process.cwd(), "uploads");
  const fromPublicUploads = path.join(process.cwd(), "public", "uploads");

  const candidates = [
    path.join(fromEnv, filename),
    path.join(fromUploads, filename),
    path.join(fromPublicUploads, filename),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename: rawFilename } = await params;
  const filename = decodeURIComponent(rawFilename || "");

  if (!filename || filename.includes("..") || path.basename(filename) !== filename) {
    return new Response("Invalid filename", { status: 400 });
  }

  const filePath = resolveVideoPath(filename);
  if (!filePath) {
    return new Response("File not found", { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const buffer = await fs.promises.readFile(filePath);

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename=\"${filename}\"`,
    },
  });
}
