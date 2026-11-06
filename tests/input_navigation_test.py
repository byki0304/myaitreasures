"""Starting from empty input must never submit/navigate while typing or confirming IME."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),headless=True)
    for width,height in [(1440,1000),(360,800),(844,390)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        navigations=[];errors=[]
        page.on('framenavigated',lambda f:navigations.append(f.url))
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto((ROOT/'index.html').as_uri())
        page.locator('[data-action=start]').click()
        for selector,value in [('#meeting','친구 모임'),('#person-1','홍길동'),('#person-2','김하늘'),('#detail-3','저녁 식사'),('#amount-3','12000')]:
            field=page.locator(selector)
            field.click();field.press_sequentially(value,delay=5)
            field.press('Enter')
            assert page.evaluate('view')=='input',(width,selector)
            assert field.input_value()==value
        page.locator('#meeting').evaluate('''el=>{
          el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));
          el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,keyCode:229,bubbles:true,cancelable:true}));
          el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'모임'}));
          el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        }''')
        assert page.evaluate('view')=='input'
        assert page.locator('#meeting').input_value()=='친구 모임'
        assert page.locator('#settlement-form').evaluate('''form=>!form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))''')
        assert len(navigations)==1,navigations
        page.locator('#payer-3').select_option('1')
        page.locator('.calculate-main').click()
        assert page.evaluate('view')=='output'
        assert page.evaluate('result.total')==12000
        assert len(navigations)==1
        page.locator('.tabs [data-action=input]').click()
        page.locator('#meeting').press('Enter')
        assert page.evaluate('view')=='input'
        page.locator('[data-action=home]').click()
        assert page.evaluate('view')=='home'
        page.locator('[data-action=start]').click()
        assert page.locator('#meeting').input_value()=='친구 모임'
        assert not errors,errors
        page.close()
    browser.close()
print('PASS: empty start, real typing/Enter, IME events, native submit prevention, explicit calculation, deliberate home, desktop/portrait/landscape')
