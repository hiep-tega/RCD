import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data/recordings.json");
const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ----------------- GET -----------------
export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename: rawFilename } = await params;
  const filename = decodeURIComponent(rawFilename);

  const data = readData();
  const video = data.find((v: any) => v.filename === filename);

  if (!video) {
    return NextResponse.json(
      { error: "Video not found in JSON" },
      { status: 404 }
    );
  }

  return NextResponse.json({ video });
}

// ----------------- DELETE -----------------
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const UPLOAD_DIR = path.join(process.cwd(), "uploads/");
  
  const { filename: rawFilename } = await params;
  const filename = decodeURIComponent(rawFilename);

  const data = readData();
  const videoIndex = data.findIndex((v: any) => v.filename === filename);

  if (videoIndex === -1) {
    return NextResponse.json(
      { error: "Video not found" },
      { status: 404 }
    );
  }

  // Remove from JSON
  const [removed] = data.splice(videoIndex, 1);
  writeData(data);

  // Remove file from uploads
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return NextResponse.json({ message: "Video deleted", removed });
}

// ----------------- PATCH (rename) -----------------

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename: rawFilename } = await params;
    const filename = decodeURIComponent(rawFilename);

    const body = await req.json();
    let { newName } = body;

    if (!newName) {
      return NextResponse.json(
        { error: "Missing newName" },
        { status: 400 }
      );
    }

    // ensure extension
    if (!newName.endsWith(".webm")) {
      newName += ".webm";
    }
    //
    const UPLOAD_DIR = path.join(process.cwd(), "uploads/");
    const oldPath = path.join(UPLOAD_DIR, filename);
    const newPath = path.join(UPLOAD_DIR, newName);

    console.log("OLD PATH:", oldPath);
    console.log("NEW PATH:", newPath);

    // file must exist
    if (!fs.existsSync(oldPath)) {
      return NextResponse.json(
        { error: "Original file does not exist" },
        { status: 404 }
      );
    }

    // avoid overwrite
    if (fs.existsSync(newPath)) {
      return NextResponse.json(
        { error: "Target filename already exists" },
        { status: 400 }
      );
    }

    // rename actual file
    fs.renameSync(oldPath, newPath);

    // update database/json
    const data = readData();

    const video = data.find((v: any) => v.filename === filename);

    if (video) {
      video.filename = newName;
      video.url = `/uploads/${newName}`;
      writeData(data);
    }

    return NextResponse.json({
      success: true,
      message: "Video renamed",
      video,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Rename failed" },
      { status: 500 }
    );
  }
}