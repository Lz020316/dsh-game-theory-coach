# 博弈论思维教练（dsh-game-theory-coach）

面向 DeepSeek Harness（DSH）的**博弈论思维训练教练**。它以 [Agent 预设](#作为-agent-预设推荐) 的形式安装，
让你在新建会话的「模式选择」里选到一位教练；面向零基础学员，从
**管理学 / 创业 / 软件团队** 三个视角，用三种方式训练一套可迁移的博弈思维框架——
不是教数学公式，而是教"看透互动、做对决策"的思维。

## 它能做什么

| 能力 | 说明 |
| --- | --- |
| 教练人设 | 引导学员用「博弈思维四步法」思考：拆结构 → 判类型 → 找均衡 → 定角色 |
| 三种训练方式 | 概念精讲+刻意练习 / 案例驱动 / 情境模拟（教练扮演对手），按学员反馈自动切换 |
| 三个落地视角 | 管理学（绩效、谈判、激励）、创业（价格战、冷启动、融资信号）、软件团队（技术债、代码评审、估算） |
| 三个课程工具 | `coach_syllabus`（课程地图）、`coach_lesson`（单课全文）、`coach_scenario`（决策情境） |

## 课程地图（12 个概念）

**基础**：博弈四要素 · 囚徒困境与占优策略 · 纳什均衡 · 协调博弈与谢林点
**进阶**：序贯博弈与逆向归纳 · 承诺与可信威胁 · 重复博弈与声誉 · 混合策略
**高阶**：信息不对称与信号博弈 · 机制设计与激励 · 演化博弈与合作 · 博弈框架综合实战

每个概念配跨视角案例 + 练习（含参考答案），另有 10 个可即开即用的情境模拟脚本。

## 快速开始（作为 Agent 预设，推荐）

```bash
git clone https://github.com/Lz020316/dsh-game-theory-coach.git
cd dsh-game-theory-coach
node scripts/install.mjs --apply
```

然后**完全退出并重新打开北极星（DeepSeek Harness 桌面版）**，新建会话时在「模式选择」里选
**「博弈论教练」**，直接说：

> 我想从零开始学博弈论思维，先给我看看课程地图，再从第一个概念开始。

`install.mjs` 会把 `preset/` 复制到 `<dshHome>/.agent-presets/game-theory-coach/`，
并把插件入口改写为你 clone 的实际路径，因此 clone 到任何位置都能用。

## 安装方式

### A. Agent 预设（推荐）

如上，用 `scripts/install.mjs --apply`，或手动复制：

```bash
mkdir -p ~/.dsh/.agent-presets/game-theory-coach
cp preset/preset.yml ~/.dsh/.agent-presets/game-theory-coach/
cp preset/agent.cordis.yml ~/.dsh/.agent-presets/game-theory-coach/
# 然后把 agent.cordis.yml 里 game-theory-coach 那一行的 name: 改成你本机 dist/index.js 的绝对路径
```

### B. 作为 bundle 安装

发布页提供了打包好的 tarball，可经 DSH 插件管理器安装：

```bash
dsh plugin --profile <你的profile> add ./dsh-game-theory-coach-1.0.0.tgz
```

或从源码 checkout 一次性加载（web 形态）：

```bash
pnpm dsh web --patch ./cordis.patch.yml
```

> bundle 方式会全局注入教练人设；预设方式则只在选中该预设的会话里生效，推荐用预设。

## 构建

`dist/index.js` 是 `src/` 用 esbuild 打包的产物（`@deepseek-ai/*` 保持 external）。
改了 `src/` 后重新打包：

```bash
esbuild src/index.ts --bundle --format=esm --platform=node \
  --outfile=dist/index.js --external:'@deepseek-ai/*' --charset=utf8
```

打包后跑 `./examples/run.sh` 回归（冒烟测试，不需要模型与 API key）。

## 目录结构

```
├── src/
│   ├── index.ts        # 主插件：Config + 三个课程工具（可选的 persona 段落）
│   └── content.ts      # 课程内容库（12 概念 + 10 情境）
├── dist/index.js       # esbuild 打包产物（被预设/bundle 加载的就是它）
├── preset/
│   ├── preset.yml      # 预设元数据
│   └── agent.cordis.yml# 预设组装：persona 人设 + 引用工具
├── scripts/install.mjs # 预设安装脚本（自动改写插件绝对路径）
├── examples/           # 冒烟测试（launch.mjs / run.sh / driver.ts）
├── cordis.patch.yml    # bundle 安装用的行声明
└── LICENSE             # MIT
```

## 配置（Config）

| 字段 | 取值 | 默认 | 说明 |
| --- | --- | --- | --- |
| `level` | `beginner` / `intermediate` / `advanced` | `beginner` | 学员水平 |
| `perspectives` | `management` / `entrepreneurship` / `software` 数组 | 全部 | 视角侧重 |
| `defaultMode` | `case` / `simulation` / `lecture` | `case` | 默认训练方式 |
| `socratic` | `true` / `false` | `true` | 苏格拉底式提问 |
| `language` | `zh` / `en` | `zh` | 输出语言 |
| `persona` | `true` / `false` | `false` | 是否额外注册人设段落（预设方式用 `false`） |

## License

[MIT](./LICENSE) © 2026 LiZhong
