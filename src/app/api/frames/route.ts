import { NextResponse } from "next/server";
import { generateImage, hasApiKey } from "@/lib/doubao";

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "ARK_API_KEY 未配置。请复制 .env.example 为 .env 并填入火山引擎方舟 Key。" },
      { status: 400 }
    );
  }
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 解析失败" }, { status: 400 });
  }
  if (!body.prompt) {
    return NextResponse.json({ error: "缺少 prompt" }, { status: 400 });
  }
  try {
    const { base64 } = await generateImage(String(body.prompt), body.ratio || "9:16");
    return NextResponse.json({ dataUrl: `data:image/png;base64,${base64}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "生图失败" }, { status: 500 });
  }
}
