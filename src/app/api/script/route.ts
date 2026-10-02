import { NextResponse } from "next/server";
import type { DramaConfig, Ratio, Tone } from "@/lib/types";
import { generateDrama } from "@/lib/pipeline";

function clamp(n: any, min: number, max: number): number {
  const v = parseInt(n, 10);
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 解析失败" }, { status: 400 });
  }
  if (!body.idea && !body.novelText) {
    return NextResponse.json({ error: "缺少 idea（故事点子）或小说文本" }, { status: 400 });
  }
  const cfg: DramaConfig = {
    idea: String(body.idea || ""),
    novelText: body.novelText ? String(body.novelText) : undefined,
    genre: String(body.genre || "drama"),
    style: String(body.style || "cinematic"),
    ratio: (body.ratio as Ratio) || "9:16",
    tone: (body.tone as Tone) || "hook-driven",
    chapters: clamp(body.chapters, 3, 5),
    segmentsPerChapter: clamp(body.segments, 1, 3),
  };
  try {
    const { script, storyboard } = await generateDrama(cfg);
    return NextResponse.json({ script, storyboard });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "生成失败" }, { status: 500 });
  }
}
