"""Tiny local collector for the in-app FPS meter (POSTs of one JSON summary per second).

Appends every received summary to the output file as `[perf:<platform>] {json}` so that
analyzeRenderFps.py can read it. Usage: perfSink.py <platform> <outputFile> [port=8793]
"""
import http.server
import sys

platform, output_path = sys.argv[1], sys.argv[2]
port = int(sys.argv[3]) if len(sys.argv) > 3 else 8793


class SinkHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode()
        with open(output_path, "a") as output:
            output.write(f"[perf:{platform}] {body}\n")
        self.send_response(204)
        self.end_headers()

    def log_message(self, *_):
        pass


http.server.HTTPServer(("127.0.0.1", port), SinkHandler).serve_forever()
