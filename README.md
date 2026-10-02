# 🎬 Manju · AI 短剧生成器

一个面向**英文出海短剧 / 微电影**的 AI 生成工具，接入**豆包 / 即梦（火山引擎方舟）**：
豆包大模型写剧本 → 豆包 Seedream 出关键帧图 → 豆包 Seedance 图生视频成片。

内置三种使用形态：

| 形态 | 说明 | 入口 |
|---|---|---|
| ① 提示词/分镜框架 | idea → 剧本 → 分镜 → 每段 15s 视频提示词（英文） | `src/lib/*` |
| ② 本地批量 CLI | 命令行一键批量生成剧本/分镜/提示词，可选自动出图/出视频 | `npm run cli` |
| ③ 网页工具 | 浏览器操作生成短剧，可部署到 Vercel | `npm run dev` |

---

## 快速开始

### 1. 配置豆包 API（火山引擎方舟）

1. 到 https://console.volcengine.com/ark 开通并获取 API Key。
2. 复制配置模板并填入密钥：

```bash
cp .env.example .env
# 编辑 .env，把 ARK_API_KEY 换成你的 Key
```

> 未配置 Key 时，剧本 / 分镜 / 视频提示词仍可用**本地模板**生成框架（可跑通流程）；只有「自动出关键帧 / 出视频」需要 Key。

### 2. 安装依赖

```bash
npm install
```

### 3a. 命令行批量生成

```bash
# 只生成剧本 + 分镜 + 提示词（无需 Key）
npm run cli -- --idea "A broke delivery boy fakes being a CEO to win back his ex-girlfriend" --genre urban --style cinematic --ratio 9:16 --chapters 3 --segments 2

# 自动出关键帧图（需 Key）
npm run cli -- --idea "..." --frames

# 关键帧 + 图生视频成片（需 Key，耗时较长）
npm run cli -- --idea "..." --frames --video
```

产物输出到 `./output/`：`script.md`、`storyboard.md`、`prompts.json`、`frames/*.png`、`videos/*.mp4`。

CLI 参数：

| 参数 | 说明 | 默认 |
|---|---|---|
| `--idea` | 一句话故事点子（必填） | — |
| `--genre` | 题材 | drama |
| `--style` | 画风 | cinematic |
| `--ratio` | 比例 16:9/4:3/1:1/3:4/9:16/21:9 | 9:16 |
| `--tone` | 基调 | hook-driven |
| `--chapters` | 章节数 3–5 | 3 |
| `--segments` | 每章 15s 片段数 1–3 | 2 |
| `--frames` | 用 Seedream 出关键帧 | 关 |
| `--video` | 再图生视频成片 | 关 |
| `--out` | 输出目录 | ./output |

### 3b. 网页工具（可部署 Vercel）

```bash
npm run dev     # 本地打开 http://localhost:3000
npm run build   # 生产构建
```

网页支持：输入故事点子 → 生成剧本/分镜/提示词 → 逐段生成关键帧 → 生成视频。
> 视频生成较慢，批量成片建议用 CLI 本地跑，避免网页请求超时。

---

## 目录结构

```
src/
├── lib/
│   ├── doubao.ts        # 豆包 API 封装（LLM 文本 / Seedream 生图 / Seedance 生视频）
│   ├── scriptwriter.ts  # 剧本生成（LLM 或本地模板）
│   ├── storyboard.ts    # 分镜切分
│   ├── prompts.ts       # 每段视频提示词（英文）
│   └── pipeline.ts      # 流水线：idea→剧本→分镜→提示词
├── app/
│   ├── page.tsx         # 网页界面
│   └── api/
│       ├── script/      # 生成剧本+分镜+提示词
│       ├── frames/      # 生成关键帧图
│       └── video/       # 图生视频
└── cli/index.ts         # 命令行批量脚本
```

## 环境变量（.env）

| 变量 | 说明 |
|---|---|
| `ARK_API_KEY` | 火山引擎方舟 API Key（必填，用于出图/出视频） |
| `DOUBAO_LLM_MODEL` | 豆包文本模型，默认 doubao-1-5-pro-32k-250115 |
| `SEEDREAM_MODEL` | 文生图模型，默认 doubao-seedream-3-0-t2i-250415 |
| `SEEDANCE_MODEL` | 图生视频模型，默认 doubao-seedance-1-0-pro-video-250528 |
| `ARK_BASE_URL` | 方舟区域地址，默认北京 |

## 说明

- **英文出海**：剧本、台词、视频提示词全部英文，面向 TikTok / YouTube Shorts。
- **角色一致性**：角色 `appearance` 会作为提示词锚点，保持同一张脸。
- **15s 片段**：每段固定 15 秒，符合短剧节奏。
- 豆包 Seedance 生成较消耗资源，请注意用量。
