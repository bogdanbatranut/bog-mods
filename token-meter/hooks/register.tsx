import { atom, read, update } from 'claude-code'
import type { Register, EngineInterface } from 'claude-code'

const prompt = atom({ plugin: 'token-meter', key: 'prompt' } as const, 0)
const total = atom({ plugin: 'token-meter', key: 'total' } as const, 0)
const ctxTokens = atom({ plugin: 'token-meter', key: 'ctxTokens' } as const, 0)
const ctxWindow = atom({ plugin: 'token-meter', key: 'ctxWindow' } as const, 0)
const ctxPercent = atom({ plugin: 'token-meter', key: 'ctxPercent' } as const, 0)

const model = atom({ plugin: 'token-meter', key: 'model' } as const, '')
const effort = atom({ plugin: 'token-meter', key: 'effort' } as const, '')

const ICON = '◆'
const PROMPT_COLOR = '#0e7490'
const TOTAL_COLOR = '#92400e'
const MILLION_COLOR = '#b91c1c'

// context-fill colors by percentage: calm → warming → full
const CTX_LOW = '#15803d'
const CTX_MID = '#b45309'
const CTX_HIGH = '#b91c1c'
const ctxColor = (pct: number) => (pct >= 80 ? CTX_HIGH : pct >= 50 ? CTX_MID : CTX_LOW)

// 1 decimal, right-aligned in 7 columns: "   2.8k", "   1.1M"
const fmt = (n: number) =>
  (n >= 999_950 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1000).toFixed(1)}k`).padStart(7)

// compact, no padding, for the [ctx] segment: "92k", "1.1M"
const fmtTight = (n: number) =>
  n >= 999_950 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`

// pull the live context-window fill from $.session.usage() into the atoms;
// `tokens`/`percent` are absent until the first response of a fresh/compacted window
const syncContext = async ($: EngineInterface) => {
  const { context } = await $.session.usage()
  await update($, ctxWindow, () => context.window ?? 0)
  await update($, ctxTokens, () => context.tokens ?? 0)
  await update($, ctxPercent, () => context.percent ?? 0)
}

// show model + effort before the first prompt; the first turn.step then replaces
// the effort with the one the request actually used
const seedEffort = async ($: EngineInterface, current: string) => {
  const s = (await $.settings.read()) as {
    effortLevel?: string
    modelSettings?: Record<string, { effortLevel?: string }>
  }
  const key = Object.keys(s.modelSettings ?? {}).find(k => current.includes(k))
  return (key && s.modelSettings?.[key]?.effortLevel) || s.effortLevel || ''
}

const syncModel = async ($: EngineInterface) => {
  const current = await $.session.model()
  if (!current) return
  await update($, model, () => current)
  const seeded = await seedEffort($, current)
  if (seeded) await update($, effort, () => seeded)
}

export const register: Register = on => {
  // clears the pinned status line the 0.1.0 version left under the prompt
  on('session.start', async ($, e, next) => {
    $.ui.status(undefined)
    await syncModel($)
    return next(e)
  })

  // /model and /effort before any turn: no turn.step has run yet, so refresh here
  on('command.run', async ($, e, next) => {
    const r = await next(e)
    if (e.command === 'model' || e.command === 'effort') await syncModel($)
    return r
  })

  on('turn.start', async ($, e, next) => {
    $.ui.status(undefined)
    await update($, prompt, () => 0)
    return next(e)
  })

  // input + cache writes + output; cache reads are left out (the whole context is re-read every step)
  on('turn.step', async function* ($, e, next) {
    // main loop only: a subagent's step may run on another model
    if (!e.agentId) {
      await update($, model, () => e.model)
      await update($, effort, () => (e.effort === undefined ? '' : String(e.effort)))
    }
    const r = yield* next(e)
    const u = r.usage
    if (u) {
      const n = u.input_tokens + u.output_tokens + u.cache_creation_input_tokens
      await update($, prompt, v => v + n)
      await update($, total, v => v + n)
    }
    // real-time context-window fill: refreshed after each agent step
    await syncContext($)
    return r
  })

  // the engine's own push after each turn and on compaction — catches the
  // window shrinking (compaction / fresh window) outside a step
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      await update($, ctxWindow, () => e.context.window ?? 0)
      await update($, ctxTokens, () => e.context.tokens ?? 0)
      await update($, ctxPercent, () => e.context.percent ?? 0)
    }
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await update($, prompt, () => 0)
    await update($, total, () => 0)
    await update($, ctxTokens, () => 0)
    await update($, ctxPercent, () => 0)
    // /clear keeps the process alive and fires no session.start after it, so keep model + effort
    if (e.reason === 'clear') await syncModel($)
    else {
      await update($, model, () => '')
      await update($, effort, () => '')
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const p = await read($, prompt)
    const t = await read($, total)
    const ct = await read($, ctxTokens)
    const cw = await read($, ctxWindow)
    const cp = await read($, ctxPercent)
    // /clear can wipe the atoms after session.end ran, so re-seed whenever the model is missing
    // read-only: render may not write state
    let cur = await read($, model)
    let ef = await read($, effort)
    if (!cur) {
      cur = (await $.session.model()) ?? ''
      if (cur && !ef) ef = await seedEffort($, cur)
    }
    const m = cur.replace(/^eu\.anthropic\./, '')
    const { Box, Text } = $.ui.resolve(e)
    const isMillions = t >= 999_950
    const below = await next(e)

    return (
      <Box flexDirection="column">
        <Box>
          <Text dimColor>{ICON} token-meter: </Text>
          <Text color={PROMPT_COLOR}>[prompt:{fmt(p)}]</Text>
          <Text color={isMillions ? MILLION_COLOR : TOTAL_COLOR} bold={isMillions}>
            [total from last clear:{fmt(t)}]
          </Text>
          <Text color={ctxColor(cp)} bold={cp >= 80}>
            {' '}
            [ctx:{cw > 0 ? ` ${cp}% ${fmtTight(ct)}/${fmtTight(cw)}` : ' —'}]
          </Text>
          {m && <Text dimColor> [{ef ? `${m} · ${ef}` : m}]</Text>}
        </Box>
        {below}
      </Box>
    )
  })
}
