// =========================================================
// manju · 视频提示词生成（Prompts）
//   为每个 15s 片段生成“图生视频 / 文生视频”AI 提示词（英文）。
//   配了 key 用豆包批量生成；未配置用本地模板拼装，保证可用。
// =========================================================

import type { Storyboard, DramaConfig, Segment, Character } from "./types";
import { chat, hasApiKey } from "./doubao";

const VIDEO_PROMPT_SYSTEM = `You are an expert AI-video prompt engineer (Seedance / image-to-video).
For each short 15s shot, output ONE clean English video prompt.
Must include: main subject + action + scene + style + camera movement + mood/emotion.
Keep it 1–2 sentences, cinematic, no camera jargon beyond movement, no subtitles/captions.
Output STRICT JSON array of strings only, one per shot, in order.`;

/** 为整部分镜生成每个片段的视觉提示词 */
export async function buildVisualPrompts(
  storyboard: Storyboard,
  cfg: DramaConfig
): Promise<Storyboard> {
  if (hasApiKey()) {
    await buildPromptsWithLLM(storyboard, cfg);
  } else {
    buildPromptsLocal(storyboard, cfg);
  }
  return storyboard;
}

async function buildPromptsWithLLM(
  storyboard: Storyboard,
  cfg: DramaConfig
): Promise<void> {
  const flat: Segment[] = [];
  for (const ch of storyboard.chapters) flat.push(...ch.segments);
  if (flat.length === 0) return;

  const heroName = (cfg as any)._characters?.[0]?.name || "the main character";
  const items = flat.map((sg) => {
    return `[${sg.index}] shot: ${sg.shot} | dialogue: ${sg.dialogue || "(silent)"} | camera: ${sg.camera} | emotion: ${sg.emotion}`;
  });
  const raw = await chat(
    [
      { role: "system", content: VIDEO_PROMPT_SYSTEM },
      {
        role: "user",
        content: `Style: ${storyboard.style}. Ratio: ${storyboard.ratio}. Subject: ${heroName}. Shots:\n${items.join("\n")}\nReturn ONLY a JSON array of ${flat.length} strings.`,
      },
    ],
    { temperature: 0.8, maxTokens: 8192 }
  );

  let prompts: string[] = [];
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start !== -1 && end !== -1) {
    try {
      prompts = JSON.parse(raw.slice(start, end + 1));
    } catch {
      prompts = [];
    }
  }
  if (prompts.length === 0) {
    // 解析失败 → 回退本地
    buildPromptsLocal(storyboard, cfg);
    return;
  }
  let i = 0;
  for (const ch of storyboard.chapters) {
    for (const sg of ch.segments) {
      sg.visualPrompt = prompts[i] || composePrompt(sg, storyboard.style, cfg.ratio);
      i++;
    }
  }
}

/** 本地模板：拼装英文图生视频提示词 */
function buildPromptsLocal(storyboard: Storyboard, cfg: DramaConfig): void {
  const characters = (cfg as any)._characters as Character[] | undefined;
  for (const ch of storyboard.chapters) {
    for (const sg of ch.segments) {
      sg.visualPrompt = composePrompt(sg, storyboard.style, cfg.ratio, characters);
    }
  }
}

export function composePrompt(
  sg: Segment,
  style: string,
  ratio: string,
  characters?: Character[]
): string {
  const hero = characters?.[0]?.name || "the main character";
  const heroLook = characters?.[0]?.appearance || "a determined young person";
  const dialogue = sg.dialogue ? ` He says: "${sg.dialogue}".` : "";
  return (
    `${hero}, ${heroLook}, ${sg.shot}. ${style} style, ${ratio} frame. ` +
    `Camera: ${sg.camera}. Mood: ${sg.emotion}.${dialogue} ` +
    `Cinematic lighting, sharp focus, realistic motion, no subtitles.`
  );
}
