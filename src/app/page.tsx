"use client";

import { useState } from "react";

interface Segment {
  index: number;
  shot: string;
  dialogue: string;
  camera: string;
  emotion: string;
  visualPrompt: string;
}
interface Chapter {
  id: string;
  title: string;
  beats: string[];
  segments: Segment[];
}
interface Character {
  name: string;
  role: string;
  appearance: string;
  personality: string;
  goal: string;
}
interface Scene {
  id: string;
  name: string;
  visual: string;
}
interface Script {
  title: string;
  logline: string;
  synopsis: string;
  characters: Character[];
  scenes: Scene[];
}
interface Storyboard {
  title: string;
  ratio: string;
  style: string;
  chapters: Chapter[];
}

type SegKey = string; // e.g. "C1#1"

export default function Page() {
  const [idea, setIdea] = useState(
    "A broke delivery boy fakes being a CEO to win back his ex-girlfriend."
  );
  const [genre, setGenre] = useState("urban");
  const [style, setStyle] = useState("cinematic");
  const [ratio, setRatio] = useState("9:16");
  const [tone, setTone] = useState("hook-driven");
  const [chapters, setChapters] = useState(3);
  const [segments, setSegments] = useState(2);

  const [script, setScript] = useState<Script | null>(null);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [isErr, setIsErr] = useState(false);

  // key -> generated preview
  const [frames, setFrames] = useState<Record<SegKey, string>>({});
  const [videos, setVideos] = useState<Record<SegKey, string>>({});
  const [busy, setBusy] = useState<Record<SegKey, string>>({});
  const [copied, setCopied] = useState<SegKey | null>(null);

  async function generateDrama() {
    setLoading(true);
    setStatus("Generating script + storyboard + video prompts…");
    setIsErr(false);
    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, genre, style, ratio, tone, chapters, segments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setScript(data.script);
      setStoryboard(data.storyboard);
      setStatus(`Done. ${storyboard?.chapters.length ?? ""} chapters · video prompts ready.`);
    } catch (e: any) {
      setIsErr(true);
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function genFrame(key: SegKey, prompt: string) {
    setBusy((b) => ({ ...b, [key]: "frame" }));
    setStatus(`Generating keyframe for ${key}…`);
    setIsErr(false);
    try {
      const res = await fetch("/api/frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ratio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生图失败");
      setFrames((f) => ({ ...f, [key]: data.dataUrl }));
      setStatus(`Keyframe ${key} done.`);
    } catch (e: any) {
      setIsErr(true);
      setStatus(e.message);
    } finally {
      setBusy((b) => ({ ...b, [key]: "" }));
    }
  }

  async function genVideo(key: SegKey, prompt: string) {
    const dataUrl = frames[key];
    if (!dataUrl) {
      setIsErr(true);
      setStatus("请先生成该片段的关键帧图。");
      return;
    }
    const base64 = dataUrl.split(",")[1];
    setBusy((b) => ({ ...b, [key]: "video" }));
    setStatus(`Generating video for ${key} (约 1-3 分钟)…`);
    setIsErr(false);
    try {
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, prompt, ratio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "视频生成失败");
      if (data.status !== "done" || !data.url) {
        throw new Error(data.error || "视频生成未完成");
      }
      setVideos((v) => ({ ...v, [key]: data.url }));
      setStatus(`Video ${key} done.`);
    } catch (e: any) {
      setIsErr(true);
      setStatus(e.message);
    } finally {
      setBusy((b) => ({ ...b, [key]: "" }));
    }
  }

  async function copyPrompt(key: SegKey, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="container">
      <h1>🎬 Manju · AI Short Drama Generator</h1>
      <p className="sub">
        English overseas short dramas, powered by Doubao / Seedream / Seedance
        (Volcengine Ark). Idea → script → storyboard → video prompts → keyframes →
        video.
      </p>

      <div className="card">
        <h2>1 · Story Idea</h2>
        <label>Idea (一句话故事点子)</label>
        <textarea value={idea} onChange={(e) => setIdea(e.target.value)} />

        <div className="row">
          <div>
            <label>Genre 题材</label>
            <input value={genre} onChange={(e) => setGenre(e.target.value)} />
          </div>
          <div>
            <label>Style 画风</label>
            <input value={style} onChange={(e) => setStyle(e.target.value)} />
          </div>
          <div>
            <label>Ratio 比例</label>
            <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
              {["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Tone 基调</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}>
              {["hook-driven", "three-act", "drama", "comedy", "suspense"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Chapters 章节</label>
            <input
              type="number"
              min={3}
              max={5}
              value={chapters}
              onChange={(e) => setChapters(parseInt(e.target.value) || 3)}
            />
          </div>
          <div>
            <label>Segs/Chapter 每章片段</label>
            <input
              type="number"
              min={1}
              max={3}
              value={segments}
              onChange={(e) => setSegments(parseInt(e.target.value) || 2)}
            />
          </div>
        </div>

        <button className="btn" onClick={generateDrama} disabled={loading}>
          {loading ? "Generating…" : "✨ Generate Script + Storyboard + Prompts"}
        </button>
        {status && (
          <p className={`status ${isErr ? "err" : "ok"}`}>{status}</p>
        )}
      </div>

      {script && storyboard && (
        <>
          <div className="card">
            <h2>2 · Script</h2>
            <h1 style={{ fontSize: 22 }}>{script.title}</h1>
            <p>
              <em>{script.logline}</em>
            </p>
            <p>{script.synopsis}</p>
            <h3>Characters</h3>
            {script.characters.map((c, i) => (
              <div className="char" key={i}>
                <b>{c.name}</b> ({c.role}) — {c.appearance}. {c.personality}.{" "}
                Goal: {c.goal}
              </div>
            ))}
            <h3>Scenes</h3>
            {script.scenes.map((s, i) => (
              <div key={i}>
                <b>{s.id} {s.name}</b>: {s.visual}
              </div>
            ))}
          </div>

          <div className="card">
            <h2>3 · Storyboard & Video Prompts</h2>
            {storyboard.chapters.map((ch) => (
              <div className="chapter" key={ch.id}>
                <h3>
                  {ch.id} · {ch.title}
                </h3>
                {ch.beats.map((b, i) => (
                  <div key={i} className="muted" style={{ color: "var(--muted)" }}>
                    · {b}
                  </div>
                ))}
                {ch.segments.map((sg) => {
                  const key = `${ch.id}#${sg.index}`;
                  return (
                    <div className="seg" key={key}>
                      <b>[{key}] Shot:</b> {sg.shot}
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>
                        Dialogue: {sg.dialogue || "—(silent)"} · Camera: {sg.camera} ·
                        Emotion: {sg.emotion}
                      </div>
                      <div className="prompt">
                        <b>🎞 Video prompt:</b> {sg.visualPrompt}
                        <button
                          className="copy-btn"
                          onClick={() => copyPrompt(key, sg.visualPrompt)}
                        >
                          {copied === key ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button
                          className="btn small"
                          disabled={!!busy[key]}
                          onClick={() => genFrame(key, sg.visualPrompt)}
                        >
                          {busy[key] === "frame" ? "…" : "🖼 Keyframe"}
                        </button>
                        <button
                          className="btn small"
                          disabled={!!busy[key] || !frames[key]}
                          onClick={() => genVideo(key, sg.visualPrompt)}
                        >
                          {busy[key] === "video" ? "…" : "🎬 Video"}
                        </button>
                      </div>
                      {(frames[key] || videos[key]) && (
                        <div className="preview">
                          {frames[key] && (
                            <img src={frames[key]} alt={`${key} keyframe`} />
                          )}
                          {videos[key] && (
                            <video src={videos[key]} controls preload="metadata" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            <p style={{ color: "var(--muted)", fontSize: 12 }}>
              Tip: 网页适合生成剧本 / 分镜 / 提示词 / 关键帧；批量生成视频建议用
              命令行 <code>npm run cli -- --frames --video</code>（避免网页请求超时）。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
