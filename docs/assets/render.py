#!/usr/bin/env python3
"""Regenerates the README images in this directory.

The terminal captures are not mock-ups: every command below is executed in a
throwaway clone of this repository and the image shows what it really printed.
Re-run after changing a script's output so the README never shows stale text.

    usage: python3 docs/assets/render.py        (needs git and google-chrome/chromium)
"""
import html
import os
import shutil
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

ASSETS = Path(__file__).resolve().parent
REPO = ASSETS.parent.parent
COLS = 92
LINE_PX = 21

# Assembled at runtime so no secret-shaped literal lives in a versioned file.
FAKE_AWS_KEY = "AKIA" + "ABCDEFGHIJKLMNOP"

SHOTS = [
    (
        "secret-blocked",
        "scripts/check-secrets.sh",
        [
            f"echo 'AWS_KEY = \"{FAKE_AWS_KEY}\"' | scripts/check-secrets.sh; echo \"exit code: $?\"",
            "echo 'AWS_KEY = \"YOUR_KEY_HERE\"' | scripts/check-secrets.sh; echo \"exit code: $?\"",
        ],
    ),
    (
        "broken-edit",
        "scripts/check-file.sh",
        [
            "printf '{\\n  \"name\": \"demo\",\\n}\\n' > settings.json",
            "scripts/check-file.sh settings.json; echo \"exit code: $?\"",
            "printf 'def export(rows:\\n    return rows\\n' > export.py",
            "scripts/check-file.sh export.py; echo \"exit code: $?\"",
        ],
    ),
    (
        "adapter-drift",
        "scripts/sync-adapters.sh",
        [
            "echo '- Ask about data retention in every spec.' >> agents/skills/spec-writer.md",
            "scripts/sync-adapters.sh --check; echo \"exit code: $?\"",
            "scripts/sync-adapters.sh",
            "git status --short",
        ],
    ),
    (
        "session-start",
        "a fresh clone",
        [
            "./init.sh",
            "ls agents/skills agents/reviewers",
            "scripts/sync-adapters.sh --check; echo \"exit code: $?\"",
        ],
    ),
]

CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: transparent; }
.win { width: 880px; background: #0d1117; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bar { height: 36px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; align-items: center; padding: 0 14px; }
.dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
.title { flex: 1; text-align: center; margin-right: 60px; color: #8b949e; font: 13px 'DejaVu Sans', 'Noto Sans', sans-serif; }
pre { padding: 16px 18px; color: #c9d1d9; font: 14px/21px 'DejaVu Sans Mono', monospace; white-space: pre; }
.p { color: #3fb950; } .c { color: #f0f6fc; font-weight: bold; }
.bad { color: #ff7b72; } .ok { color: #3fb950; } .err { color: #ffa657; }
"""

HERO_CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 1280px; height: 420px; background: #0d1117; color: #f0f6fc;
  font-family: 'DejaVu Sans', 'Noto Sans', sans-serif; padding: 56px 64px;
  background-image: radial-gradient(circle at 85% 0%, #1f6feb33, transparent 55%),
                    radial-gradient(circle at 0% 100%, #3fb95022, transparent 50%); }
.mark { font: bold 84px/1 'DejaVu Sans Mono', monospace; letter-spacing: 6px; }
.mark span { color: #3fb950; }
.tag { margin-top: 26px; font-size: 34px; font-weight: bold; }
.sub { margin-top: 14px; font-size: 20px; color: #8b949e; max-width: 900px; line-height: 1.5; }
.chips { margin-top: 34px; display: flex; gap: 12px; }
.chip { border: 1px solid #30363d; background: #161b22; border-radius: 999px; padding: 9px 18px;
  font: 16px 'DejaVu Sans Mono', monospace; color: #c9d1d9; }
.chip b { color: #3fb950; font-weight: normal; }
"""

HERO = """
<div class="mark"><span>&gt;</span> GAIDE</div>
<div class="tag">Instructions degrade. Mechanisms don't.</div>
<div class="sub">A project template that turns your AI coding agent's rules into
checks it cannot skip &mdash; spec first, tests first, human in command.</div>
<div class="chips">
  <div class="chip"><b>&#10003;</b> spec &rarr; plan &rarr; tasks &rarr; code</div>
  <div class="chip"><b>&#10003;</b> hooks + pre-commit + CI</div>
  <div class="chip"><b>&#10003;</b> any agent, one source of truth</div>
</div>
"""


def find_chrome():
    for name in ("google-chrome", "chromium", "chromium-browser"):
        if shutil.which(name):
            return name
    sys.exit("render.py needs google-chrome or chromium on PATH")


def screenshot(chrome, page, out, width, height):
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(page)
    try:
        subprocess.run(
            [chrome, "--headless=new", "--hide-scrollbars", "--default-background-color=00000000",
             "--force-device-scale-factor=2", f"--window-size={width},{height}",
             f"--screenshot={out}", f"file://{f.name}"],
            check=True, capture_output=True,
        )
    finally:
        os.unlink(f.name)
    print(f"wrote {out.relative_to(REPO)}")


def wrap(line):
    return textwrap.wrap(line, COLS, break_long_words=False, break_on_hyphens=False) or [""]


def style(line):
    """Wraps one output line, keeping its colour across the wrapped pieces."""
    if line.startswith("exit code: "):
        css = "ok" if line.endswith(": 0") else "bad"
    elif line.startswith(("Blocked", "drift:", "Invalid", "  File", "SyntaxError", "    ")):
        css = "err"
    else:
        return [html.escape(piece) for piece in wrap(line)]
    return [f'<span class="{css}">{html.escape(piece)}</span>' for piece in wrap(line)]


def render_shot(chrome, sandbox, name, title, commands):
    rows = []
    for command in commands:
        # stderr merged into stdout so the capture keeps the real interleaving.
        result = subprocess.run(["bash", "-c", command], cwd=sandbox, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        first, *rest = wrap(command)
        rows.append(f'<span class="p">$</span> <span class="c">{html.escape(first)}</span>')
        rows.extend(f'<span class="c">    {html.escape(r)}</span>' for r in rest)
        for line in result.stdout.splitlines():
            rows.extend(style(line))
    dots = "".join(f'<div class="dot" style="background:{c}"></div>' for c in ("#ff5f56", "#ffbd2e", "#27c93f"))
    page = (f"<meta charset='utf-8'><style>{CSS}</style><div class='win'><div class='bar'>{dots}"
            f"<div class='title'>{html.escape(title)}</div></div><pre>{chr(10).join(rows)}</pre></div>")
    screenshot(chrome, page, ASSETS / f"{name}.png", 880, 36 + 32 + LINE_PX * len(rows) + 2)


def main():
    chrome = find_chrome()
    screenshot(chrome, f"<meta charset='utf-8'><style>{HERO_CSS}</style>{HERO}", ASSETS / "hero.png", 1280, 420)
    for name, title, commands in SHOTS:
        # A fresh clone per shot: each capture starts from the committed state.
        with tempfile.TemporaryDirectory() as tmp:
            sandbox = Path(tmp) / "my-project"
            subprocess.run(["git", "clone", "-q", str(REPO), str(sandbox)], check=True)
            render_shot(chrome, sandbox, name, title, commands)


if __name__ == "__main__":
    main()
