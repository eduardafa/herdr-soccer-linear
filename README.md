# Soccer + Linear for Herdr

A soccer pitch for your coding agents in the [Herdr app](https://herdr.dev), with your Linear issues beside it. Agents at work pass the ball, agents that need you call for VAR, finished ones score, and idle ones warm up juggling. On the right, "Team sheet" lists your Linear issues, shows which ones an agent is on, and lets you change them or kick one off with a new agent in a fresh worktree.

![Soccer + Linear](preview.png?v=1)

## Install

Ask your coding agent:

```
Read ~/.config/herdr-app/AGENTS.md, then add this layout: https://github.com/eduardafa/herdr-soccer-linear
```

Or copy `layouts/`, `mods/` and `themes/` into `~/.config/herdr-app/`, then switch to it with `ctrl-shift-l`. If a pitch button doesn't switch the pitch right after installing, restart Herdr once so it loads the new themes.

To fold the pitch with `cmd-shift-j`, add this section to `~/.config/herdr-app/keys.json`:

```json
"layout:Soccer-Linear": { "cmd-shift-j": "soccer.fold" }
```

## Connect Linear

macOS only.

1. In Linear, create a personal API key: Settings > Account > Security & access > Personal API keys. Give it write access if you want to change issues from Herdr.
2. Store it in your Keychain. In a terminal, run this and paste the key at both prompts:
   ```
   security add-generic-password -s herdr-linear -a linear -w
   ```
3. Click Refresh in the "Team sheet" panel.

## Kick off

To start agents on issues from a fresh worktree, list your repos in `~/.config/herdr-app/mods/linear-court/serve.json`:

```json
{ "agent": ["claude"], "base": "main", "repos": [{ "name": "my-app", "path": "~/code/my-app" }] }
```

## Use

- Pick a pitch with the Day, Night and Rain buttons on the scoreboard. Auto picks Day from 7:00 to 18:00 and Night otherwise.
- Each player wears its space's color, with its number on the shirt.
- Click a player, or an agent in the left panel, to jump to that agent. Hover over a player to see its model, program, what it's doing, its branch and when it started.
- Right-click a player, or an agent in the left panel, for its menu: go to it, peek at it, rename it, pin it to the top, split a shell beside it, or close it. A renamed agent shows its new name everywhere; renaming it to nothing goes back to its space's name.
- The scoreboard shows HOME (agents that finished today) against AWAY (times an agent stopped to wait for you today), and a clock in minutes since your first agent started today.
- The left panel groups your agents into Attack (working), VAR (needs you), Warm-up and Goal (finished). Attack and VAR agents show how long they've been in that status. If an agent waits for you for 10 minutes, Herdr posts a reminder.
- Your name and a settings button sit under the Spaces list.
- Click a section header, the Spaces header or a repo's arrow to fold it. The arrow at the pitch's top right folds the pitch to a bar.
- "Team sheet" groups your issues by status or by project. Sub-issues fold under their parent; click "N sub-issues" to show them.
- In "Team sheet", click an issue to open it in Linear, or right-click it to kick it off, change its status, priority or title, comment, or see its parent and sub-issues. Copy branch copies its Linear branch name. The arrow in the header folds the panel.

What each part does is in [RECIPE.md](RECIPE.md).
