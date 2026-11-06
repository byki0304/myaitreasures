"""Member-specific message drafting, copy paths, translations and responsive dialog."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'index.html').as_uri())
    page.locator('[data-action=demo]').click();page.locator('.calculate-main').click()
    assert page.locator('[data-message-person]').count()==3
    for member,amount,label in [(1,'524엔','받을 금액'),(2,'51엔','보낼 금액'),(3,'473엔','보낼 금액')]:
        page.locator(f'[data-message-person="{member}"]').click()
        text=page.locator('#member-message-text').input_value()
        assert f'받는 사람: {"ABC"[member-1]}' in text
        assert '친구 모임 · 2026-11-06' in text
        assert all(x in text for x in ['식사','간식','물품','1,727엔','선결제액','최종 부담액'])
        assert f'{label}: {amount}' in text.split('[이 멤버의 정산 안내]')[1]
        if member==1:
            summary=text.split('[이 멤버의 정산 안내]')[1]
            assert '송금할 금액이 없습니다.' in summary and 'B → A: 51엔' in summary and 'C → A: 473엔' in summary
        page.locator('#close-member-message').click()
    page.locator('[data-message-person="2"]').click()
    text=page.locator('#member-message-text').input_value()
    page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text)=>{window.copiedMessage=text}}})")
    page.locator('#copy-member-message').click()
    assert page.evaluate('window.copiedMessage')==text
    assert '복사했습니다' in page.locator('#member-message-status').inner_text()
    page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}})")
    page.locator('#copy-member-message').click()
    assert '직접 선택' in page.locator('#member-message-status').inner_text()
    assert page.locator('#member-message-text').evaluate('(x)=>x.selectionEnd-x.selectionStart')==len(text)
    page.keyboard.press('Escape')
    assert not page.locator('#member-message-dialog').is_visible()
    page.locator('.tabs [data-action=input]').click()
    page.locator('[data-expense]').first.locator('[data-member="3"]').uncheck()
    page.locator('.calculate-main').click()
    page.locator('[data-message-person="2"]').click()
    assert '보낼 금액: 234엔' in page.locator('#member-message-text').input_value().split('[이 멤버의 정산 안내]')[1]
    page.locator('#close-member-message').click()
    page.evaluate("data.expenses.forEach(e=>{e.amount='300';e.tax=0;e.members=[1,2,3]});calculate()")
    page.locator('[data-message-person="1"]').click()
    summary=page.locator('#member-message-text').input_value().split('[이 멤버의 정산 안내]')[1]
    assert '추가 송금·수취 없음: 0엔' in summary
    page.locator('#close-member-message').click()
    for lang in ['ko','en','ja']:
        page.locator('#language').select_option(lang)
        for width,height in [(1440,1000),(320,740),(844,390)]:
            page.set_viewport_size({'width':width,'height':height})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.locator('[data-message-person="2"]').click()
            dialog=page.locator('#member-message-dialog')
            assert dialog.evaluate('(x)=>x.scrollWidth<=x.clientWidth')
            assert dialog.evaluate('(x)=>{const r=x.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}')
            if lang!='ko':
                # User-entered descriptions are preserved; translated personal summary has no Korean UI text.
                text=page.locator('#member-message-text').input_value()
                heading=page.evaluate('t().memberMessageSummary')
                assert not any('\uac00'<=ch<='\ud7a3' for ch in text.split('['+heading+']')[1])
            page.locator('#close-member-message').click()
    assert not errors,errors
    browser.close()
    print('PASS: all-member buttons, payer/receiver/zero-balance drafts, full ledger, copy success/fallback, recalculation, 3 languages, desktop/portrait/landscape dialog bounds')
