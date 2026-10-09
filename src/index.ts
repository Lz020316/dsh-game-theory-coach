/**
 * 博弈论思维教练 —— 主插件入口。
 *
 * 挂载三样东西：
 *   1. `ctx.systemPrompt.section()` —— 教练人设 + 教学法 + 课程工具使用约定；
 *   2. `ctx.tools.register()` —— 三个只读课程工具（syllabus / lesson / scenario）；
 *   3. Config —— 可配置水平、视角侧重、默认训练方式、是否苏格拉底式提问、语言。
 *
 * 课程内容本体在 content.ts，本文件只负责"组装"。
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import Schema from '@deepseek-ai/schemastery'
import {
  CONCEPTS,
  SCENARIOS,
  PERSPECTIVE_LABELS,
  type Perspective,
} from './content'

export const name = 'game-theory-coach'
export const inject = ['systemPrompt', 'tools']

export type Level = 'beginner' | 'intermediate' | 'advanced'
export type Mode = 'case' | 'simulation' | 'lecture'

export interface Config {
  level: Level
  perspectives: Perspective[]
  defaultMode: Mode
  socratic: boolean
  language: 'zh' | 'en'
  /**
   * 是否同时注册"教练人设" systemPrompt 段落。
   * 作为 Agent 预设使用时设为 false（人设由 preset 的 persona 行提供），
   * 本插件只负责三个课程工具；作为独立插件全局挂载时设为 true。
   */
  persona: boolean
}

export const Config: Schema<Config> = Schema.object({
  level: Schema.union(['beginner', 'intermediate', 'advanced']).default('beginner'),
  perspectives: Schema.array(Schema.union(['management', 'entrepreneurship', 'software'])).default([
    'management',
    'entrepreneurship',
    'software',
  ]),
  defaultMode: Schema.union(['case', 'simulation', 'lecture']).default('case'),
  socratic: Schema.boolean().default(true),
  language: Schema.union(['zh', 'en']).default('zh'),
  persona: Schema.boolean().default(false),
})

const LEVEL_LABELS: Record<Level, string> = {
  beginner: '基础（零基础起步）',
  intermediate: '进阶',
  advanced: '高阶',
}

const MODE_LABELS: Record<Mode, string> = {
  case: '案例驱动',
  simulation: '情境模拟（教练扮演对手）',
  lecture: '概念精讲 + 刻意练习',
}

const LEVEL_BY_INDEX: Level[] = ['beginner', 'intermediate', 'advanced']

// ──────────────────────────────── 教练人设（system prompt）────────────────

function buildCoachSection(config: Config): string {
  const perspectives = config.perspectives
    .map((p) => `  - ${PERSPECTIVE_LABELS[p]}`)
    .join('\n')

  const levelRange = (() => {
    const idx = LEVEL_BY_INDEX.indexOf(config.level)
    return LEVEL_BY_INDEX.slice(0, idx + 1).map((l) => LEVEL_LABELS[l]).join(' → ')
  })()

  return `# 角色：博弈论思维教练

你是一名「博弈论思维教练」。你的目标不是教数学公式或术语背诵，而是帮学员建立一套**可迁移的博弈思维框架**，让 TA 在管理、创业、软件团队的真实决策里看得更透、选得更准。

## 学员画像与边界
- 当前水平：${LEVEL_LABELS[config.level]}。教学范围覆盖到该水平为止（${levelRange}），不要一上来就跳到学员还没学的高阶概念。
- 你始终用「收益思维」讲：先讲"谁、能做什么、各得什么、谁知道什么"，再讲结论，**几乎不用数学**。
- 三大视角是你默认落地的场景，学员要求时也要优先回到这些视角：
${perspectives}

## 教学法（三种模式，按需切换）
1. **概念精讲 + 刻意练习**：把一个概念讲透（概念→机制→反直觉点→应用边界），随后立刻给 1-2 道练习巩固，学员作答后再给反馈与参考答案。
2. **案例驱动**：用真实的管理/创业/软件案例引出概念，先呈现困境让学员自己判断，再拆解博弈结构。
3. **情境模拟（你扮演对手）**：用 \`coach_scenario\` 工具取一个决策情境，把学员放在"玩家"位置，**你扮演情境中的对手**，一步步回应学员的选择；让学员做完决策后，再复盘（debrief）并揭示博弈结构。

默认优先用「${MODE_LABELS[config.defaultMode]}」，但要根据学员的即时反馈灵活切换，三种方式可以在一节课里混合。

## 核心框架：博弈思维四步法（贯穿始终）
遇到任何问题，引导学员按这四步思考，而不是直接给答案：
1. **拆结构**：玩家是谁？各自能出什么招？各得什么收益（含时间/信任/声誉/信息，不只是钱）？谁知道什么？
2. **判类型**：一次性还是重复？同时出招还是先后手？零和还是可共赢？信息是否对称？
3. **找均衡**：给定大家现在的行为，有没有人想单方面改？稳定状态是什么？它好不好？
4. **定角色**：我是"玩家"（在既定规则下选最优），还是"规则制定者"（能设计规则改变别人的选择）？

## 苏格拉底式引导
${config.socratic
    ? '- 优先用提问引导学员自己想出来：先问 TA 的看法/猜测，再给反馈；不要一次性把答案倒出来。\n- 学员答错时，先肯定思考过程，再用一个更小的引导问题让 TA 自己发现漏洞。'
    : '- 可以更直接地讲解，但仍要留出学员练习和表达的空间，不要全程单向输出。'}

## 课程内容与工具使用
课程内容由以下三个工具提供（内容已结构化、权威，优先取用而非凭记忆编造）：
- \`coach_syllabus\`：获取课程地图/进度概览（可指定 level）。开新学员、展示进度、确认"下一步学什么"时调用。
- \`coach_lesson\`：获取某个概念的完整一课（精讲 + 跨视角案例 + 练习）。讲一个新概念前先调用，拿到权威内容再讲。
- \`coach_scenario\`：获取一个情境模拟（可指定视角和概念）。进入情境模拟模式时调用。

**工具返回的是给你（教练）的备课材料**，不是直接甩给学员的答案。练习的参考答案（answer/hint）和情境的 debrief，**必须等学员先作答/决策后再逐步揭示**，一次只给一条反馈。

## 节奏与原则
- 一次只聚焦一个概念，讲透再进入下一个；不要一次塞多个概念。
- 每节课结尾做一次 1-2 句的收束：这个概念对应的"心智模型"是什么、学员可以用在哪个真实场景。
- 主动把概念连接到学员的真实工作（让学员说出自己的一个对应场景），这是把"知识"变成"思维"的关键一步。
- 维持教练的鼓励、清晰、结构化语气；可以偶尔举学员所在行业的鲜活例子。`
}

// ──────────────────────────────── 工具实现 ───────────────────────────────

/** 按 id 或名称（中文/英文/部分匹配）查找概念。 */
function findConcept(query: string | undefined) {
  if (!query) return undefined
  const q = query.trim().toLowerCase()
  return CONCEPTS.find(
    (c) =>
      c.id === q ||
      c.name === query.trim() ||
      c.en.toLowerCase() === q ||
      c.name.includes(query.trim()) ||
      c.en.toLowerCase().includes(q),
  )
}

/** 把概念对象渲染成一课完整备课材料（含参考答案，供教练节奏控制）。 */
function renderLesson(c: typeof CONCEPTS[number]): string {
  const lines: string[] = []
  lines.push(`# ${c.name}（${c.en}）`)
  lines.push(`> 层级：${c.levelName} ｜ 一句话：${c.oneLiner}`)
  lines.push('')
  lines.push(`**关键术语**：${c.keyTerms.join(' · ')}`)
  lines.push('')
  lines.push(`**心智模型（记住这句）**：${c.mentalModel}`)
  lines.push('')
  lines.push('## 精讲')
  lines.push(c.lecture)
  lines.push('')
  lines.push('## 案例（跨视角）')
  for (const k of c.cases) {
    lines.push(`### [${PERSPECTIVE_LABELS[k.perspective]}] ${k.title}`)
    lines.push(`- 情境：${k.scenario}`)
    lines.push(`- 拆解：${k.analysis}`)
    lines.push(`- 启示：${k.takeaway}`)
    lines.push('')
  }
  lines.push('## 练习（先让学员作答，再给答案）')
  c.practice.forEach((p, i) => {
    lines.push(`### 练习 ${i + 1}：${p.q}`)
    if (p.options?.length) lines.push(`- 选项：${p.options.join(' / ')}`)
    if (p.hint) lines.push(`- 提示（学员卡住时给）：${p.hint}`)
    lines.push(`- 参考答案（学员作答后揭示）：${p.answer}`)
    lines.push('')
  })
  return lines.join('\n')
}

/** 把情境渲染成一次完整的模拟脚本。 */
function renderScenario(s: typeof SCENARIOS[number]): string {
  const lines: string[] = []
  lines.push(`# 情境模拟：${s.title}`)
  lines.push(`> 视角：${PERSPECTIVE_LABELS[s.perspective]} ｜ 关联概念：${s.conceptId}`)
  lines.push('')
  lines.push('## 情境背景')
  lines.push(s.setting)
  lines.push('')
  lines.push(`## 你的角色（学员）`)
  lines.push(s.yourRole)
  lines.push('')
  lines.push('## 可选策略')
  s.options.forEach((o, i) => lines.push(`${i + 1}. ${o}`))
  lines.push('')
  lines.push('## 收益结构（供教练讲解，可先隐藏）')
  lines.push(s.payoffNote)
  lines.push('')
  lines.push('## 对手会怎么想（教练扮演对手的内部参考）')
  lines.push(s.opponentLogic)
  lines.push('')
  lines.push('## 复盘要点（学员决策后逐条揭示）')
  s.debrief.forEach((d, i) => lines.push(`${i + 1}. ${d}`))
  return lines.join('\n')
}

function registerTools(ctx: Context, config: Config) {
  ctx.tools.register(
    defineTool({
      name: 'coach_syllabus',
      description:
        '获取博弈论课程地图/进度概览。开新学员、展示学习进度、确认下一步学什么时调用。可指定 level（beginner/intermediate/advanced）只看某一层。',
      parameters: {
        level: {
          type: 'string',
          description: '可选：beginner / intermediate / advanced，只返回该层级；缺省返回全部层级。',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const lines: string[] = ['# 博弈论思维课程地图', '']
        for (const level of [1, 2, 3] as const) {
          const levelName = level === 1 ? '基础（零基础起步）' : level === 2 ? '进阶' : '高阶'
          const concepts = CONCEPTS.filter((c) => c.level === level)
          if (args.level) {
            const want = LEVEL_BY_INDEX.indexOf(args.level as Level) + 1
            if (level !== want) continue
          }
          const isCurrent = config.level === LEVEL_BY_INDEX[level - 1]
          lines.push(`## ${levelName}${isCurrent ? '  ← 当前水平' : ''}`)
          for (const c of concepts) {
            lines.push(`- **${c.name}**（${c.id}）：${c.oneLiner}`)
          }
          lines.push('')
        }
        lines.push('用法：用 coach_lesson 取某一课全文；用 coach_scenario 取情境模拟。')
        return lines.join('\n')
      },
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'coach_lesson',
      description:
        '获取某个博弈论概念的完整一课：精讲 + 管理学/创业/软件团队跨视角案例 + 练习（含参考答案）。讲新概念前调用。',
      parameters: {
        concept: {
          type: 'string',
          required: true,
          description: '概念 id 或名称，例如 prisoners-dilemma 或「囚徒困境」。可先查 coach_syllabus。',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const c = findConcept(args.concept)
        if (!c) {
          const ids = CONCEPTS.map((x) => `${x.name}(${x.id})`).join('、')
          return `未找到概念「${args.concept}」。可用概念：${ids}。`
        }
        return renderLesson(c)
      },
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'coach_scenario',
      description:
        '获取一个博弈决策情境（含情境背景、可选策略、收益结构、对手逻辑、复盘要点），用于情境模拟模式（教练扮演对手）。可指定视角和关联概念。',
      parameters: {
        perspective: {
          type: 'string',
          description: '可选：management / entrepreneurship / software。缺省为任意视角。',
        },
        concept: {
          type: 'string',
          description: '可选：按概念 id 筛选（如 prisoners-dilemma）。缺省为任意概念。',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        let pool = SCENARIOS
        if (args.perspective) pool = pool.filter((s) => s.perspective === args.perspective)
        if (args.concept) pool = pool.filter((s) => s.conceptId === args.concept)
        if (pool.length === 0) {
          return '没有匹配的情境。可查 coach_syllabus 了解概念，或改用 coach_scenario 不带参数获取任意情境。'
        }
        const picked = pool[Math.floor(Math.random() * pool.length)]
        return renderScenario(picked)
      },
    }),
  )
}

// ──────────────────────────────── 插件入口 ───────────────────────────────

export function apply(ctx: Context, config: Config) {
  // 可选：注册"教练人设" systemPrompt 段落。作为 Agent 预设使用时由 preset 的
  // persona 行提供人设（避免与部署 persona 叠加冲突），此处关闭。
  if (config.persona) {
    ctx.systemPrompt.section({
      name: 'game-theory-coach:role',
      order: 100,
      text: () => buildCoachSection(config),
    })
  }

  registerTools(ctx, config)

  console.log(`[game-theory-coach] 已加载（工具=3，persona=${config.persona}）`)
}
