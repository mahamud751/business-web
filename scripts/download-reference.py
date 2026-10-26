from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
import re
class Assets(HTMLParser):
 def __init__(self):super().__init__();self.urls=set()
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='img' and d.get('src','').startswith('/'):self.urls.add(d['src'])
  if tag=='link' and d.get('rel')=='stylesheet':self.urls.add(d['href'])
p=Assets();p.feed(Path('/tmp/tuhfa.html').read_text())
def download(url):
 dest=Path('public')/url.lstrip('/')
 dest.parent.mkdir(parents=True,exist_ok=True)
 try:
  data=urlopen('https://tuhfamart.com'+url,timeout=30).read();dest.write_bytes(data)
  if url.endswith('.css'):
   for asset in re.findall(r'url\([\"\']?([^\)\"\']+)',data.decode()):
    if asset.startswith('/'):download(asset)
  return str(dest)
 except Exception as e:return f'FAILED {url}: {e}'
with ThreadPoolExecutor(max_workers=8) as pool:
 for result in pool.map(download,p.urls):print(result)
