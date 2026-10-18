"""Regression check: manager demos accept wheel and touch scrolling on mobile."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    evidence = Path('/tmp/browser/manager-scroll')
    evidence.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for width in (360, 384, 430):
            context = await browser.new_context(viewport={'width': width, 'height': 685}, locale='fr-FR', is_mobile=True, has_touch=True)
            page = await context.new_page()
            for route in ('/', '/demo'):
                await page.goto('http://localhost:8080' + route)
                await page.wait_for_load_state('networkidle')
                demo = page.locator('.demo-container').first
                await demo.get_by_role('tab').nth(1).click()
                owner = demo.locator('.manager-shell-content')
                await owner.wait_for(state='visible')
                await owner.evaluate("el => el.scrollIntoView({block:'center', behavior:'instant'})")
                await page.wait_for_timeout(200)
                box = await owner.bounding_box()
                assert box
                x, y = box['x'] + box['width']/2, max(120, box['y'] + 150)
                await page.mouse.move(x, y)
                await page.mouse.wheel(0, 250)
                await page.wait_for_timeout(300)
                assert await owner.evaluate('el => el.scrollTop') > 0, (route, width, 'wheel')
                await owner.evaluate('el => el.scrollTop = 0')
                await page.wait_for_timeout(200)
                cdp = await context.new_cdp_session(page)
                await cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[{'x':x,'y':y}]})
                for step in range(1, 11):
                    await cdp.send('Input.dispatchTouchEvent', {'type':'touchMove', 'touchPoints':[{'x':x,'y':y-step*10}]})
                    await page.wait_for_timeout(16)
                await cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
                await page.wait_for_timeout(300)
                assert await owner.evaluate('el => el.scrollTop') > 0, (route, width, 'touch')
                await owner.evaluate('el => el.scrollTop = el.scrollHeight')
                assert await owner.evaluate('el => el.scrollTop + el.clientHeight >= el.scrollHeight - 1'), 'bottom reachable'
                assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
                await page.screenshot(path=str(evidence / f"{'home' if route == '/' else 'demo'}-{width}.png"))
                print(f'PASS {route} {width}px: wheel, touch, bottom reachable')
            await context.close()
        await browser.close()

asyncio.run(main())
