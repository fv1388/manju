// =========================================================
// manju · 剧本生成（Scriptwriter）
//   配置了 ARK_API_KEY 时用豆包大模型生成专业英文剧本；
//   未配置时用本地模板生成可用骨架（提示词/分镜框架不依赖 key 也能跑通）。
// =========================================================

import type { DramaConfig, Script, Chapter, Segment, Character, Scene } from "./types";
import { chat, hasApiKey } from "./doubao";

const SYSTEM_PROMPT = `You are a professional short-form drama scriptwriter for overseas platforms (TikTok/YouTube Shorts).
Write a tight, hook-driven English drama script. Rules:
- Every segment is exactly 15 seconds. Keep dialogue short and punchy (1–3 lines).
- Structure as ${"`N`"} chapters; each chapter contains beat points and 15-second segments.
- Provide: title, logline, English synopsis, characters (protagonist/antagonist/supporting with appearance for image-consistency), scenes (with visual description), and per-segment {shot, dialogue, camera, emotion}.
- Output STRICT JSON only, no markdown. JSON shape:
{
  "title": "...",
  "logline": "...",
  "synopsis": "...",
  "characters": [{"name":"","role":"protagonist|antagonist|supporting","age":"","appearance":"","personality":"","goal":""}],
  "scenes": [{"id":"S1","name":"","description":"","visual":""}],
  "chapters": [{"id":"C1","title":"","beats":["..."],"segments":[{"index":1,"shot":"","dialogue":"","camera":"","emotion":""}]}]
}`;

/** 生成英文剧本 */
export async function buildScript(cfg: DramaConfig): Promise<Script> {
  if (hasApiKey()) {
    return buildScriptWithLLM(cfg);
  }
  return buildScriptLocal(cfg);
}

async function buildScriptWithLLM(cfg: DramaConfig): Promise<Script> {
  const userPrompt = [
    `Idea: ${cfg.idea}`,
    `Genre: ${cfg.genre}`,
    `Style: ${cfg.style}`,
    `Aspect ratio: ${cfg.ratio}`,
    `Tone: ${cfg.tone}`,
    `Chapters: ${cfg.chapters}`,
    `Segments per chapter (each 15s): ${cfg.segmentsPerChapter}`,
  ].join("\n");
  const raw = await chat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.9, maxTokens: 8192 }
  );
  const json = extractJson(raw);
  return normalizeScript(json, cfg);
}

/** 本地模板生成（无 key 时）：产出结构完整、内容合理的英文骨架 */
function buildScriptLocal(cfg: DramaConfig): Script {
  const g = cfg.genre || "drama";
  const style = cfg.style || "cinematic";
  const heroName = "Alex";
  const love = "Maya";

  const characters: Character[] = [
    {
      name: heroName,
      role: "protagonist",
      age: "26",
      appearance: `${style} look, sharp jawline, dark hair, confident posture`,
      personality: "determined, street-smart, slightly reckless",
      goal: `prove himself in the ${g} world`,
    },
    {
      name: "Marcus",
      role: "antagonist",
      age: "40",
      appearance: "tall, menacing, tailored suit, cold eyes",
      personality: "ruthless, calculating",
      goal: "control everything and destroy the hero",
    },
    {
      name: love,
      role: "supporting",
      age: "25",
      appearance: "warm, kind eyes, casual style, soft smile",
      personality: "loyal, caring",
      goal: "protect the hero and keep him grounded",
    },
  ];

  const scenes: Scene[] = [
    { id: "S1", name: "Downtown Night", description: "Neon-lit city street at night", visual: `${style}, neon signs, wet asphalt, night street` },
    { id: "S2", name: "Hidden Office", description: "A dark loft where the plan comes together", visual: `${style}, dim loft, glowing screens, tense mood` },
    { id: "S3", name: "The Confrontation", description: "Showdown in a parking garage", visual: `${style}, wide garage, harsh lights, dramatic standoff` },
  ];

  const chapters: Chapter[] = [];
  const hookLines = [
    `${heroName} is hunted. One call changes everything.`,
    "Trust no one. The real enemy wears a smile.",
    `${love} uncovers the truth Marcus buried.`,
    "The plan backfires. Now it is personal.",
  ];
  const finalLine =
    "Some bets are worth everything. And this one just paid off.";

  for (let c = 1; c <= cfg.chapters; c++) {
    const segments: Segment[] = [];
    for (let s = 1; s <= cfg.segmentsPerChapter; s++) {
      segments.push({
        index: s,
        duration: 15,
        shot: `${shotTemplate(c, s)} — ${sceneFor(c)}`,
        dialogue: dialogueTemplate(c, s, heroName, love, cfg.segmentsPerChapter, cfg.chapters),
        camera: cameraTemplate(s),
        emotion: emotionTemplate(c),
        visualPrompt: "", // 由 prompts 阶段填充
      });
    }
    chapters.push({
      id: `C${c}`,
      title: chapterTitle(c, hookLines, finalLine, cfg.chapters),
      beats: chapterBeats(c, heroName),
      segments,
    });
  }

  return {
    title: `${ideaTitle(cfg.idea)} — A ${genreWord(cfg)}`,
    logline: hookLines[0],
    synopsis: `In this ${cfg.chapters * cfg.segmentsPerChapter * 15}s ${genreWord(cfg)} short, ${heroName} is forced into a game of survival. Betrayed and outnumbered, he and ${love} must outsmart Marcus before time runs out. Hook, escalate, twist, payoff.`,
    characters,
    scenes,
    chapters,
  };
}

// ---------------- 本地模板拼装辅助 ----------------

function ideaTitle(idea: string): string {
  const words = idea.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/);
  return words.slice(0, 4).join(" ");
}

function genreWord(cfg: DramaConfig): string {
  return (cfg.genre || "drama").toLowerCase();
}

function sceneFor(c: number): string {
  return ["Downtown Night", "Hidden Office", "The Confrontation"][(c - 1) % 3];
}

function shotTemplate(c: number, s: number): string {
  if (s === 1) return "Extreme close-up on the hero's eyes, tension building";
  if (s === 3 && c % 2 === 0) return "Overhead drone shot, city rushing below";
  if (s === 3) return "Wide two-shot, both rivals facing off";
  return "Medium tracking shot following the hero";
}

function cameraTemplate(s: number): string {
  return ["static push-in", "slight handheld shake", "slow whip-pan", "dolly forward"][s % 4];
}

function emotionTemplate(c: number): string {
  return ["tense and mysterious", "rising suspense", "emotional, personal", "explosive climax"][(c - 1) % 4];
}

function dialogueTemplate(
  c: number,
  s: number,
  hero: string,
  love: string,
  segmentsPerChapter: number,
  totalChapters: number
): string {
  if (c === 1 && s === 1) return `${hero}: "I have nothing left to lose."`;
  if (c >= 2 && s === 1) return `${hero}: "Trust no one. Not even you."`;
  if (c >= 3 && s === 2) return `${love}: "The truth was buried. I found it."`;
  // 末章最后一个片段 → 收束台词
  if (c === totalChapters && s === segmentsPerChapter)
    return `${hero}: "This ends tonight."`;
  return "";
}

function chapterTitle(c: number, hooks: string[], final: string, total: number): string {
  if (c === 1) return "The Hunt Begins";
  if (c === total) return "Payback";
  return hooks[c % hooks.length];
}

function chapterBeats(c: number, hero: string): string[] {
  return [`${hero} realizes the trap; stakes escalate.`];
}

// ---------------- 校验与解析辅助 ----------------

function extractJson(raw: string): any {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("剧本 LLM 返回非 JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeScript(json: any, cfg: DramaConfig): Script {
  const chapters = (json.chapters || []).map((ch: any) => ({
    id: ch.id || "C1",
    title: ch.title || "Chapter",
    beats: Array.isArray(ch.beats) ? ch.beats : [],
    segments: (ch.segments || []).map((sg: any) => ({
      index: sg.index ?? 0,
      duration: 15 as const,
      shot: sg.shot || "",
      dialogue: sg.dialogue || "",
      camera: sg.camera || "",
      emotion: sg.emotion || "",
      visualPrompt: "",
    })),
  }));
  return {
    title: json.title || ideaTitle(cfg.idea),
    logline: json.logline || "",
    synopsis: json.synopsis || "",
    characters: Array.isArray(json.characters) ? json.characters : [],
    scenes: Array.isArray(json.scenes) ? json.scenes : [],
    chapters,
  };
}
