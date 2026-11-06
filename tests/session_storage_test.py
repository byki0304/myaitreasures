"""Real HTTP browser sessions: reload, tab isolation, reset, corruption, denied storage."""
import os
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),headless=True)
  context=b.new_context(viewport={'width':360,'height':800});page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);page.locator('[data-action=start]').click()
  page.locator('#meeting').fill('임시 저장 모임')
  page.locator('#person-1').fill('수진')
  page.locator('#detail-3').fill('식사')
  page.locator('#amount-3').fill('12345')
  page.evaluate('saveQueue')
  page.reload();page.locator('#meeting').wait_for()
  assert page.locator('#meeting').input_value()=='임시 저장 모임'
  assert page.locator('#person-1').input_value()=='수진'
  assert page.locator('#amount-3').input_value()=='12345'
  # Separate tab, same browser context and origin; no copied opener.
  other=context.new_page();other.goto(url)
  assert other.locator('[data-action=start]').is_visible();other.locator('[data-action=start]').click()
  assert other.locator('#meeting').input_value()=='';other.close()
  page.locator('[data-action=home]').click();page.locator('[data-language=en]').click();page.locator('[data-action=demo]').click()
  page.locator('.calculate-main').click();page.locator('#selected-person').select_option('3');page.evaluate('saveQueue')
  page.reload();page.locator('#selected-person').wait_for()
  assert page.locator('html').get_attribute('lang')=='en'
  assert page.locator('#selected-person').input_value()=='3'
  assert page.evaluate('result.total')==1727
  page.set_viewport_size({'width':844,'height':390})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('.mobile-nav [data-action=new]').click();page.locator('#confirm-reset').click();page.evaluate('saveQueue')
  page.reload();page.locator('#meeting').wait_for();assert page.locator('#meeting').input_value()==''
  assert page.locator('#currency').input_value()=='JPY'
  page.evaluate("sessionStorage.setItem(TreasuresStorage.KEY,'{not-json')")
  page.reload();page.locator('[data-action=start]').wait_for()
  page.evaluate("sessionStorage.setItem(TreasuresStorage.KEY,JSON.stringify({version:1,data:{meeting:4}}))")
  page.reload();page.locator('[data-action=start]').wait_for()
  blocked=b.new_context();blocked.add_init_script("Object.defineProperty(window,'sessionStorage',{get(){throw new Error('blocked')}})")
  q=blocked.new_page();q.goto(url);q.locator('[data-action=start]').click();q.locator('#meeting').fill('memory only')
  assert q.locator('#notice').is_visible();assert q.locator('#meeting').input_value()=='memory only'
  assert not errors,errors
  b.close()
 print('PASS: HTTP reload recovery (partial inputs/results/language/selection), independent tabs, reset persistence, corrupted storage, denied storage, portrait/landscape')
finally:server.shutdown();server.server_close()
