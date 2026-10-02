// =========================================================
// manju · 核心数据类型
// =========================================================

/** 生成比例（对应 Seedance / Seedream 支持的画幅） */
export type Ratio = "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "21:9";

/** 剧作基调 */
export type Tone = "hook-driven" | "three-act" | "drama" | "comedy" | "suspense";

/** 剧本里的人物 */
export interface Character {
  name: string;
  role: string; // protagonist / antagonist / supporting
  age: string;
  appearance: string; // 外形特征（用于生图一致性锚点）
  personality: string;
  goal: string;
}

/** 剧本里的场景 */
export interface Scene {
  id: string;
  name: string;
  description: string;
  visual: string; // 场景视觉描述（用于生图）
}

/** 剧本产物 */
export interface Script {
  title: string;
  logline: string;
  synopsis: string; // 剧情梗概（英文）
  characters: Character[];
  scenes: Scene[];
  chapters: Chapter[];
}

/** 章节（3–5 个叙事章节） */
export interface Chapter {
  id: string;
  title: string;
  beats: string[]; // 章节节拍
  segments: Segment[];
}

/** 15 秒片段 */
export interface Segment {
  index: number;
  duration: 15;
  shot: string; // 镜头描述（英文）
  dialogue: string; // 台词
  camera: string; // 镜头运动
  emotion: string; // 情绪氛围
  visualPrompt: string; // 已生成的图生视频提示词
}

/** 分镜产物 */
export interface Storyboard {
  title: string;
  ratio: Ratio;
  style: string;
  chapters: Chapter[];
}

/** 单个视频生成任务结果 */
export interface VideoJob {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  videoUrl?: string;
  error?: string;
}

/** 生成配置 */
export interface DramaConfig {
  idea: string; // 一句话故事点子
  genre: string; // 题材
  style: string; // 画风
  ratio: Ratio;
  tone: Tone;
  chapters: number; // 章节数（3–5）
  segmentsPerChapter: number; // 每章 15s 片段数（1–3）
}
