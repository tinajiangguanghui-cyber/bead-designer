import asyncio
import sys
sys.path.insert(0, '/usr/lib/python3/dist-packages')
from pyppeteer import launch

async def main():
    browser = await launch(headless=True, args=['--no-sandbox', '--enable-webgl', '--use-gl=swiftshader'])
    page = await browser.newPage()
    
    errors = []
    logs = []
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.on('console', lambda msg: logs.append(f'[{msg.type}] {msg.text}'))

    await page.setViewport({'width': 390, 'height': 844})
    
    try:
        await page.goto('https://bead-designer-liard.vercel.app/', waitUntil='networkidle0', timeout=30000)
    except Exception as e:
        print(f'Navigation error: {e}')

    await asyncio.sleep(3)

    # 获取页面状态
    title = await page.evaluate('() => document.title')
    body_text = await page.evaluate('() => document.body.innerText.substring(0, 500)')
    html_len = await page.evaluate('() => document.documentElement.outerHTML.length')
    app_exists = await page.evaluate('() => typeof window.app !== "undefined"')
    three_exists = await page.evaluate('() => typeof window.THREE !== "undefined"')
    canvas_count = await page.evaluate('() => document.querySelectorAll("canvas").length')
    active_page = await page.evaluate('() => document.querySelector(".page.active")?.id || "none"')
    
    print(f'Title: {title}')
    print(f'HTML length: {html_len}')
    print(f'window.app: {app_exists}')
    print(f'window.THREE: {three_exists}')
    print(f'Canvas count: {canvas_count}')
    print(f'Active page: {active_page}')
    print(f'Body text: {body_text[:300]}')
    print(f'Errors ({len(errors)}):')
    for e in errors[:10]:
        print(f'  {e[:200]}')
    print(f'Console logs ({len(logs)}):')
    for l in logs[-20:]:
        print(f'  {l[:200]}')

    await page.screenshot({'path': '/workspace/bead-designer/vercel_screenshot.png'})
    print('\nScreenshot saved')
    await browser.close()

asyncio.run(main())
