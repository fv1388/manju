// =========================================================
// manju · 豆包 / 即梦 API 封装（火山引擎方舟）
//   文本 LLM（写剧本/分镜/提示词）
//   文生图 Seedream（角色/场景/关键帧）
//   图生视频 Seedance（成片片段）
// 所有密钥均从环境变量读取，绝不硬编码。
// =========================================================

import type { Ratio } from "./types";

const ARK_BASE =
  process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const API_KEY = process.env.ARK_API_KEY || "";
const LLM_MODEL =
  process.env.DOUBAO_LLM_MODEL || "doubao-1-5-pro-32k-250115";
const SEEDREAM_MODEL =
  process.env.SEEDREAM_MODEL || "doubao-seedream-5-0-flash-260915";
const SEEDANCE_MODEL =
  process.env.SEEDANCE_MODEL || "doubao-seedance-1-0-pro-video-250528";

/** 是否已配置火山方舟 Key */
export function hasApiKey(): boolean {
  return API_KEY.length > 0 && !API_KEY.includes("your_");
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  };
}

// ---------------- 文本生成（豆包大模型） ----------------

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 调用豆包大模型生成文本（用于剧本 / 分镜 / 提示词）。
 */
export async function chat(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  if (!hasApiKey()) {
    throw new Error(
      "ARK_API_KEY 未配置。请复制 .env.example 为 .env 并填入火山引擎方舟 API Key。"
    );
  }
  const res = await fetch(`${ARK_BASE}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      temperature: opts?.temperature ?? 0.8,
      max_tokens: opts?.maxTokens ?? 4096,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Doubao LLM 调用失败 ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Doubao LLM 返回为空");
  return text.trim();
}

// ---------------- 文生图（豆包 Seedream） ----------------

/** 画幅换算成 Seedream 的 size 参数 */
function sizeForRatio(ratio: Ratio): string {
  switch (ratio) {
    case "16:9":
      return "1280x720";
    case "4:3":
      return "1152x864";
    case "1:1":
      return "1024x1024";
    case "3:4":
      return "864x1152";
    case "9:16":
      return "720x1280";
    case "21:9":
      return "1680x720";
  }
}

/**
 * 用豆包 Seedream 生成一张图，返回 base64 数据。
 */
export async function generateImage(
  prompt: string,
  ratio: Ratio = "9:16"
): Promise<{ base64: string; size: string }> {
  if (!hasApiKey()) {
    throw new Error("ARK_API_KEY 未配置。请先填入火山引擎方舟 API Key。");
  }
  const res = await fetch(`${ARK_BASE}/images/generations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: SEEDREAM_MODEL,
      prompt,
      size: sizeForRatio(ratio),
      response_format: "b64_json",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Seedream 生图失败 ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Seedream 返回无图片数据");
  return { base64: b64, size: sizeForRatio(ratio) };
}

// ---------------- 图生视频（豆包 Seedance） ----------------

/**
 * 提交图生视频任务（基于关键帧图 base64），返回任务 id。
 */
export async function submitVideo(
  imageBase64: string,
  prompt: string,
  opts?: { ratio?: Ratio; duration?: number }
): Promise<string> {
  if (!hasApiKey()) {
    throw new Error("ARK_API_KEY 未配置。请先填入火山引擎方舟 API Key。");
  }
  const res = await fetch(`${ARK_BASE}/videos/generations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: SEEDANCE_MODEL,
      duration: opts?.duration ?? 15,
      resolution: opts?.ratio ?? "9:16",
      content: [
        {
          type: "image_url",
          image_url: {
            // Seedance 支持传 base64 data URL 作为输入图
            url: `data:image/png;base64,${imageBase64}`,
          },
        },
        { type: "text", text: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Seedance 视频任务提交失败 ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const id = data?.id;
  if (!id) throw new Error("Seedance 未返回任务 id");
  return id;
}

/**
 * 查询视频任务状态，直到完成或失败。
 * 视频生成耗时较长，默认轮询上限约 8 分钟。
 */
export async function pollVideo(
  id: string,
  opts?: { intervalMs?: number; timeoutMs?: number }
): Promise<{ url?: string; status: string; error?: string }> {
  const intervalMs = opts?.intervalMs ?? 5000;
  const timeoutMs = opts?.timeoutMs ?? 480000;
  const start = Date.now();
  for (;;) {
    const res = await fetch(`${ARK_BASE}/videos/generations/${id}`, {
      method: "GET",
      headers: headers(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Seedance 任务查询失败 ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const status = data?.status || "queued";
    if (status === "done") {
      const url = data?.video_url || data?.content?.video_url;
      return { url, status };
    }
    if (status === "failed" || data?.error) {
      return { status: "failed", error: data?.error || "未知错误" };
    }
    if (Date.now() - start > timeoutMs) {
      return { status: "running", error: "查询超时" };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/**
 * 便捷函数：图生视频（提交 + 轮询到完成）。
 */
export async function imageToVideo(
  imageBase64: string,
  prompt: string,
  opts?: { ratio?: Ratio; duration?: number }
): Promise<{ url?: string; status: string; error?: string }> {
  const id = await submitVideo(imageBase64, prompt, opts);
  return pollVideo(id);
}
