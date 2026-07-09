import io
import urllib.parse
import os
import sys

# Ensure project root is in the path so we can import app and core modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import CustomHTTPRequestHandler

class VercelHTTPRequestHandler(CustomHTTPRequestHandler):
    def __init__(self, environ, rfile, wfile):
        self.environ = environ
        self.rfile = rfile
        self.wfile = wfile
        self.client_address = (environ.get('REMOTE_ADDR', '127.0.0.1'), int(environ.get('REMOTE_PORT', '0') or '0'))
        self.server = None
        self.close_connection = True
        
        # Build headers
        from http.client import HTTPMessage
        self.headers = HTTPMessage()
        for key, val in environ.items():
            if key.startswith('HTTP_'):
                header_name = key[5:].replace('_', '-').title()
                self.headers.add_header(header_name, val)
            elif key in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
                header_name = key.replace('_', '-').title()
                self.headers.add_header(header_name, val)
        
        # Build path and method
        self.command = environ.get('REQUEST_METHOD', 'GET')
        path_info = environ.get('PATH_INFO', '/')
        query_string = environ.get('QUERY_STRING', '')
        if query_string:
            self.path = f"{path_info}?{query_string}"
        else:
            self.path = path_info
        
        # Set protocol version
        self.request_version = environ.get('SERVER_PROTOCOL', 'HTTP/1.1')
        
        # Initialize database automatically if we are on Vercel
        from core.db_manager import init_db
        try:
            # init_db will run tables creation and seed if tables don't exist
            init_db()
        except Exception as e:
            print(f"Failed to initialize database: {e}", file=sys.stderr)

        # Now run the request!
        if self.command == 'GET':
            self.do_GET()
        elif self.command == 'POST':
            self.do_POST()
        elif self.command == 'OPTIONS':
            if hasattr(self, 'do_OPTIONS'):
                self.do_OPTIONS()
            else:
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, Cookie')
                self.end_headers()

    # Override socket-related methods so they don't crash
    def setup(self):
        pass

    def handle(self):
        pass

    def finish(self):
        pass

    # Override log_message so it prints to stderr/stdout on Vercel
    def log_message(self, format, *args):
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.client_address[0],
                          self.log_date_time_string(),
                          format%args))


def app(environ, start_response):
    # Determine the request body input
    content_length = int(environ.get('CONTENT_LENGTH', 0) or 0)
    request_body = environ['wsgi.input'].read(content_length) if content_length else b''
    rfile = io.BytesIO(request_body)
    wfile = io.BytesIO()
    
    # Run the handler
    handler = VercelHTTPRequestHandler(environ, rfile, wfile)
    
    # Parse the output
    wfile.seek(0)
    wfile_val = wfile.read()
    
    body_start = wfile_val.find(b'\r\n\r\n')
    if body_start == -1:
        # Fallback if no clean header separator
        status = '500 Internal Server Error'
        headers = [('Content-Type', 'text/plain')]
        body = b'Internal Server Error: Invalid response from request handler.'
    else:
        headers_part = wfile_val[:body_start]
        body = wfile_val[body_start + 4:]
        
        lines = headers_part.decode('utf-8', errors='ignore').split('\r\n')
        status_line = lines[0]
        # status_line format: "HTTP/1.1 200 OK"
        status_parts = status_line.split(' ', 2)
        if len(status_parts) >= 2:
            status = f"{status_parts[1]} {status_parts[2]}" if len(status_parts) > 2 else f"{status_parts[1]} OK"
        else:
            status = '200 OK'
            
        headers = []
        for line in lines[1:]:
            if ':' in line:
                name, val = line.split(':', 1)
                headers.append((name.strip(), val.strip()))
                
    start_response(status, headers)
    return [body]
