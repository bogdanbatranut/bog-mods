export type Tokens = number

declare module 'claude-code' {
  interface PluginState {
    'token-meter': {
      prompt: Tokens
      total: Tokens
      ctxTokens: Tokens
      ctxWindow: Tokens
      ctxPercent: number
      model: string
      effort: string
      ledger: number
      clearBase: number
      turnBase: number
    }
  }
}
