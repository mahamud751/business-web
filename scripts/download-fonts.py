from pathlib import Path
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
import re
p=Path('app/reference.css');s=p.read_text();assets=set(re.findall(r'url\(\.\./media/([^)]*)\)',s))
Path('public/fonts').mkdir(exist_ok=True)
def get(name):
 Path('public/fonts',name).write_bytes(urlopen('https://tuhfamart.com/_next/static/media/'+name,timeout=30).read())
with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(get,assets))
p.write_text(s.replace('../media/','/fonts/'));print('Downloaded',len(assets),'fonts')
