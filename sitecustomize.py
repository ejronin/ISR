from pathlib import Path
import hashlib
p = Path(__file__).resolve().parent / "js" / "public-bootstrap.js"
if p.is_file():
    data = p.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")
    print("ISSUE100_BOOTSTRAP_SHA256=" + hashlib.sha256(data).hexdigest())
