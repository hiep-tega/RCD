import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Ffmpeg from "fluent-ffmpeg";

function toWorkspacePath(envValue: string | undefined, fallback: string) {
  const normalized = (envValue || fallback).replace(/^[/\\]+/, "");
  return path.join(process.cwd(), normalized);
}

const DATA_FILE = toWorkspacePath(process.env.DATA_JSON, "data/recordings.json");
const UPLOAD_DIR = toWorkspacePath(process.env.UPLOAD_DIR, "uploads");

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];

    const raw = fs.readFileSync(DATA_FILE, "utf-8");

    if (!raw || raw.trim() === "") return [];

    return JSON.parse(raw);
  } catch (err) {
    console.error("JSON parse failed, resetting file:", err);

    // reset corrupted file
    fs.writeFileSync(DATA_FILE, "[]");

    return [];
  }
}

function writeData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") as File;

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR);
    }
    if (!file) {
      return NextResponse.json(
        { error: "No video uploaded" },
        { status: 400 }
      );
    }



    // 1. Save WEBM first
    const webmName = `rec-${Date.now()}.webm`;
    const webmPath = path.join(UPLOAD_DIR, webmName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(webmPath, buffer);

    // // 2. Convert to MP4
    // const mp4Name = webmName.replace(".webm", ".mp4");
    // const mp4Path = path.join(UPLOAD_DIR, mp4Name);

    // await new Promise<void>((resolve, reject) => {
    //   Ffmpeg(webmPath)
    //     .output(mp4Path)
    //     .videoCodec("libx264")
    //     .audioCodec("aac")
    //     .on("end", () => resolve())
    //     .on("error", reject)
    //     .run();
    // });

    // // 3. Delete original webm (optional)
    // fs.unlinkSync(webmPath);

    const recordings = readData();

    const newRecord = {
      filename: webmName,
      url: `/uploads/${webmName}`,
      status: "ready",
      createdAt: Date.now(),
    };

    recordings.unshift(newRecord);
    writeData(recordings);

    return NextResponse.json(newRecord);

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Conversion failed" },
      { status: 500 }
    );
  }
}