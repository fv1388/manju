// =========================================================
// manju · 短剧流水线（pipeline）
//   idea → 剧本(Script) → 分镜(Storyboard + 视频提示词)
// =========================================================

import type { DramaConfig, Script, Storyboard } from "./types";
import { buildScript } from "./scriptwriter";
import { buildStoryboard } from "./storyboard";
import { buildVisualPrompts } from "./prompts";

export interface DramaOutput {
  script: Script;
  storyboard: Storyboard;
}

/** 一键生成：剧本 + 分镜 + 每片段视频提示词 */
export async function generateDrama(cfg: DramaConfig): Promise<DramaOutput> {
  const script = await buildScript(cfg);
  // 把角色注入 cfg，供提示词阶段引用主角外形（保持同一张脸）
  (cfg as any)._characters = script.characters;
  const storyboard = buildStoryboard(script, cfg);
  await buildVisualPrompts(storyboard, cfg);
  return { script, storyboard };
}

/** 分镜里全部片段数量 */
export function totalSegments(storyboard: Storyboard): number {
  let n = 0;
  for (const ch of storyboard.chapters) n += ch.segments.length;
  return n;
}
