# bog-mods

A small marketplace of [Claude Code](https://claude.com/claude-code) mods.

## Mods

| Mod | What it does | Docs |
| --- | --- | --- |
| **token-meter** | Pins a compact token band above the prompt — current-prompt tokens, session total, live context-window fill, and the active model · effort. | [token-meter/README.md](token-meter/README.md) |

## Install a mod

In an interactive Claude Code session (terminal), install any mod from this
marketplace by name:

```
/plugin install <mod> --marketplace bogdanbatranut/bog-mods
```

For example:

```
/plugin install token-meter --marketplace bogdanbatranut/bog-mods
```

Claude Code will offer to add the marketplace (`github:bogdanbatranut/bog-mods`),
let you choose a scope (user scope applies to every session), and activate the
mod — no restart needed. See each mod's own README for what it outputs and any
surface-specific notes.

### Managing installed mods

```
/plugin                              # browse, enable, disable
/plugin update <mod>@bog-mods        # update to the latest pushed version
```

Or edit `~/.claude/settings.json` directly (`enabledPlugins`,
`extraKnownMarketplaces`).

## Repository layout

```
bog-mods/
├─ .claude-plugin/
│  └─ marketplace.json     # marketplace manifest (lists the mods)
└─ token-meter/            # one mod per top-level folder
   ├─ .claude-plugin/plugin.json
   ├─ hooks/               # the hooks module (register.tsx) + hooks.json
   ├─ types/               # $.state type contract
   └─ README.md
```

Each mod lives in its own top-level folder and is registered in
[`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json).
