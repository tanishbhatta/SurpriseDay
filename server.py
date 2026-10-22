import html
import json
import os
import socket
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PORT = int(os.environ.get("PORT", 8000))
ADMIN_KEY = "pumpkypie" 
ROOT = os.path.dirname(os.path.abspath(__file__))
SPINS_FILE = os.path.join(ROOT, "spins.json")
HIDDEN = {"spins.json", "server.py", ".git", ".gitignore"}


def load_spins():
    try:
        with open(SPINS_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_text(self, code, body, ctype="text/plain; charset=utf-8"):
        data = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urlparse(self.path)
        first = url.path.lstrip("/").split("/")[0]
        if first in HIDDEN:
            return self.send_text(404, "Not found")
        if url.path == "/spins":
            if parse_qs(url.query).get("key", [""])[0] != ADMIN_KEY:
                return self.send_text(404, "Not found")
            return self.send_text(200, spins_page(load_spins()), "text/html; charset=utf-8")
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/spin":
            return self.send_text(404, "Not found")
        try:
            length = min(int(self.headers.get("Content-Length", 0)), 4096)
            data = json.loads(self.rfile.read(length) or b"{}")
            entry = {
                "result": str(data.get("result", ""))[:200],
                "spin": data.get("spin"),
                "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "device": self.headers.get("User-Agent", "")[:200],
            }
        except (ValueError, TypeError):
            return self.send_text(400, "Bad request")
        spins = load_spins()
        spins.append(entry)
        with open(SPINS_FILE, "w", encoding="utf-8") as f:
            json.dump(spins, f, indent=2, ensure_ascii=False)
        print(f"\n  🎁  SHE SPUN: {entry['result']}   ({entry['time']})\n", flush=True)
        self.send_text(200, '{"ok":true}', "application/json")

    def log_message(self, fmt, *args):
        pass  # keep the console quiet except for spins


def spins_page(spins):
    rows = "".join(
        f"<tr><td>{html.escape(s['time'])}</td><td><b>{html.escape(s['result'])}</b></td>"
        f"<td class=d>{html.escape(s.get('device', ''))}</td></tr>"
        for s in reversed(spins)
    ) or "<tr><td colspan=3>No spins yet.</td></tr>"
    return f"""<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Her spins</title><meta http-equiv=refresh content=10>
<style>body{{font-family:system-ui;background:#fde9ed;color:#8a1538;padding:16px;max-width:800px;margin:auto}}
table{{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}}
td,th{{padding:12px;border-bottom:1px solid #f3cfd8;text-align:left}}.d{{font-size:11px;color:#a2546b}}</style>
<h1>🎁 What she won</h1><p>Auto-refreshes every 10 seconds. Saved in spins.json.</p>
<table><tr><th>When</th><th>Gift</th><th>Device</th></tr>{rows}</table>"""


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "127.0.0.1"


if __name__ == "__main__":
    ip = lan_ip()
    print(f"""
  💗 Birthday site is live
     On this laptop : http://localhost:{PORT}
     Phone (same Wi-Fi): http://{ip}:{PORT}
     Her spins      : http://localhost:{PORT}/spins?key={ADMIN_KEY}
  Ctrl+C to stop.
""")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
