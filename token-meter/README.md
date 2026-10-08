# token-meter

A Claude Code mod that pins a compact token band directly **above the prompt**,
so you can see — at a glance, in real time — how many tokens the current prompt
is burning, how many you've spent this session, and how full the context window
is.

```
◆ token-meter: [prompt:   2.8k][total:  1.1M] [ctx:  63% 126k/200k] [claude-opus-4-8 · high]
```

## What it shows

The band is a single row with four segments, left to right:

| Segment | Example | Meaning | Color |
| --- | --- | --- | --- |
| `[prompt: …]` | `2.8k` | Tokens used by the **current / last prompt** (this turn). Resets to 0 when a new turn starts. | teal |
| `[total: …]` | `1.1M` | **Cumulative** tokens since the session started (or since the last `/clear`). | amber — turns **red + bold** once it crosses ~1M |
| `[ctx: …]` | `63% 126k/200k` | **Live context-window fill**: percent used, then `used / window`. Shows `—` until the first model response. | green `<50%` → amber `50–79%` → red (bold) `≥80%` |
| `[model · effort]` | `claude-opus-4-8 · high` | The active model and reasoning effort. The `eu.anthropic.` region prefix is stripped. | dim |

### How the numbers are counted

- **prompt** and **total** both add up, per model step, `input + output + cache-creation` tokens. **Cache reads are excluded** on purpose — the whole context is re-read every step, so counting it would swamp the signal. `prompt` is the running sum for the current turn; `total` is the running sum for the whole session.
- **ctx** is read from the engine's own live context usage after every step and on compaction, so it tracks the window shrinking (e.g. after `/clear` or auto-compaction), not just growing.
- Numbers are shown with one decimal and a `k` / `M` suffix (`999.9k` rolls over to `1.0M`).

## Install

token-meter is distributed through the **`bog-mods`** marketplace on GitHub.
In an interactive Claude Code session (terminal), run:

```
/plugin install token-meter --marketplace bogdanbatranut/bog-mods
```

Claude Code will ask to add the marketplace (`github:bogdanbatranut/bog-mods`),
let you pick a scope (user scope applies it to every session), and then activate
it. No restart is needed — the band appears in that session and in every session
started afterward.

Once installed, your `~/.claude/settings.json` holds:

```jsonc
{
  "extraKnownMarketplaces": {
    "bog-mods": {
      "source": { "source": "git", "url": "https://github.com/bogdanbatranut/bog-mods.git" }
    }
  },
  "enabledPlugins": { "token-meter@bog-mods": true }
}
```

### Updating

```
/plugin update token-meter@bog-mods
```

### Disabling / uninstalling

Toggle it from `/plugin`, or set `"token-meter@bog-mods": false` in
`enabledPlugins`, or remove that entry to uninstall.

## Where it appears

token-meter renders on the **terminal** and **desktop** surfaces, in the band
above the prompt.

> **Desktop note:** the Claude Code desktop app does not mount the
> above-the-prompt band region on a fresh conversation until you submit the
> **first prompt** — so on desktop the band is blank until then, after which it
> stays for the rest of the conversation. In the terminal CLI it shows
> immediately. This is a host-side behavior, not something the mod can change.

## Notes

- Stores nothing persistent and sends nothing anywhere — all values live in
  session state and reset on `/clear` or session end.
- A subagent's steps run on their own model and are not folded into the
  main-thread model/effort readout.
