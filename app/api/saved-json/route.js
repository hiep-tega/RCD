// app/api/save-json/route.js

import fs from "fs";
import path from "path";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const dir = path.join(
    process.cwd(),
    "public/json"
  );

  fs.mkdirSync(dir, {
    recursive: true,
  });

  const filename = `data-${Date.now()}.json`;

  fs.writeFileSync(
    path.join(dir, filename),
    JSON.stringify(body, null, 2)
  );

  return Response.json({
    message: "Saved JSON",
    filename,
    success: true,
  });
}