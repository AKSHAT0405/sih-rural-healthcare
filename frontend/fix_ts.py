import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix import type in src/api/*.ts
    if 'api' in filepath and filepath.endswith('.ts'):
        content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'\"]\.\./types[\'\"];', r'import type { \1 } from \'../types\';', content)
        
    # Fix import type in src/pages/*/*.tsx
    if 'pages' in filepath:
        content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'\"]\.\./\.\./\.\./types[\'\"];', r'import type { \1 } from \'../../types\';', content)
        # Fix paths
        content = content.replace('../../../context', '../../context')
        content = content.replace('../../../api', '../../api')
        content = content.replace('../../../types', '../../types')
        
    # Fix import type in App.tsx
    if filepath.endswith('App.tsx'):
        content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'\"]\./types[\'\"]', r'import type { \1 } from \'./types\'', content)
        
    # Fix import type in AuthContext.tsx
    if filepath.endswith('AuthContext.tsx'):
        content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'\"]\.\./types[\'\"];', r'import type { \1 } from \'../types\';', content)
        content = re.sub(r'import\s+React,\s*\{\s*createContext,\s*useContext,\s*useState,\s*ReactNode,\s*useEffect\s*\}\s*from\s*[\'\"]react[\'\"];', 
            r'import { createContext, useContext, useState, useEffect } from \'react\';\nimport type { ReactNode } from \'react\';', content)

    # Remove unused React import if verbatimModuleSyntax complains, actually it says 'React' is declared but its value is never read.
    content = re.sub(r'import\s+React(,\s*\{\s*[^}]+\s*\})?\s+from\s+[\'\"]react[\'\"];\n', r'import \1 from \'react\';\n', content)
    content = content.replace('import  from \'react\';\n', '')
    content = content.replace('import { useEffect, useState } from \'react\'\n', 'import { useEffect, useState } from \'react\';\n')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            process_file(os.path.join(root, file))
