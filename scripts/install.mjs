/**
 * 把本仓库安装为 DeepSeek Harness 的 Agent 预设。
 *
 * 做法：把 preset/ 复制到 <dshHome>/.agent-presets/game-theory-coach/，
 * 并把 agent.cordis.yml 里插件入口的绝对路径改写为本仓库实际的 dist/index.js 路径，
 * 因此仓库 clone 到任何位置都能直接用。
 *
 * 用法（在仓库根目录）：
 *   node scripts/install.mjs            # 干跑，打印将写入的内容与目标
 *   node scripts/install.mjs --apply    # 真正写入
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const apply = process.argv.includes('--apply')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distPath = join(root, 'dist', 'index.js')
const destDir = join(homedir(), '.dsh', '.agent-presets', 'game-theory-coach')

const presetYml = readFileSync(join(root, 'preset', 'preset.yml'), 'utf8')
let agentCordis = readFileSync(join(root, 'preset', 'agent.cordis.yml'), 'utf8')

// 把硬编码的插件入口路径改写为本仓库实际的 dist/index.js 绝对路径。
agentCordis = agentCordis.replace(
  /name:\s*'[^']*dsh-game-theory-coach\/dist\/index\.js'/,
  `name: '${distPath}'`,
)

console.log(`[install] 预设 id: game-theory-coach`)
console.log(`[install] 插件入口: ${distPath}`)
console.log(`[install] 目标目录: ${destDir}`)
console.log(`[install] 模式: ${apply ? '写入' : '干跑（加 --apply 才写入）'}`)

if (!apply) {
  console.log('\n[install] agent.cordis.yml 预览（前 12 行）:')
  console.log(agentCordis.split('\n').slice(0, 12).join('\n'))
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })
copyFileSync(join(root, 'preset', 'preset.yml'), join(destDir, 'preset.yml'))
writeFileSync(join(destDir, 'agent.cordis.yml'), agentCordis)
console.log('[install] 完成 ✅ 重启北极星后，在新建会话的「模式选择」里选「博弈论教练」。')
