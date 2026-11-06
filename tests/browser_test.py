"""Run with Python + Playwright; CHROME_PATH can select a local Chromium browser."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
SHOTS=ROOT/'docs/screenshots'
SHOTS.mkdir(parents=True,exist_ok=True)
chrome=os.environ.get('CHROME_PATH','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')

def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),page.evaluate('[innerWidth,document.documentElement.scrollWidth]')

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=chrome,headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    errors=[]; external=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) else None)
    page.goto((ROOT.parent/'index.html').as_uri())
    assert page.locator('html').get_attribute('lang')=='ko'
    page.screenshot(path=str(SHOTS/'desktop-home.png'),full_page=True)
    page.locator('[data-action=start]').click()
    page.locator('.calculate-main').click()
    assert page.locator('#error-meeting').is_visible()
    assert page.locator('#error-person-1').is_visible()
    assert page.locator('#error-members-3').is_hidden() # default people selected
    page.locator('[data-action=home]').click()
    page.locator('[data-action=demo]').click()
    assert page.locator('#meeting').input_value()=='친구 모임'
    page.screenshot(path=str(SHOTS/'desktop-input.png'),full_page=True)
    page.locator('.calculate-main').click()
    assert page.evaluate('result.total')==1727
    assert page.evaluate('result.rows.map(p=>p.share)')==[576,576,575]
    assert page.evaluate('result.transfers.map(p=>p.amount)')==[51,473]
    page.screenshot(path=str(SHOTS/'desktop-results.png'),full_page=True)
    page.locator('#selected-person').select_option('3')
    assert '473' in page.locator('#personal-details').inner_text()
    text=page.evaluate('guideText()')
    assert '2026-11-06' in text and '1,727' in text
    page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('not allowed')}}})")
    page.locator('.result-actions [data-action=copy]').click()
    assert page.locator('#manual-text').input_value()==text
    page.locator('[data-action=select-copy]').click()
    assert page.locator('#manual-text').evaluate('(x)=>x.selectionEnd-x.selectionStart')==len(text)
    page.locator('.tabs [data-action=input]').click()
    page.locator('[data-expense]').first.locator('[data-member="3"]').uncheck()
    page.locator('.calculate-main').click()
    assert page.evaluate('result.rows.map(p=>p.share)')==[759,759,209]
    page.locator('.tabs [data-action=input]').click()
    page.locator('[data-expense]').first.locator('[data-members-all=false]').click()
    page.locator('.calculate-main').click()
    assert page.locator('#error-members-4').is_visible()
    page.locator('[data-expense]').first.locator('[data-members-all=true]').click()
    page.locator('[data-action=add-person]').click()
    assert page.locator('[data-expense]').first.locator('[data-member]').count()==4
    assert not page.locator('[data-expense]').first.locator('[data-member]').last.is_checked()
    page.locator('[data-remove-person]').last.click()
    page.locator('[data-remove-person]').first.click()
    assert page.evaluate('data.people.length')==3
    page.locator('#language').select_option('en')
    page.locator('[data-action=home]').click()
    assert page.locator('html').get_attribute('lang')=='ko'
    page.locator('[data-action=start]').click()
    assert page.locator('#meeting').input_value()=='친구 모임'
    page.locator('.sidebar [data-action=new]').click()
    page.locator('#cancel-reset').click()
    assert page.locator('#meeting').input_value()=='친구 모임'
    page.locator('.sidebar [data-action=new]').click()
    page.locator('#confirm-reset').click()
    assert page.locator('#meeting').input_value()==''
    assert page.locator('#currency').input_value()=='JPY'
    assert page.locator('[data-person]').count()==2
    # XSS input stays text, never markup.
    page.locator('[data-action=home]').click()
    for lang,brand in [('en','My AI Treasures'),('ja','マイAI総務')]:
        page.locator('[data-language='+lang+']').click()
        assert page.locator('.brand').inner_text()==brand
        page.locator('[data-action=demo]').click()
        assert page.locator('html').get_attribute('lang')==lang
        page.locator('.calculate-main').click()
        assert not any(ch for ch in page.locator('main.workspace').inner_text() if '\uac00'<=ch<='\ud7a3')
        page.locator('[data-action=home]').click()
    # Every requested layout with localized sample + results, including resize without reload.
    sizes=[(1440,1000,'desktop'),(1100,800,'compact-desktop'),(768,1024,'tablet'),(320,740,'small-mobile'),(360,800,'mobile-portrait'),(390,844,'large-mobile'),(844,390,'mobile-landscape'),(667,375,'small-landscape')]
    for width,height,label in sizes:
        page.set_viewport_size({'width':width,'height':height})
        no_overflow(page)
        page.locator('[data-language=en]').click()
        page.locator('[data-action=demo]').click()
        no_overflow(page)
        if width<=1000:
            assert not page.locator('.sidebar').is_visible()
            assert page.locator('.mobile-nav').is_visible()
            assert page.locator('.mobile-nav').evaluate('(x)=>getComputedStyle(x).gridTemplateColumns.split(" ").length')==(4 if width>height else 2)
        else: assert page.locator('.sidebar').is_visible()
        if label in ('mobile-portrait','mobile-landscape'):page.screenshot(path=str(SHOTS/(label+'-input.png')),full_page=True)
        page.locator('.calculate-main').click()
        no_overflow(page)
        if label in ('mobile-portrait','mobile-landscape'):page.screenshot(path=str(SHOTS/(label+'-results.png')),full_page=True)
        page.locator('[data-action=home]').click()
    page.set_viewport_size({'width':360,'height':800})
    page.locator('[data-language=ja]').click();page.locator('[data-action=demo]').click();no_overflow(page)
    page.locator('.calculate-main').click();no_overflow(page)
    page.reload();page.locator('#selected-person').wait_for()
    assert page.locator('html').get_attribute('lang')=='ja'
    assert page.evaluate('result.total')==1727
    assert not errors,errors
    assert not external,external
    browser.close()
    print('PASS: UI calculations, inline errors, exclusions, copy fallback, home/reset, 3 languages, 8 viewports, orientation change, no overflow/JS errors/network requests')
