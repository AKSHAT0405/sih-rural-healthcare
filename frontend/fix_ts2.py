import os
import re

def fix(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace("\\'", "'")
    content = content.replace("\\n", "\n")
    
    # Fix import declarations
    content = re.sub(r'import\s+from\s+\'react\';\n?', '', content)
    content = re.sub(r'import\s+,\s*\{', 'import {', content)
    content = content.replace('import  from', 'import from')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            fix(os.path.join(root, file))
