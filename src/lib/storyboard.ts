// =========================================================
// manju · 分镜切分（Storyboard）
//   把剧本章节/片段整理为分镜结构，挂载生成比例与画风。
// =========================================================

import type { Script, Storyboard, DramaConfig } from "./types";

export function buildStoryboard(script: Script, cfg: DramaConfig): Storyboard {
  return {
    title: script.title,
    ratio: cfg.ratio,
    style: cfg.style || "cinematic",
    chapters: script.chapters,
  };
}
