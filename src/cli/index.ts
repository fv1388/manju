// =========================================================
// manju · 命令行批量脚本（CLI）
//   用法：
//     npm run cli -- --idea "A broke delivery boy fakes being a CEO to win back his girl" --genre "urban" --style "cinematic" --ratio "9:16" --chapters 3 --segments 2
//     npm run cli -- --idea "..." --frames        # 同时用豆包 Seedream 生成关键帧图
//     npm run cli -- --idea "..." --frames --video # 再对每段图生视频（Seedance）
// =========================================================

import fs from "node:fs";
import path from "node:path";
import type { DramaConfig, Ratio, Tone } from "../lib/types";
import { generateDrama, totalSegments } from "../lib/pipeline";
import { hasApiKey, generateImage, imageToVideo } from "../lib/doubao";

interface CliArgs {
  idea: string;
  genre: string;
  style: string;
  ratio: Ratio;
  tone: Tone;
  chapters: number;
  segments: number;
  frames: boolean;
  video: boolean;
  out: string;
}

function parseArgs(argv: string[]): CliArgs {
  const a: any = { genre: "drama", style: "cinematic", ratio: "9:16", tone: "hook-driven", chapters: 3, segments: 2, frames: false, video: false, out: "" };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case "--idea": a.idea = v; i++; break;
      case "--genre": a.genre = v; i++; break;
      case "--style": a.style = v; i++; break;
      case "--ratio": a.ratio = v; i++; break;
      case "--tone": a.tone = v; i++; break;
      case "--chapters": a.chapters = parseInt(v, 10); i++; break;
      case "--segments": a.segments = parseInt(v, 10); i++; break;
      case "--out": a.out = v; i++; break;
      case "--frames": a.frames = true; break;
      case "--video": a.video = true; break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }
  if (!a.idea) {
    console.error("缺少 --idea 参数。运行 --help 查看用法。");
    process.exit(1);
  }
  return a as CliArgs;
}

function printHelp(): void {
  console.log(`
manju · AI 短剧批量生成器
用法: npm run cli -- --idea "<故事点子>" [选项]

必填:
  --idea "<一句话故事点子>"
可选:
  --genre <题材>        默认 drama
  --style <画风>        默认 cinematic
  --ratio <16:9|4:3|1:1|3:4|9:16|21:9>   默认 9:16
  --tone <hook-driven|three-act|drama|comedy|suspense>  默认 hook-driven
  --chapters <3-5>      章节数，默认 3
  --segments <1-3>      每章 15s 片段数，默认 2
  --frames              用豆包 Seedream 生成关键帧图（需 ARK_API_KEY）
  --video               再对每段图生视频（需 ARK_API_KEY）
  --out <目录>          输出目录，默认 ./output
`);
}

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function markdownOf(out: any): string {
  const md: string[] = [];
  md.push(`# ${out.script.title}`);
  md.push("");
  md.push(`**Logline:** ${out.script.logline}`);
  md.push("");
  md.push(`## Synopsis`);
  md.push(out.script.synopsis);
  md.push("");
  md.push(`## Characters`);
  for (const ch of out.script.characters) {
    md.push(`- **${ch.name}** (${ch.role}): ${ch.appearance}. ${ch.personality}. Goal: ${ch.goal}`);
  }
  md.push("");
  md.push(`## Scenes`);
  for (const sc of out.script.scenes) md.push(`- **${sc.id} ${sc.name}**: ${sc.visual}`);
  md.push("");
  md.push(`## Chapters & Shots (15s each)`);
  for (const c of out.storyboard.chapters) {
    md.push("");
    md.push(`### ${c.id} · ${c.title}`);
    if (c.beats.length) md.push(c.beats.join("; "));
    for (const sg of c.segments) {
      md.push("");
      md.push(`**[${sg.index}] Shot:** ${sg.shot}`);
      md.push(`- Dialogue: ${sg.dialogue || "—(silent)"}`);
      md.push(`- Camera: ${sg.camera} · Emotion: ${sg.emotion}`);
      md.push(`- **Video prompt:** ${sg.visualPrompt}`);
    }
  }
  return md.join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const cfg: DramaConfig = {
    idea: args.idea,
    genre: args.genre,
    style: args.style,
    ratio: args.ratio,
    tone: args.tone,
    chapters: args.chapters,
    segmentsPerChapter: args.segments,
  };

  console.log(`▶ 生成剧本 + 分镜 + 提示词...`);
  const { script, storyboard } = await generateDrama(cfg);
  const n = totalSegments(storyboard);
  console.log(`✓ 完成：${storyboard.chapters.length} 章 / ${n} 个 15s 片段`);

  const outDir = args.out || path.join(process.cwd(), "output");
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, "script.md"), markdownOf({ script, storyboard }));
  fs.writeFileSync(path.join(outDir, "storyboard.md"), markdownOf({ script, storyboard }));
  fs.writeFileSync(path.join(outDir, "prompts.json"), JSON.stringify(
    {
      title: script.title,
      ratio: cfg.ratio,
      style: cfg.style,
      segments: storyboard.chapters.flatMap((c) =>
        c.segments.map((sg) => ({
          chapter: c.id,
          index: sg.index,
          shot: sg.shot,
          dialogue: sg.dialogue,
          visualPrompt: sg.visualPrompt,
        }))
      ),
    },
    null,
    2
  ));
  console.log(`✓ 已写入 ${outDir}/ (script.md / storyboard.md / prompts.json)`);

  // ---- 可选：生成关键帧图 ----
  if (args.frames) {
    if (!hasApiKey()) {
      console.error("⚠ --frames 需要 ARK_API_KEY，请先配置 .env");
      process.exit(1);
    }
    const framesDir = path.join(outDir, "frames");
    ensureDir(framesDir);
    console.log(`▶ 用豆包 Seedream 生成关键帧图 (${n} 张)...`);
    let idx = 0;
    for (const c of storyboard.chapters) {
      for (const sg of c.segments) {
        idx++;
        const key = `C${c.id}shot${sg.index}`;
        console.log(`   ${idx}/${n} ${key}...`);
        const { base64 } = await generateImage(sg.visualPrompt, cfg.ratio);
        fs.writeFileSync(path.join(framesDir, `${key}.png`), Buffer.from(base64, "base64"));
      }
    }
    console.log(`✓ 关键帧已保存到 ${framesDir}/`);
  }

  // ---- 可选：图生视频 ----
  if (args.video) {
    if (!hasApiKey()) {
      console.error("⚠ --video 需要 ARK_API_KEY，请先配置 .env");
      process.exit(1);
    }
    const framesDir = path.join(outDir, "frames");
    const videosDir = path.join(outDir, "videos");
    if (!fs.existsSync(framesDir)) {
      console.error("⚠ 请先运行 --frames 生成关键帧，再 --video");
      process.exit(1);
    }
    ensureDir(videosDir);
    console.log(`▶ 用豆包 Seedance 图生视频...`);
    let idx = 0;
    for (const c of storyboard.chapters) {
      for (const sg of c.segments) {
        idx++;
        const key = `C${c.id}shot${sg.index}`;
        const imgPath = path.join(framesDir, `${key}.png`);
        if (!fs.existsSync(imgPath)) continue;
        console.log(`   ${idx}/${n} ${key} (约 1-3 分钟)...`);
        const b64 = fs.readFileSync(imgPath).toString("base64");
        const { url, status, error } = await imageToVideo(b64, sg.visualPrompt, {
          ratio: cfg.ratio,
          duration: 15,
        });
        if (status === "done" && url) {
          const vp = path.join(videosDir, `${key}.mp4`);
          const res = await fetch(url);
          if (res.ok) fs.writeFileSync(vp, Buffer.from(await res.arrayBuffer()));
          console.log(`   ✓ ${key}.mp4`);
        } else {
          console.warn(`   ✗ ${key} 失败: ${error || status}`);
        }
      }
    }
    console.log(`✓ 视频已保存到 ${videosDir}/`);
  }

  console.log(`\n完成。开始第一集吧 🎬`);
}

main().catch((e) => {
  console.error("运行失败:", e.message);
  process.exit(1);
});
