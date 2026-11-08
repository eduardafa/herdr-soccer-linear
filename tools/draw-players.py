import math, os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
INK = "#000"
CLOTH = "#ffffff"
SHORTS = "#1d2433"
SHORTS_EDGE = "#0f141f"
BOOT = "#1b1d22"
BOOT_STRIPE = "#f2f2f2"
STUD = "#5c636e"
EYE = "#241a15"
MOUTH = "#6b3326"
BLUSH = "#ff7a7a"
SHADE = "#000000"


def write(name, w, h, body):
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>\n')


def mirrored(body, w):
    return f'<g transform="translate({w} 0) scale(-1 1)">{body}</g>'


def bent(points, width=4.6, color=INK):
    d = "M" + "L".join(f"{x} {y}" for x, y in points)
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'


def arm(points):
    hx, hy = points[-1]
    return bent(points) + f'<circle cx="{hx}" cy="{hy}" r="2.6" fill="{INK}"/>'


def toward(a, b, length):
    ux, uy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(ux, uy)
    return (round(a[0] + ux / n * length, 2), round(a[1] + uy / n * length, 2))


def sleeve(points):
    return bent([points[0], toward(points[0], points[1], 4.4)], 7.4)


W, H = 60, 74
HEAD = (22, 12.5, 8.6)
HAIR_TOP = "M13.6 14.2q-1.4-10.2 8.6-10.8q8.8.2 9.4 7.6q-3.2-1.6-6.2-1q-1 2.6-4.4 2.2q-2.8 3.4-7.4 2z"
HAIR_BUZZ = "M13.8 12.8q-.2-8.6 8.2-9q8.2.2 9.2 6.6q-4.6-1.8-9-.8q-4.6 1-8.4 3.2z"
FACE = (
    f'<ellipse cx="25.4" cy="13.6" rx="1.05" ry="1.35" fill="{EYE}"/>'
    f'<ellipse cx="29.2" cy="13.4" rx=".95" ry="1.3" fill="{EYE}"/>'
    f'<circle cx="25.7" cy="13.1" r=".35" fill="#fff"/><circle cx="29.45" cy="12.9" r=".32" fill="#fff"/>'
    f'<path d="M25 17q1.5 1.2 3 0" fill="none" stroke="{MOUTH}" stroke-width=".9" stroke-linecap="round"/>'
    f'<ellipse cx="23.6" cy="16.3" rx="1.7" ry="1.1" fill="{BLUSH}" opacity=".32"/>'
)
HEAD_SKIN = (
    f'<rect x="19.2" y="17" width="5.8" height="7" fill="{INK}"/>'
    f'<circle cx="{HEAD[0]}" cy="{HEAD[1]}" r="{HEAD[2]}" fill="{INK}"/>'
    f'<ellipse cx="18.2" cy="14.6" rx="1.8" ry="2.2" fill="{INK}"/>'
)
JERSEY = {
    "man": "M10.4 24.4q1.4-3.8 8.8-4.4q3.4 1.6 6.4 0q7.6.6 9 4.4l-2.8 4.2l-.4 14.8H13.6l-.4-14.8z",
    "woman": "M12.6 23.8q1.4-3.2 6.8-3.8q3.2 1.6 6.4 0q5.4.6 6.8 3.8l-2.2 3.6q.4 3.4-.4 6q1.6 4.6 2 9.4H13.2q.4-4.8 2-9.4q-.8-2.6-.4-6z",
}
VNECK = f'<path d="M19.2 20.2L22.4 24.4L25.6 20.2" fill="none" stroke="{CLOTH}" stroke-width="1.2" stroke-linejoin="round"/>'
SHORTS_SHAPE = {
    "man": "M13.4 42.2h18.8l1.2 10.6h-8.6l-1.8-4l-1.8 4H12.4z",
    "woman": "M13.6 42h18.4l1.2 9.8h-8.4l-1.8-3.6l-1.8 3.6H12.6z",
}


def jersey_shade(kind):
    return (
        f'<clipPath id="jersey-{kind}"><path d="{JERSEY[kind]}"/></clipPath>'
        f'<path clip-path="url(#jersey-{kind})" d="M27.4 18q4.6 10 4 26H40V18z" fill="{SHADE}" opacity=".14"/>'
    )


def shorts(kind):
    return (
        f'<path d="{SHORTS_SHAPE[kind]}" fill="{SHORTS}" stroke="{SHORTS_EDGE}" stroke-width=".8"/>'
        f'<path d="M14.2 43v8.8M31.6 43l.8 8.8" stroke="{CLOTH}" stroke-width="1" opacity=".85"/>'
    )


STAND = [[(18.8, 44), (17, 54), (16.2, 63.4)], [(26.4, 44), (28.6, 54), (29.8, 63.2)]]
LEGS = {
    "run": [[(18.8, 44), (19.8, 54), (19.2, 63.4)], [(26.4, 44), (22.8, 53.4), (14.8, 57.4)]],
    "kick": [[(18.8, 44), (18.2, 54), (17.4, 63.4)], [(26.4, 44), (33.4, 50.2), (40.8, 53.2)]],
    "juggle": [[(18.8, 44), (18.6, 54), (18.2, 63.4)], [(26.4, 44), (32.6, 49), (32, 57.6)]],
    "var": STAND,
    "goal": [[(18.8, 44), (14.8, 52.6), (15.2, 61.4)], [(26.4, 44), (30.8, 52.6), (30.2, 61.4)]],
}
BOOT_ANGLE = {"run": [0, 160], "kick": [0, -14], "juggle": [0, -8], "var": [0, 0], "goal": [0, 0]}


def boot(ankle, angle):
    x, y = ankle
    return (
        f'<g transform="translate({x} {y}) rotate({angle})">'
        f'<path d="M-2.6 -2.6h4.2q1.4 1.6 4 2q3 .6 3 2.4v.8h-11.2q-.6 0-.6-1.2z" fill="{BOOT}"/>'
        f'<path d="M-1.4 -.8l3.4 1.2M1.2 -1.4l3.2 1.2" stroke="{BOOT_STRIPE}" stroke-width=".8" stroke-linecap="round"/>'
        f'<path d="M-2.4 4h1.4M2 4h1.4M6 4h1.4" stroke="{STUD}" stroke-width="1" stroke-linecap="round"/>'
        f'</g>'
    )


def sock(leg):
    knee, ankle = leg[1], leg[2]
    return bent([toward(knee, ankle, 2.6), toward(ankle, knee, 0.6)], 6)


def pose_legs(pose):
    return "".join(bent(leg, 5.6) for leg in LEGS[pose])


def pose_socks(pose):
    return "".join(sock(leg) for leg in LEGS[pose])


def pose_boots(pose):
    ground = f'<ellipse cx="23" cy="69.6" rx="16" ry="3.4" fill="{SHADE}" opacity=".22"/>'
    legs = LEGS[pose]
    return ground + "".join(boot(leg[2], a) for leg, a in zip(legs, BOOT_ANGLE[pose]))


BACK, FRONT = (15.2, 24.6), (29.6, 24.6)
BROADER = 2.6
ARMS = {
    "run": ([BACK, (10.4, 30), (6.2, 34.4)], [FRONT, (35, 30.4), (39.6, 34.4)]),
    "kick": ([BACK, (9.6, 27.6), (4.6, 29.6)], [FRONT, (35.6, 28.4), (40.6, 31)]),
    "juggle": ([BACK, (11, 31.4), (9.6, 37.8)], [FRONT, (33.8, 31.4), (35.8, 37.6)]),
    "var": ([BACK, (13.2, 31.6), (15.6, 26.2)], [FRONT, (32, 31.6), (29.6, 26.2)]),
    "goal": ([BACK, (10.6, 17), (7.6, 8.6)], [FRONT, (34.6, 17), (37.6, 8.6)]),
}
VAR_SCREEN = (
    f'<rect x="15.6" y="26.2" width="14" height="10.4" rx="1" fill="{CLOTH}" fill-opacity=".18" stroke="{CLOTH}" stroke-width="1.1" stroke-dasharray="2 1.4"/>'
)


def broadened(points, dx):
    (sx, sy), (ex, ey), *rest = points
    return [(round(sx + dx, 2), sy), (round(ex + dx / 2, 2), ey), *rest]


HAIR = {
    "short": f'<path d="{HAIR_TOP}" fill="{INK}"/><path d="M13.6 14.2q-.6 3.8 1.6 5.6q.4-3 1.2-5.2z" fill="{INK}"/>',
    "buzz": f'<path d="{HAIR_BUZZ}" fill="{INK}"/>',
    "ponytail": f'<path d="{HAIR_TOP}" fill="{INK}"/>'
    f'<path d="M15 8.6q-6.4-.8-8.4 5.6q-1.4 5 .6 12.4q1.6-3.6 3.2-5.8q1.6-3.6 1.4-7.6q1.2-2.6 3.6-3.4z" fill="{INK}"/>'
    f'<path d="M13.6 14.2q-.4 3.4 1.2 5.2l.8-4.8z" fill="{INK}"/>',
    "bun": f'<path d="{HAIR_TOP}" fill="{INK}"/><circle cx="12.6" cy="6.6" r="4.6" fill="{INK}"/>'
    f'<path d="M13.6 14.2q-.4 3.4 1.2 5.2l.8-4.8z" fill="{INK}"/>',
}

BODY = {"head": HEAD_SKIN}
for style, body in HAIR.items():
    BODY[f"hair-{style}"] = body
for kind in ("man", "woman"):
    BODY[f"jersey-{kind}"] = f'<path d="{JERSEY[kind]}" fill="{INK}"/>'
    BODY[f"kit-{kind}"] = shorts(kind) + jersey_shade(kind) + VNECK + FACE

for side, flip in (("r", False), ("l", True)):
    wrap = (lambda b: mirrored(b, W)) if flip else (lambda b: b)
    for name, body in BODY.items():
        write(f"{name}-{side}", W, H, wrap(body))
    for pose in LEGS:
        write(f"legs-{pose}-{side}", W, H, wrap(pose_legs(pose)))
        write(f"socks-{pose}-{side}", W, H, wrap(pose_socks(pose)))
        write(f"boots-{pose}-{side}", W, H, wrap(pose_boots(pose)))
    for pose, (back, front) in ARMS.items():
        for kind, reach in (("woman", 0), ("man", BROADER)):
            b, f = broadened(back, -reach), broadened(front, reach)
            write(f"arms-{pose}-{kind}-{side}", W, H, wrap(arm(b) + arm(f)))
            write(f"sleeves-{pose}-{kind}-{side}", W, H, wrap(sleeve(b) + sleeve(f)))
    write(f"var-screen-{side}", W, H, wrap(VAR_SCREEN))

BW, BH = 40, 52
BHEAD = (20, 10.2, 7.6)
BENCH_FACE = (
    f'<ellipse cx="17.3" cy="11" rx=".95" ry="1.25" fill="{EYE}"/><ellipse cx="22.7" cy="11" rx=".95" ry="1.25" fill="{EYE}"/>'
    f'<circle cx="17.6" cy="10.5" r=".32" fill="#fff"/><circle cx="23" cy="10.5" r=".32" fill="#fff"/>'
    f'<path d="M18.4 14.2q1.6 1.2 3.2 0" fill="none" stroke="{MOUTH}" stroke-width=".85" stroke-linecap="round"/>'
    f'<ellipse cx="15.6" cy="13.4" rx="1.4" ry=".9" fill="{BLUSH}" opacity=".32"/><ellipse cx="24.4" cy="13.4" rx="1.4" ry=".9" fill="{BLUSH}" opacity=".32"/>'
)
BENCH_ARMS = {
    "woman": [[(11.6, 19.4), (8.4, 26.2), (8.2, 32.6)], [(28.4, 19.4), (31.6, 26.2), (31.8, 32.6)]],
    "man": [[(10.2, 19.4), (7.4, 26.2), (7.6, 32.6)], [(29.8, 19.4), (32.6, 26.2), (32.4, 32.6)]],
}
BENCH_JERSEY = {
    "man": "M9 20q1.8-3.6 8.2-3.8q2.8 1.4 5.6 0q6.4.2 8.2 3.8l-2.4 3.4l-.2 8.6H11.6l-.2-8.6z",
    "woman": "M10.6 19.6q1.6-3.2 6.6-3.4q2.8 1.4 5.6 0q5 .2 6.6 3.4l-2 3q.4 2.4-.2 4.2q1.4 2.4 1.8 5.2H10.8q.4-2.8 1.8-5.2q-.6-1.8-.2-4.2z",
}
BENCH_SHORTS = {
    "man": "M11.4 31.4h17.2l.6 6.4h-7.8l-1.4-2.4l-1.4 2.4H10.8z",
    "woman": "M11.8 31.2h16.4l.6 6h-7.4l-1.4-2.2l-1.4 2.2H11.2z",
}
BENCH_LOWER = [[(14.6, 36), (14.6, 45.4)], [(25.4, 36), (25.4, 45.4)]]
BENCH_HAIR = {
    "short": "M12.4 10.4q-.6-8.4 7.6-8.6q8.2.2 7.6 8.6q-1-3.2-3.2-4q-4.4 1.6-9.6.4q-1.8 1.2-2.4 3.6z",
    "buzz": "M12.8 8.6q.2-6.8 7.2-6.8t7.2 6.8q-3-2.2-7.2-2.2t-7.2 2.2z",
}
BENCH = {
    "bench-hair-short": f'<path d="{BENCH_HAIR["short"]}" fill="{INK}"/>',
    "bench-hair-buzz": f'<path d="{BENCH_HAIR["buzz"]}" fill="{INK}"/>',
    "bench-hair-ponytail": f'<path d="{BENCH_HAIR["short"]}" fill="{INK}"/>'
    f'<path d="M26.6 5.6q5.2.4 5.4 6.4q0 3.6-1.6 6.6q-.8-3.4-2.6-5.2q.2-3.6-1.2-7.8z" fill="{INK}"/>',
    "bench-hair-bun": f'<path d="{BENCH_HAIR["short"]}" fill="{INK}"/><circle cx="20" cy="1.8" r="3.2" fill="{INK}"/>',
    "bench-socks": "".join(bent([(x, 39.4), (x, 45)], 5.4) for x in (14.6, 25.4)),
}


def bench_boot(x):
    return (
        f'<path d="M{x - 4} 49.4q0-3.4 2.4-3.8h3.2q2.4.2 2.4 3.8z" fill="{BOOT}"/>'
        f'<path d="M{x - 3.6} 50h7.2" stroke="{STUD}" stroke-width="1" stroke-linecap="round" stroke-dasharray="1.2 1.6"/>'
    )


for kind in ("man", "woman"):
    BENCH[f"bench-skin-{kind}"] = (
        "".join(bent(seg, 5) for seg in BENCH_LOWER)
        + f'<rect x="17.2" y="14.6" width="5.6" height="4.4" fill="{INK}"/>'
        + f'<circle cx="{BHEAD[0]}" cy="{BHEAD[1]}" r="{BHEAD[2]}" fill="{INK}"/>'
        + f'<ellipse cx="12.4" cy="11.2" rx="1.4" ry="2" fill="{INK}"/><ellipse cx="27.6" cy="11.2" rx="1.4" ry="2" fill="{INK}"/>'
        + arm(BENCH_ARMS[kind][0]) + arm(BENCH_ARMS[kind][1])
    )
    BENCH[f"bench-jersey-{kind}"] = (
        f'<path d="{BENCH_JERSEY[kind]}" fill="{INK}"/>' + sleeve(BENCH_ARMS[kind][0]) + sleeve(BENCH_ARMS[kind][1])
    )
    BENCH[f"bench-kit-{kind}"] = (
        f'<ellipse cx="20" cy="50.6" rx="14" ry="2.2" fill="{SHADE}" opacity=".22"/>'
        + bench_boot(14.6) + bench_boot(25.4)
        + f'<path d="{BENCH_SHORTS[kind]}" fill="{SHORTS}" stroke="{SHORTS_EDGE}" stroke-width=".7"/>'
        + f'<path d="M17.4 16.4L20 19.8L22.6 16.4" fill="none" stroke="{CLOTH}" stroke-width="1" stroke-linejoin="round"/>'
        + BENCH_FACE
    )

for name, body in BENCH.items():
    write(name, BW, BH, body)


def ball(name, base, patch, seam, edge):
    pentagon = lambda cx, cy, r, rot: "M" + "L".join(
        f"{cx + r * math.cos(math.radians(rot + 72 * k)):.2f} {cy + r * math.sin(math.radians(rot + 72 * k)):.2f}" for k in range(5)
    ) + "Z"
    outer = [(12 + 11.2 * math.cos(math.radians(-90 + 72 * k)), 12 + 11.2 * math.sin(math.radians(-90 + 72 * k))) for k in range(5)]
    inner = [(12 + 4.6 * math.cos(math.radians(-90 + 72 * k)), 12 + 4.6 * math.sin(math.radians(-90 + 72 * k))) for k in range(5)]
    seams = "".join(f'<path d="M{ix:.2f} {iy:.2f}L{ox:.2f} {oy:.2f}"/>' for (ix, iy), (ox, oy) in zip(inner, outer))
    write(
        name, 24, 24,
        f'<defs><radialGradient id="shine" cx=".34" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="{base}"/></radialGradient>'
        '<clipPath id="ball"><circle cx="12" cy="12" r="11.2"/></clipPath></defs>'
        '<circle cx="12" cy="12" r="11.2" fill="url(#shine)"/>'
        f'<g clip-path="url(#ball)"><g stroke="{seam}" stroke-width=".9" fill="none">{seams}</g>'
        f'<path d="{pentagon(12, 12, 4.6, -90)}" fill="{patch}"/>'
        + "".join(f'<path d="{pentagon(ox, oy, 4.2, -90 + 72 * k + 36)}" fill="{patch}"/>' for k, (ox, oy) in enumerate(outer))
        + f'</g><circle cx="12" cy="12" r="11.2" fill="none" stroke="{edge}" stroke-width="1"/>',
    )


ball("ball", "#e3e6ea", "#1d2026", "#8d939c", "#6c727b")
