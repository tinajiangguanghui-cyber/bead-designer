#!/usr/bin/env python3
"""构建单文件HTML - 将所有JS/CSS内联"""
import re

base = '/workspace/bead-designer'

# 读取HTML
with open(f'{base}/index.html', 'r') as f:
    html = f.read()

# 读取CSS并内联
with open(f'{base}/css/style.css', 'r') as f:
    css = f.read()
html = html.replace('<link rel="stylesheet" href="css/style.css">', f'<style>\n{css}\n</style>')

# 读取所有JS文件
def read_js(filename):
    with open(f'{base}/js/{filename}', 'r') as f:
        return f.read()

bead_data = read_js('beadData.js')
renderer = read_js('renderer.js')
design_engine = read_js('designEngine.js')
work_manager = read_js('workManager.js')
main_js = read_js('main.js')

# 移除renderer和designEngine中的import语句（保留在模块作用域内）
renderer_clean = re.sub(r"^import .+?;\s*$", "// import handled by module scope", renderer, flags=re.MULTILINE)
design_clean = re.sub(r"^import .+?;\s*$", "// import handled by module scope", design_engine, flags=re.MULTILINE)
main_clean = re.sub(r"^import .+?;\s*$", "// import handled by module scope", main_js, flags=re.MULTILINE)

# 移除HTML中的importmap和module脚本
html = re.sub(r'<script type="importmap">.*?</script>', '', html, flags=re.DOTALL)
html = re.sub(r'<script type="module" src="js/main.js"></script>', '', html)

# 构建内联脚本
inline = '''<script async src="https://unpkg.com/es-module-shims@1.10.0/dist/es-module-shims.js"></script>
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
  }
}
</script>
<script type="module">
import * as THREE from "three";

// === beadData.js ===
'''

inline += bead_data + '\n\n'
inline += '// === renderer.js ===\n'
inline += renderer_clean + '\n\n'
inline += '// === designEngine.js ===\n'
inline += design_clean + '\n\n'
inline += '// === workManager.js ===\n'
inline += work_manager + '\n\n'
inline += '// === main.js ===\n'
inline += main_clean + '\n'
inline += '</script>'

html = html.replace('</body>', inline + '\n</body>')

# 写入
output_path = f'{base}/index-standalone.html'
with open(output_path, 'w') as f:
    f.write(html)

print(f'Generated: {output_path} ({len(html)} bytes)')
