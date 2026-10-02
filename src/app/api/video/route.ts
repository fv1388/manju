import { NextResponse } from "next/server";
import { imageToVideo, hasApiKey } from "@/lib/doubao";

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
  const b64 = body.imageBase64;
  const prompt = body.prompt;
  if (!b64 || !prompt) {
    return NextResponse.json({ error: "缺少 imageBase64 或 prompt" }, { status: 400 });
  }
  try {
    const r = await imageToVideo(String(b64), String(prompt), {
      ratio: body.ratio || "9:16",
      duration: 15,
    });
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "视频生成失败" }, { status: 500 });
  }
}
