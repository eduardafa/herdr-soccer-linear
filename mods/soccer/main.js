import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, panes, props, run, settings, shared, setShared, theme, setAgentOrder, notify, nextCommand, hc, exec, home, readTextFile, openOverlay } from "herdr";
const agentName = (a) => spaces().find((s) => s.id === a.space)?.tabs?.find((c) => c.id === a.tab)?.named ? a.tab_name : a.space_name;
const agentMenu = (a) => openOverlay({ mod: "agent-menu", kind: "popup", width: 200, height: 250, props: { terminal: a.address } });

const PITCHES = [
  { theme: "soccer-day", label: "Day", venue: "Day match", grass: "#3f9a3f", stripe: "#48a648", outside: "#2b6a31", line: "#ffffff", ball: "ball" },
  { theme: "soccer-night", label: "Night", venue: "Night match", grass: "#2a6a35", stripe: "#31763c", outside: "#0b1622", line: "#eef4ee", ball: "ball", weather: "night" },
  { theme: "soccer-rain", label: "Rain", venue: "Rain match", grass: "#2c7444", stripe: "#33804c", outside: "#26343e", line: "#e9f0ec", ball: "ball", weather: "rain" },
];
const CALL = { working: "Attack", blocked: "VAR", done: "Goal", idle: "Warm-up", unknown: "Warm-up" };
const QUIET = new Set(["idle", "unknown"]);
const PITCH_PRIORITY = { blocked: 0, working: 1, done: 2, idle: 3, unknown: 4 };
const PLAYER_W = 46, PLAYER_H = 57, PLAYER_SPACING = 132, MIN_PLAYER_SPACING = 66, LABEL_W = 180, PLAYER_LABEL_REACH = (LABEL_W - PLAYER_W) / 2 + 8, PASS_MS = 1800;
const WINDOW_BUTTONS_MIDDLE = 19, TOP_ROW_H = 20;
const PITCH_BLOCK = "soccer-pitch", PITCH_H = 230, FOLDED_PITCH_H = WINDOW_BUTTONS_MIDDLE * 2;
const ART = "mods/soccer/players";
const SPACE_COLOR = { ansi6: "#22a99a", ansi3: "#e3814f", ansi4: "#5b8def", ansi5: "#8b7cf6", ansi2: "#3fae6a", ansi1: "#d9649a" };
const SKIN = ["#f3d0b0", "#e8b98f", "#d29a6c", "#b07a4f", "#8a5a36", "#603c24"];
const HAIR = ["#1f1712", "#3b2618", "#5a3a22", "#8a5a2b", "#c99a4b", "#a8462a", "#d8d2c4"];
const HAIRSTYLES = { woman: ["ponytail", "bun"], man: ["short", "buzz"] };
const MIN_SHIRT_CONTRAST = 45, MIN_SHIRT_LIGHTNESS_GAP = 22;
const CONTRAST_SHIRTS = ["#f4f4ee", "#f2c94c"];
const POSE = { working: "run", blocked: "var", done: "goal", idle: "juggle", unknown: "juggle" };
const BENCH_AFTER = 10, SEAT_W = 48, BENCH_ROW_H = 78, SEAT = "#2c3440", SEAT_BACK = "#1b222c";
const NUMBER_X = 17.2, NUMBER_Y = 25.3;
const SINCE_KEY = "agents.since", MATCH_KEY = "soccer.match", AUTO_KEY = "soccer.pitch.auto";
const LATE_MS = 2 * 60000, RED_MS = 15 * 60000, NUDGE_MS = 10 * 60000;
const DAY_HOURS = [7, 18];
const LATE = "#ffb347", VERY_LATE = "#ff4d4d";

const pitchNow = () => {
  const picked = settings()?.theme;
  const name = typeof picked === "string" ? picked : picked?.dark ?? picked?.light;
  return PITCHES.find((p) => p.theme === name) ?? PITCHES[0];
};
const ball = (pitch, size) => image(`${ART}/${pitch.ball}.svg`).size(size);
const hash = (text) => [...text].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
const lab = (hex) => {
  const linear = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = linear;
  const f = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047), y = f(r * 0.2126 + g * 0.7152 + b * 0.0722);
  const z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const colorDistance = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));
const mixWithWhite = (hex, amount) => "#" + [1, 3, 5]
  .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount) + 255 * amount).toString(16).padStart(2, "0"))
  .join("");
const clearOfPitch = (color, pitch) => {
  const grassLightness = lab(pitch.grass)[0];
  let shirt = color;
  for (let amount = 0.1; amount <= 0.8 && Math.abs(lab(shirt)[0] - grassLightness) < MIN_SHIRT_LIGHTNESS_GAP; amount += 0.1) {
    shirt = mixWithWhite(color, amount);
  }
  return shirt;
};
const shirtOnPitch = (color, pitch) => {
  const blends = (c) => colorDistance(c, pitch.grass) < MIN_SHIRT_CONTRAST;
  if (!blends(color)) return clearOfPitch(color, pitch);
  const clashing = Object.values(SPACE_COLOR).filter(blends);
  const turn = clashing.indexOf(color);
  return CONTRAST_SHIRTS[(turn < 0 ? hash(color) : turn) % CONTRAST_SHIRTS.length];
};
const looks = (a) => {
  const stored = (shared("space.colors") ?? {})[a.space];
  const shirt = stored?.startsWith("#") ? stored
    : SPACE_COLOR[stored] ?? Object.values(SPACE_COLOR)[hash(a.space) % 6];
  const key = a.pane ?? a.address;
  const kind = hash(`${key}kind`) % 2 ? "woman" : "man";
  return {
    kind,
    shirt: shirtOnPitch(shirt, pitchNow()),
    skin: SKIN[hash(`${key}skin`) % SKIN.length],
    hair: HAIR[hash(`${key}hair`) % HAIR.length],
    style: HAIRSTYLES[kind][hash(`${key}style`) % 2],
  };
};
const layer = (file, w, h, color) => (color ? svg(`${ART}/${file}.svg`).text_color(color) : image(`${ART}/${file}.svg`))
  .absolute().left(0).top(0).w(w).h(h);
const icon = (p, size) => p?.icon
  ? (p.tint ? svg(p.icon).text_color(p.color ?? "#ffffff") : image(p.icon)).size(size)
  : div().size(size);
const today = () => new Date().toLocaleDateString("en-CA");
const minutes = (ms) => (ms <= 0 ? "0m" : ms < 60000 ? "<1m" : ms < 3600000 ? `${Math.floor(ms / 60000)}m`
  : `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`);
const sinceMap = () => shared(SINCE_KEY) ?? {};
const inStatus = (a, since) => {
  const entry = since[a.address];
  return entry && entry.status === a.status ? Date.now() - entry.since : 0;
};
const lateness = (t, a, ms) => (a.status !== "blocked" ? t[a.status] ?? t.idle : ms >= RED_MS ? VERY_LATE : ms >= LATE_MS ? LATE : t.blocked);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const prettyModel = (id) => {
  const found = (id ?? "").match(/claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?=-\d{8}|$|\[)/i);
  if (!found) return id || null;
  return `${found[1][0].toUpperCase()}${found[1].slice(1)} ${found[2]}${found[3] ? `.${found[3]}` : ""}`;
};
const INFO_FRESH_MS = 30000, CARD_W = 290;
const freshMatch = () => ({ day: today(), done: 0, waits: 0, first: 0, started: 0 });
const matchNow = () => {
  const m = shared(MATCH_KEY);
  return m?.day === today() ? { ...freshMatch(), ...m } : freshMatch();
};
const refereeCall = (list, t) => {
  const blocked = list.filter((a) => a.status === "blocked").length;
  const working = list.filter((a) => a.status === "working").length;
  const done = list.filter((a) => a.status === "done").length;
  const [text, color] = blocked ? [`VAR check! ${blocked} ${blocked === 1 ? "agent needs" : "agents need"} you`, t.blocked]
    : working ? ["Ball in play, attack on", "#ffffff"]
    : done ? ["Goal! Check the results", "#ffffff"]
    : list.length ? ["Players warming up", "#ffffffb0"]
    : ["", "#ffffff"];
  return { text, color, alarm: blocked > 0 };
};
const rect = (x, y, w, h, color) => div().absolute().left(x).top(y).w(w).h(h).bg(color);
const outline = (x, y, w, h, color, lw) => div().absolute().left(x).top(y).w(w).h(h).border(lw).border_color(color);
const ring = (cx, cy, r, color, lw) => div().absolute().left(cx - r).top(cy - r).size(r * 2).rounded(r).border(lw).border_color(color);
const spot = (cx, cy, r, color) => div().absolute().left(cx - r).top(cy - r).size(r * 2).rounded(r).bg(color);
const clipped = (x, y, w, h, child) => div().absolute().left(x).top(y).w(Math.max(0, w)).h(h).overflow_hidden().child(child);
const spread = (i, n) => ((i * 7919) % 1000) / 1000 * n;

export default class Soccer extends View {
  init(_props, cx) {
    const role = props()?.role;
    this.size = { width: 1200, height: PITCH_H };
    this.info = {};
    this.created = {};
    if (role) {
      cx.timer.every(15000, (cx) => cx.notify());
      return;
    }
    this.pitchFolded = JSON.parse(localStorage.getItem("soccer.pitch.folded") ?? "false");
    if (this.pitchFolded) run("layout.resize", { id: PITCH_BLOCK, px: FOLDED_PITCH_H });
    cx.spawn(async (cx) => {
      for (let tick = 1; ; tick++) {
        await cx.sleep(1000);
        let redraw = tick % 15 === 0;
        if (tick % 60 === 1) { this.followClock(); await this.findKickOff(); }
        if (redraw) cx.notify();
      }
    });
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        if (command === "fold") this.togglePitch(cx);
      }
    });
  }

  async findKickOff() {
    for (const a of agents()) {
      if (a.address in this.created) continue;
      try {
        this.created[a.address] = JSON.parse((await hc(["get", a.address, "--json"])).stdout).created_ms ?? null;
      } catch {
        this.created[a.address] = null;
      }
    }
    const midnight = new Date().setHours(0, 0, 0, 0);
    const today = Object.values(this.created).filter((ms) => ms && ms >= midnight);
    const started = today.length ? Math.min(...today) : 0;
    const match = matchNow();
    if (started && started !== match.started) setShared(MATCH_KEY, { ...match, started });
  }

  followClock() {
    if (!shared(AUTO_KEY)) return;
    const hour = new Date().getHours();
    const wanted = hour >= DAY_HOURS[0] && hour < DAY_HOURS[1] ? "soccer-day" : "soccer-night";
    if (pitchNow().theme !== wanted) run("app.theme", { name: wanted });
  }

  render() {
    const role = props()?.role;
    if (role === "pane") return this.paneHeader();
    if (role === "scoreboard") return this.scoreboard();
    return this.scene();
  }

  track(list) {
    const now = Date.now();
    const before = sinceMap();
    const known = Object.keys(before).length > 0;
    const next = {};
    let changed = Object.keys(before).length !== list.length;
    const match = { ...matchNow() };
    let scored = false;
    for (const a of list) {
      const was = before[a.address];
      if (was && was.status === a.status) {
        next[a.address] = was;
        if (a.status === "blocked" && !was.nudged && now - was.since > NUDGE_MS) {
          notify({
            title: `${agentName(a)} has waited ${minutes(now - was.since)}`,
            body: "VAR check: this agent still needs you.",
            level: "warning",
            action: { name: "agent.focus", args: { terminal: a.address } },
          });
          next[a.address] = { ...was, nudged: true };
          changed = true;
        }
        continue;
      }
      changed = true;
      next[a.address] = { status: a.status, since: now, first: was?.first ?? now, fresh: !was && known };
      if (!was) continue;
      if (a.status === "blocked") { match.waits += 1; scored = true; }
      if (a.status === "done") { match.done += 1; scored = true; }
    }
    if (!match.first && list.length) { match.first = now; scored = true; }
    if (scored) setShared(MATCH_KEY, match);
    if (changed) setShared(SINCE_KEY, next);
  }

  markings(p, cl, ct, cw, ch) {
    const lw = 2, cy = ct + ch / 2, mid = cl + cw / 2;
    const boxDepth = ch * 0.243, boxWidth = ch * 0.593, areaDepth = ch * 0.081, areaWidth = ch * 0.27;
    const spotFrom = ch * 0.162, arc = ch * 0.135, corner = 7;
    const parts = [
      outline(cl, ct, cw, ch, p.line, lw),
      rect(mid - lw / 2, ct, lw, ch, p.line),
      ring(mid, cy, arc, p.line, lw),
      spot(mid, cy, 3, p.line),
    ];
    for (const end of ["left", "right"]) {
      const atLeft = end === "left";
      const edge = atLeft ? cl : cl + cw;
      const inward = (d) => (atLeft ? edge + d : edge - d);
      parts.push(
        outline(atLeft ? cl : cl + cw - boxDepth, cy - boxWidth / 2, boxDepth, boxWidth, p.line, lw),
        outline(atLeft ? cl : cl + cw - areaDepth, cy - areaWidth / 2, areaDepth, areaWidth, p.line, lw),
        spot(inward(spotFrom), cy, 2.5, p.line),
      );
      const beyond = spotFrom + arc - boxDepth;
      if (beyond > 0) {
        const left = atLeft ? cl + boxDepth : cl + cw - boxDepth - beyond;
        const circleLeft = inward(spotFrom) - arc - left;
        parts.push(clipped(left, cy - arc, beyond, arc * 2, ring(circleLeft + arc, arc, arc, p.line, lw)));
      }
      const goalDepth = 10, goalWidth = Math.max(26, ch * 0.16);
      const gx = atLeft ? cl - goalDepth : cl + cw;
      parts.push(rect(gx, cy - goalWidth / 2, goalDepth, goalWidth, "#ffffff1f"));
      for (let k = 1; k < 4; k++) parts.push(rect(gx, cy - goalWidth / 2 + (k * goalWidth) / 4, goalDepth, 1, "#ffffff55"));
      for (let k = 1; k < 3; k++) parts.push(rect(gx + (k * goalDepth) / 3, cy - goalWidth / 2, 1, goalWidth, "#ffffff55"));
      parts.push(outline(gx, cy - goalWidth / 2, goalDepth, goalWidth, "#ffffff", 2));
      for (const top of [true, false]) {
        const y = top ? ct : ct + ch - corner;
        const x = atLeft ? cl : cl + cw - corner;
        const ringX = (atLeft ? 0 : corner) - corner, ringY = (top ? 0 : corner) - corner;
        parts.push(clipped(x, y, corner, corner, ring(ringX + corner, ringY + corner, corner, p.line, lw)));
      }
    }
    return parts;
  }

  weather(p, W, H, cl, ct, cw, ch) {
    if (p.weather === "night") {
      const glow = ch * 0.9;
      return [[cl, ct], [cl + cw, ct], [cl, ct + ch], [cl + cw, ct + ch]].flatMap(([x, y], i) => [
        div().absolute().left(x - glow).top(y - glow).size(glow * 2).rounded(glow).bg("#fff4c408"),
        h_flex().absolute().left(x - 11 + (i % 2 ? 22 : -22)).top(i < 2 ? ct - 26 : ct + ch + 12).px(2).py(2).gap(1.5).rounded(2).bg("#2a3442")
          .children([0, 1, 2, 3].map(() => div().size(3.5).rounded(1).bg("#fff6d6"))),
      ]);
    }
    if (p.weather === "rain") {
      const puddles = [[0.18, 0.3, 46], [0.42, 0.72, 60], [0.66, 0.24, 38], [0.84, 0.66, 52], [0.3, 0.86, 34]]
        .map(([fx, fy, w]) => div().absolute().left(cl + cw * fx).top(ct + ch * fy).w(w).h(w / 4).rounded(w / 8).bg("#ffffff16"));
      const drops = Array.from({ length: 44 }, (_, i) => {
        const x = cl - 20 + spread(i, cw + 40), start = -20 - spread(i * 3, 60);
        return div().id(`rain-${i}`).absolute().left(x).top(start).w(1.5).h(12).rounded(1).bg("#d6e6ff66")
          .loop("top", { from: start, to: H + 10, period: 650 + spread(i * 5, 450), easing: "linear" });
      });
      return [...puddles, ...drops];
    }
    return [];
  }

  scene() {
    const t = theme(), p = pitchNow(), list = agents();
    setAgentOrder(list.map((a) => a.address));
    if (this.pitchFolded) return this.foldedPitch(t, p, list);
    const zoom = Number(settings()?.zoom) || 1;
    const W = this.size.width / zoom, H = this.size.height / zoom;
    const showBench = list.length > BENCH_AFTER;
    const benchW = Math.min(240, Math.max(170, W * 0.15)), benchX = W - benchW - 24;
    const my = Math.max(34, H * 0.16), cl = Math.max(60, W * 0.04), titleX = Math.max(90, cl);
    const ct = my, cw = Math.max(240, showBench ? benchX - 40 - cl : W - cl * 2), ch = Math.max(90, H - my * 2);

    const surface = [rect(cl, ct, cw, ch, p.grass)];
    for (let i = 1; i < 14; i += 2) surface.push(rect(cl + (i * cw) / 14, ct, cw / 14, ch, p.stripe));

    const reach = Math.max(0, cw / 2 - cw * 0.05 - 36 - PLAYER_W - PLAYER_LABEL_REACH);
    let spacing = PLAYER_SPACING, perSide = Math.floor(reach / spacing) + 1;
    const wanted = Math.ceil(list.length / 2);
    if (!showBench && wanted > perSide) {
      spacing = Math.max(MIN_PLAYER_SPACING, reach / (wanted - 1));
      perSide = Math.floor(reach / spacing) + 1;
    }
    const place = (side, arr) => arr.map((a, i) => {
      const fromGoal = cw * 0.05 + 36 + i * spacing;
      const up = side === "left" ? i % 2 === 0 : i % 2 === 1;
      return {
        a, side,
        x: side === "left" ? cl + fromGoal : cl + cw - fromGoal - PLAYER_W,
        y: ct + ch / 2 - PLAYER_H / 2 - 14 + (up ? -ch * 0.17 : ch * 0.17),
      };
    });
    const onPitch = [...list].sort((a, b) => (PITCH_PRIORITY[a.status] ?? 9) - (PITCH_PRIORITY[b.status] ?? 9));
    const left = place("left", onPitch.filter((_, i) => i % 2 === 0).slice(0, perSide));
    const right = place("right", onPitch.filter((_, i) => i % 2 === 1).slice(0, perSide));
    const placed = new Set([...left, ...right].map((q) => q.a.address));
    const benched = onPitch.filter((a) => !placed.has(a.address));
    const numbers = Object.fromEntries(list.map((a, i) => [a.address, i + 1]));
    this.track(list);

    const foot = (q) => ({
      x: q.x + (q.side === "left" ? PLAYER_W * 0.77 : PLAYER_W * 0.23),
      y: q.y + PLAYER_H * 0.74,
    });
    const passer = left.find((q) => q.a.status === "working"), receiver = right.find((q) => q.a.status === "working");
    let pass = null;
    if (passer && receiver) pass = [foot(passer), foot(receiver)];
    else if (passer) pass = [foot(passer), { x: cl + cw + 5, y: ct + ch / 2 }];
    else if (receiver) pass = [{ x: cl - 5, y: ct + ch / 2 }, foot(receiver)];
    const passKey = `${passer?.a.address ?? "none"}-${receiver?.a.address ?? "none"}`;
    const kick = (q) => (q === passer ? "pass" : q === receiver ? "return" : null);

    const call = refereeCall(list, t);
    const active = spaces().find((s) => s.active);
    const hovered = [...left, ...right].find((q) => q.a.address === this.hovered);

    return div().id("pitch").relative().size_full().overflow_hidden().bg(p.outside)
      .on_size_change((size, cx) => { this.size = size; cx.notify(); })
      .children(surface).children(this.markings(p, cl, ct, cw, ch))
      .child(h_flex().absolute().left(titleX).top(WINDOW_BUTTONS_MIDDLE - TOP_ROW_H / 2).h(TOP_ROW_H).gap(8).items_center()
        .child(ball(p, 11))
        .child(div().text_size(14).font_weight(800).text_color("#ffffff").child(p.venue))
        .child(div().text_size(13).text_color("#ffffffb0").child(active?.name ?? "")))
      .child(h_flex().absolute().right(W - cl - cw).top(WINDOW_BUTTONS_MIDDLE - TOP_ROW_H / 2).h(TOP_ROW_H).items_center().text_size(13).font_weight(700).text_color(call.color)
        .when(call.alarm, (el) => el.id("referee").loop("opacity", { from: 0.55, to: 1, period: 900 }))
        .child(call.text))
      .child(div().absolute().right(8).top(WINDOW_BUTTONS_MIDDLE - 10).child(this.foldButton("up")))
      .when(list.length === 0, (el) => el.child(v_flex().absolute().left(cl).top(ct + ch / 2 - 12).w(cw).items_center()
        .child(div().px(12).py(4).rounded(10).bg("#00000055").text_size(13).font_weight(600).text_color("#ffffff")
          .child("No players on the pitch yet. Start an agent to kick off."))))
      .children([...left, ...right].map((q) => this.player(q, t, p, kick(q), passKey, numbers[q.a.address])))
      .when(pass !== null, (el) => el.child(this.pass(p, pass[0], pass[1], passKey)))
      .when(showBench, (el) => el
        .child(h_flex().absolute().left(benchX).top(WINDOW_BUTTONS_MIDDLE - TOP_ROW_H / 2).h(TOP_ROW_H).gap(6).items_center()
          .child(div().text_size(12).font_weight(800).text_color("#ffffff").child("SUBS"))
          .child(div().text_size(12).text_color("#ffffffb0").child(String(benched.length))))
        .children(this.bench(benched, benchX, ct, benchW, ch, t)))
      .when(!showBench && benched.length > 0, (el) => el.child(div().absolute().right(cl + 8).bottom(my + 6).px(8).py(2).rounded(8)
        .bg("#00000055").text_size(11).font_weight(600).text_color("#ffffff").child(`+${benched.length} waiting`)))
      .children(this.weather(p, W, H, cl, ct, cw, ch))
      .when(Boolean(hovered), (el) => el.child(this.card(hovered, t, W, H)));
  }

  hover(address) {
    return (hovered, cx) => {
      if (hovered) {
        this.hovered = address;
        if (Date.now() - (this.info[address]?.at ?? 0) > INFO_FRESH_MS) cx.spawn(async (cx) => { await this.loadInfo(address); cx.notify(); });
      } else if (this.hovered === address) {
        this.hovered = null;
      }
      cx.notify();
    };
  }

  async loadInfo(address) {
    const info = { at: Date.now() };
    try {
      const r = await hc(["get", address, "--json"]);
      const term = JSON.parse(r.stdout);
      info.version = term.foreground?.name ?? null;
      info.doing = term.status?.msg ?? null;
      info.title = term.title ?? null;
      info.started = term.created_ms ?? null;
      const pid = term.foreground?.pid;
      const session = pid ? JSON.parse((await readTextFile(`${home()}/.claude/sessions/${pid}.json`)) ?? "null") : null;
      if (session?.sessionId) {
        info.session = session.name ?? null;
        const found = await exec("find", [`${home()}/.claude/projects`, "-maxdepth", "2", "-name", `${session.sessionId}.jsonl`]);
        const transcript = found.stdout.trim().split("\n")[0];
        if (transcript) {
          const tail = await exec("tail", ["-c", "400000", transcript]);
          const models = [...tail.stdout.matchAll(/"model":"([^"]+)"/g)].map((m) => m[1]).filter((m) => m.startsWith("claude"));
          info.model = prettyModel(models[models.length - 1]);
        }
      }
    } catch {
      info.failed = true;
    }
    this.info[address] = info;
  }

  card(q, t, W, H) {
    const { a } = q;
    const info = this.info[a.address];
    const ms = inStatus(a, sinceMap());
    const branch = panes().find((x) => x.pane === a.pane)?.branch;
    const x = clamp(q.side === "left" ? q.x + PLAYER_W + 12 : q.x - CARD_W - 12, 4, W - CARD_W - 4);
    const y = clamp(q.y - 8, 4, H - 124);
    const row = (label, value) => h_flex().gap(6).text_size(11)
      .child(div().w(54).flex_none().text_color(t.dim).child(label))
      .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(value));
    const program = [a.program?.name ?? "Terminal", info?.version].filter(Boolean).join(" ");
    return v_flex().id("player-card").absolute().left(x).top(y).w(CARD_W).p(10).gap(4).rounded(8).bg(t.popover).border(1).border_color(t.border)
      .child(h_flex().gap(6).items_center().pb(2)
        .child(icon(a.program, 13))
        .child(div().flex_1().min_w(0).truncate().text_size(12.5).font_weight(700).text_color(t.foreground).child(agentName(a)))
        .child(div().flex_none().text_size(11).font_weight(700).text_color(lateness(t, a, ms)).child(`${CALL[a.status] ?? a.status} ${minutes(ms)}`)))
      .child(row("Model", info ? info.model ?? "Not reported" : "Loading..."))
      .child(row("Program", program))
      .child(row("Doing", info?.doing || info?.title || "..."))
      .when(Boolean(branch), (el) => el.child(row("Branch", branch)))
      .when(Boolean(info?.started), (el) => el.child(row("Started", minutes(Date.now() - info.started) + " ago")));
  }

  bench(list, x, y, w, h, t) {
    const perRow = Math.max(1, Math.floor((w - 16) / SEAT_W));
    const rows = Math.max(1, Math.min(3, Math.floor((h + 12) / BENCH_ROW_H)));
    const seated = list.slice(0, perRow * rows);
    const extra = list.length - seated.length;
    const top = y + (h - rows * BENCH_ROW_H) / 2 + 4;
    const parts = [rect(x - 10, y - 6, w + 20, h + 12, "#00000033").rounded(10)];
    for (let r = 0; r < rows; r++) {
      const ry = top + r * BENCH_ROW_H;
      parts.push(
        rect(x - 4, ry + 2, w + 8, 6, "#ffffff2e").rounded_t(6),
        rect(x, ry + 14, w, 20, SEAT_BACK).rounded(3),
        rect(x, ry + 34, w, 7, SEAT).rounded(2),
        rect(x + 8, ry + 41, 4, 12, SEAT_BACK), rect(x + w - 12, ry + 41, 4, 12, SEAT_BACK),
      );
    }
    seated.forEach((a, i) => {
      const ry = top + Math.floor(i / perRow) * BENCH_ROW_H, sx = x + 8 + (i % perRow) * SEAT_W;
      const pulsing = a.status === "working" || a.status === "blocked";
      parts.push(v_flex().id(`bench-${a.address}`).absolute().left(sx).top(ry).w(SEAT_W).items_center().cursor_pointer()
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => run("agent.focus", { terminal: a.address }))
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); agentMenu(a); })
        .child(this.seatedFigure(a)
          .child(div().id(`bench-dot-${a.address}`).absolute().right(0).top(0).size(8).rounded(4).bg(t[a.status] ?? t.idle)
            .when(pulsing, (d) => d.loop("opacity", { from: 0.4, to: 1, period: 800 }))))
        .child(div().max_w(SEAT_W).text_size(9).font_weight(600).text_color("#ffffff").truncate().child(agentName(a))));
    });
    if (extra > 0) {
      parts.push(div().absolute().left(x + w - 60).top(y + h - 6).text_size(11).font_weight(600)
        .text_color("#ffffffb0").child(`+${extra} more`));
    }
    return parts;
  }

  togglePitch(cx) {
    this.pitchFolded = !this.pitchFolded;
    localStorage.setItem("soccer.pitch.folded", JSON.stringify(this.pitchFolded));
    run("layout.resize", { id: PITCH_BLOCK, px: this.pitchFolded ? FOLDED_PITCH_H : PITCH_H });
    cx.notify();
  }

  foldButton(direction) {
    const icon = direction === "up" ? "mods/soccer/chevron-up.svg" : "mods/workspace-chrome/chevron-down.svg";
    return h_flex().id(`pitch-fold-${direction}`).size(20).flex_none().rounded(5).items_center().justify_center().cursor_pointer()
      .bg("#00000033").hover((s) => s.bg("#00000066"))
      .tooltip(direction === "up" ? "Hide the pitch (cmd-shift-j)" : "Show the pitch (cmd-shift-j)")
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); this.togglePitch(cx); })
      .child(svg(icon).size(12).text_color("#ffffff"));
  }

  foldedPitch(t, p, list) {
    const call = refereeCall(list, t);
    const active = spaces().find((s) => s.active);
    return h_flex().id("pitch").size_full().pl(90).pr(8).gap(8).items_center().bg(p.outside)
      .child(div().size(11).flex_none().child(ball(p, 11)))
      .child(div().flex_none().text_size(13).font_weight(800).text_color("#ffffff").child(p.venue))
      .child(div().min_w(0).truncate().text_size(12.5).text_color("#ffffffb0").child(active?.name ?? ""))
      .child(div().flex_1())
      .child(div().flex_none().text_size(12.5).font_weight(700).text_color(call.color)
        .when(call.alarm, (el) => el.id("referee-folded").loop("opacity", { from: 0.55, to: 1, period: 900 }))
        .child(call.text))
      .child(this.foldButton("down"));
  }

  seatedFigure(a) {
    const look = looks(a);
    return div().relative().w(40).h(52)
      .child(layer(`bench-skin-${look.kind}`, 40, 52, look.skin))
      .child(layer("bench-socks", 40, 52, look.shirt))
      .child(layer(`bench-jersey-${look.kind}`, 40, 52, look.shirt))
      .child(layer(`bench-hair-${look.style}`, 40, 52, look.hair))
      .child(layer(`bench-kit-${look.kind}`, 40, 52));
  }

  playerFigure(a, side, kick, passKey, number) {
    const look = looks(a), s = side === "left" ? "r" : "l", pose = POSE[a.status] ?? "juggle";
    const full = () => div().absolute().left(0).top(0).size_full();
    const lower = (frame) => full()
      .child(layer(`legs-${frame}-${s}`, PLAYER_W, PLAYER_H, look.skin))
      .child(layer(`socks-${frame}-${s}`, PLAYER_W, PLAYER_H, look.shirt))
      .child(layer(`boots-${frame}-${s}`, PLAYER_W, PLAYER_H));
    const upper = (frame) => full()
      .child(layer(`arms-${frame}-${look.kind}-${s}`, PLAYER_W, PLAYER_H, look.skin))
      .child(layer(`sleeves-${frame}-${look.kind}-${s}`, PLAYER_W, PLAYER_H, look.shirt))
      .when(frame === "var", (el) => el.child(layer(`var-screen-${s}`, PLAYER_W, PLAYER_H)));
    const body = [
      layer(`head-${s}`, PLAYER_W, PLAYER_H, look.skin),
      layer(`jersey-${look.kind}-${s}`, PLAYER_W, PLAYER_H, look.shirt),
      layer(`hair-${look.style}-${s}`, PLAYER_W, PLAYER_H, look.hair),
      layer(`kit-${look.kind}-${s}`, PLAYER_W, PLAYER_H),
    ];
    const shirtNumber = div().absolute().left((s === "r" ? NUMBER_X : PLAYER_W - NUMBER_X) - 7).top(NUMBER_Y - 5).w(14).h(10)
      .flex().items_center().justify_center().text_size(7.5).font_weight(800)
      .text_color(lab(look.shirt)[0] > 62 ? "#1d2433" : "#ffffff").child(String(number));
    const figure = div().id(`figure-${a.address}`).relative().w(PLAYER_W).h(PLAYER_H);
    if (pose !== "run" || !kick) {
      return figure.child(lower(pose)).children(body).when(pose !== "var", (el) => el.child(shirtNumber)).child(upper(pose));
    }
    const nearBall = kick === "pass" ? { from: 1, to: 0, easing: "ease-out" } : { from: 0, to: 1, easing: "ease-in" };
    const awayFromBall = { from: 1 - nearBall.from, to: 1 - nearBall.to, easing: nearBall.easing };
    const id = `${a.address}-${passKey}`;
    const strike = (part, key) => full().id(`kick-${key}-${id}`).loop("opacity", { ...nearBall, period: PASS_MS })
      .child(part("kick").id(`kick-snap-${key}-${id}`).loop("opacity", { from: 1, to: 0, period: PASS_MS / 2, easing: "ease-out" }));
    const stride = (part, key) => part("run").id(`stride-${key}-${id}`).loop("opacity", { ...awayFromBall, period: PASS_MS });
    return figure
      .child(strike(lower, "legs")).child(stride(lower, "legs"))
      .children(body).child(shirtNumber)
      .child(strike(upper, "arms")).child(stride(upper, "arms"));
  }

  player(q, t, p, kick, passKey, number) {
    const { a, x, y, side } = q;
    const color = t[a.status] ?? t.idle;
    let figure = this.playerFigure(a, side, kick, passKey, number);
    if (a.status === "working") figure = figure.loop("top", { from: 0, to: -3, period: 420 });
    if (a.status === "blocked") figure = figure.loop("top", { from: 0, to: -2, period: 900 });
    if (a.status === "done") figure = figure.loop("top", { from: 0, to: -8, period: 640, easing: "ease-out" });
    if (QUIET.has(a.status)) {
      figure = figure.child(div().id(`juggle-${a.address}`).absolute()
        .left(side === "left" ? PLAYER_W * 0.5 - 2 : PLAYER_W * 0.5 - 6).top(PLAYER_H * 0.72).size(8)
        .child(ball(p, 8))
        .loop("top", { from: PLAYER_H * 0.72, to: PLAYER_H * 0.56, period: 820, easing: "ease-out" }));
    }
    const badge = a.status === "blocked" || a.status === "done"
      ? div().id(`call-${a.address}`).px(8).py(2).rounded(8).bg(color).text_size(10).font_weight(800)
        .text_color("#10140c").child(CALL[a.status].toUpperCase())
        .when(a.status === "blocked", (el) => el.loop("opacity", { from: 0.6, to: 1, period: 700 }))
      : div().h(16);
    return v_flex().id(`player-${a.address}`).absolute().left(x + PLAYER_W / 2 - LABEL_W / 2).top(y - 18).w(LABEL_W).items_center().gap(1)
      .cursor_pointer()
      .transition("top", { duration: 500, easing: "ease-in-out" })
      .on_hover(this.hover(a.address))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(() => run("agent.focus", { terminal: a.address }))
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); agentMenu(a); })
      .child(badge)
      .child(figure)
      .child(v_flex().items_center().max_w(LABEL_W).px(7).py(1).rounded(6).bg("#00000066")
        .when(a.focused, (el) => el.border(1).border_color("#ffffff"))
        .child(h_flex().gap(4).items_center().max_w(LABEL_W - 14)
          .child(icon(a.program, 12))
          .child(div().text_size(11).font_weight(600).text_color("#ffffff").truncate().child(agentName(a))))
        .child(div().text_size(9.5).font_weight(700).text_color(QUIET.has(a.status) ? "#ffffffb0" : color).child(CALL[a.status] ?? "")));
  }

  pass(p, from, to, passKey) {
    return div().id(`pass-y-${passKey}`).absolute().left(0).top(from.y).w(1).h(1)
      .loop("top", { from: from.y, to: to.y, period: PASS_MS, easing: "linear" })
      .child(div().id(`pass-x-${passKey}`).absolute().left(from.x).top(0).w(1).h(1)
        .loop("left", { from: from.x, to: to.x, period: PASS_MS, easing: "linear" })
        .child(div().absolute().left(-6).top(4).w(12).h(4).rounded(2).bg("#00000044"))
        .child(div().id(`pass-hop-${passKey}`).absolute().left(-6).top(-7).size(12).child(ball(p, 12))
          .loop("top", { from: -7, to: -16, period: PASS_MS / 2, easing: "ease-out" })));
  }

  scoreboard() {
    const t = theme(), p = pitchNow(), list = agents();
    const match = matchNow();
    const auto = Boolean(shared(AUTO_KEY));
    const count = (status) => list.filter((a) => a.status === status).length;
    const divider = () => div().w(1).h(18).bg(t.border);
    const cell = (statuses) => {
      const n = statuses.reduce((sum, s) => sum + count(s), 0);
      return h_flex().gap(6).items_center().px(12)
        .child(div().text_size(10).font_weight(700).text_color(t.muted).child(CALL[statuses[0]].toUpperCase()))
        .child(div().text_size(15).font_weight(800).text_color(n ? t[statuses[0]] : t.dim).child(String(n)));
    };
    const chip = (id, label, swatch, on, onClick) => h_flex().id(id).gap(5).items_center().px(9).py(3).rounded(10).cursor_pointer()
      .bg(on ? t.accent : t.raised).hover((s) => s.bg(on ? t.accent : t.hover))
      .on_click(onClick)
      .when(Boolean(swatch), (el) => el.child(swatch))
      .child(div().text_size(11).font_weight(700).text_color(on ? t.accent_foreground : t.foreground).child(label));
    const pitchChip = (pitch) => chip(`pitch-${pitch.theme}`, pitch.label,
      div().size(8).rounded(4).bg(pitch.grass).border(1).border_color(pitch.line), !auto && pitch.theme === p.theme,
      () => { setShared(AUTO_KEY, false); run("app.theme", { name: pitch.theme }); });
    const autoChip = chip("pitch-auto", auto ? `Auto · ${p.label}` : "Auto", null, auto, () => {
      setShared(AUTO_KEY, !auto);
      if (!auto) {
        const hour = new Date().getHours();
        run("app.theme", { name: hour >= DAY_HOURS[0] && hour < DAY_HOURS[1] ? "soccer-day" : "soccer-night" });
      }
    });
    const kickOff = match.started || match.first;
    const clock = kickOff ? `${Math.floor((Date.now() - kickOff) / 60000)}'` : "0'";
    const teamName = (name, about) => div().id(`team-${name}`).text_size(11).font_weight(800).text_color(t.muted).tooltip(about).child(name);
    return h_flex().size_full().px(14).items_center().justify_between().bg(t.chrome).text_color(t.foreground)
      .child(h_flex().gap(8).items_center().min_w(0)
        .child(teamName("HOME", "Agents that finished today"))
        .child(div().px(8).py(1).rounded(6).bg(t.raised).text_size(14).font_weight(900).text_color(t.accent)
          .child(`${match.done} - ${match.waits}`))
        .child(teamName("AWAY", "Times an agent stopped to wait for you today"))
        .child(div().px(6).py(1).rounded(5).border(1).border_color(t.border).text_size(11).font_weight(700).text_color(t.muted).tooltip("Minutes since your first agent started today").child(clock)))
      .child(h_flex().items_center()
        .child(cell(["working"])).child(divider()).child(cell(["blocked"])).child(divider())
        .child(cell(["done"])).child(divider()).child(cell(["idle", "unknown"])))
      .child(h_flex().gap(6).items_center().children(PITCHES.map(pitchChip)).child(autoChip));
  }

  paneHeader() {
    const t = theme(), p = pitchNow();
    const pane = panes().find((x) => x.pane === props()?.pane);
    const agent = agents().find((a) => a.pane === props()?.pane);
    const status = pane?.status;
    const ms = agent ? inStatus(agent, sinceMap()) : 0;
    const color = agent ? lateness(t, agent, ms) : status ? t[status] ?? t.muted : t.muted;
    const word = status && (status === "working" || status === "blocked") && ms ? `${CALL[status]} ${minutes(ms)}` : CALL[status] ?? status;
    return h_flex().size_full().px(10).gap(8).items_center().bg(t.chrome).text_size(12)
      .child(icon(pane?.program, 15))
      .child(div().font_weight(600).text_color(t.foreground).child(pane?.program?.name ?? "Terminal"))
      .child(div().text_color(t.dim).truncate().child(pane?.branch ? `on ${pane.branch}` : ""))
      .child(div().flex_1())
      .when(Boolean(status), (el) => el.child(h_flex().gap(5).items_center()
        .child(div().id(`dot-${props()?.pane}`).size(9).rounded(5)
          .when(status !== "working", (d) => d.bg(color))
          .when(status === "working", (d) => d.child(ball(p, 9)).loop("opacity", { from: 0.35, to: 1, period: 800 })))
        .child(div().font_weight(600).text_color(color).child(word))));
  }
}
