/**
 * 验证插件：不需要模型，直接把三个课程工具走一遍真实的工具执行流水线。
 * 仅用于 standalone 冒烟测试（examples/cordis.yml），不要加载进日常 DSH。
 */
import type { Context } from '@deepseek-ai/cordis'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'

export const name = 'game-theory-coach-driver'
export const inject = ['tools']

function textOf(result: Awaited<ReturnType<Context['tools']['execute']>>): string {
  return result.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('')
}

export function apply(ctx: Context) {
  const keepAlive = setTimeout(() => {}, 60_000)

  void (async () => {
    let failed = false

    const run = async (label: string, toolName: string, args: Record<string, unknown>) => {
      console.log(`\n[driver] ── ${label} ──`)
      const result = await ctx.tools.execute({
        callId: brandString<ToolCallId>('smoke'),
        name: toolName,
        arguments: args,
        signal: new AbortController().signal,
      })
      const text = textOf(result)
      console.log(`[driver] isError = ${result.isError}`)
      console.log(`[driver] 返回 ${text.length} 字符，前 400 字：\n${text.slice(0, 400)}`)
      if (result.isError || text.length === 0) {
        failed = true
      }
    }

    await run('课程地图 coach_syllabus（无参）', 'coach_syllabus', {})
    await run('课程地图 coach_syllabus（level=beginner）', 'coach_syllabus', { level: 'beginner' })
    await run('精讲 coach_lesson（囚徒困境）', 'coach_lesson', { concept: 'prisoners-dilemma' })
    await run('精讲 coach_lesson（中文名「纳什均衡」）', 'coach_lesson', { concept: '纳什均衡' })
    await run('精讲 coach_lesson（不存在的概念）', 'coach_lesson', { concept: 'no-such-concept' })
    await run('情境 coach_scenario（management）', 'coach_scenario', { perspective: 'management' })
    await run('情境 coach_scenario（software + prisoners-dilemma）', 'coach_scenario', {
      perspective: 'software',
      concept: 'prisoners-dilemma',
    })

    console.log(`\n[driver] ${failed ? '存在失败的工具调用 ❌' : '全部通过 ✅'}`)
    if (failed) process.exitCode = 1
  })()
    .catch((error) => {
      console.error('[driver] 失败：', error?.message ?? error)
      process.exitCode = 1
    })
    .finally(() => clearTimeout(keepAlive))
}
