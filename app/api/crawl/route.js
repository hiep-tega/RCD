import { runCrawler } from "@/lib/crawl";
import Coordinate from "../../../data/coordinate.json" assert { type: "json" };
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Received crawl request:", body);

    const url = Coordinate.find(
      (item) => item.url === body.url
    );

    await runCrawler(url, body.displayMode);
    

    return Response.json({
      success: true,
      
    });
  } catch (e) {
    return Response.json(
      {
        success: false,
        error: e.message,
      },
      {
        status: 500,
      }
    );
  }
}