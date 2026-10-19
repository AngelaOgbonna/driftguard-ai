"""Assemble the deployable index.html from src/ (shell markup + analysis engine + app logic).

Usage: python3 build.py [--fragment OUT]   # --fragment also writes a body-only copy (no <html>/<head> wrapper)
"""
import sys, pathlib
here = pathlib.Path(__file__).parent
shell = (here / "src/shell.html").read_text()
script = '<script>\n"use strict";\n' + (here / "src/engine.js").read_text() + "\n" + (here / "src/app.js").read_text() + "\n</script>\n"
cut = shell.index("<!-- ======================= SIGN IN")
head, body = shell[:cut], shell[cut:]
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + head + '</head>\n<body>\n' + body + script + '</body>\n</html>\n')
(here / "index.html").write_text(page)
if "--fragment" in sys.argv:
    pathlib.Path(sys.argv[sys.argv.index("--fragment") + 1]).write_text(shell + script)
print("built index.html", len(page), "bytes")
