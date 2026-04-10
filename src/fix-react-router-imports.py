#!/usr/bin/env python3
"""
Fix all react-router imports to react-router-dom
"""

import os
import re

def fix_imports_in_file(filepath):
    """Replace 'react-router' imports with 'react-router-dom' in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file has react-router import
        if "from 'react-router'" in content or 'from "react-router"' in content:
            # Replace both single and double quote versions
            new_content = content.replace("from 'react-router'", "from 'react-router-dom'")
            new_content = new_content.replace('from "react-router"', 'from "react-router-dom"')
            
            # Write back if changed
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    """Walk through all .ts and .tsx files and fix imports"""
    count = 0
    for root, dirs, files in os.walk('.'):
        # Skip node_modules
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                if fix_imports_in_file(filepath):
                    count += 1
                    print(f"Fixed: {filepath}")
    
    print(f"\nTotal files fixed: {count}")

if __name__ == '__main__':
    main()
