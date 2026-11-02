#!/usr/bin/env python3
"""Serve the tutor and write one status snapshot to status.json."""

import json
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATUS = ROOT / "status.json"
MAX_BYTES = 256 * 1024


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path.split("?", 1)[0] != "/status":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(400)
            return
        if length <= 0 or length > MAX_BYTES:
            self.send_error(413 if length > MAX_BYTES else 400)
            return
        try:
            data = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            self.send_error(400)
            return
        if not isinstance(data, dict):
            self.send_error(400)
            return
        text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
        temporary = STATUS.with_suffix(".json.tmp")
        temporary.write_text(text, encoding="utf-8")
        temporary.replace(STATUS)
        body = b'{"ok":true}\n'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    if len(sys.argv) != 2:
        print("usage: serve.py PORT", file=sys.stderr)
        return 2
    port = int(sys.argv[1])
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
