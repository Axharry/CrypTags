#!/usr/bin/env python3
"""
Script to refactor CrypTags from API-based to local storage
"""
import os
import re

# File modifications mapping
modifications = {
    # Replace API imports with local storage imports
    'imports': [
        (r"from '../../services/api'", "from '../../types'\nimport { contactsStorage, groupsStorage, cryptosStorage, exportStorage } from '../../services/localStorage'"),
        (r"import \{[^}]*contactsAPI[^}]*\} from '../../services/api';", "import { contactsStorage } from '../../services/localStorage';"),
        (r"import \{[^}]*groupsAPI[^}]*\} from '../../services/api';", "import { groupsStorage } from '../../services/localStorage';"),
        (r"import \{[^}]*cryptosAPI[^}]*\} from '../../services/api';", "import { cryptosStorage } from '../../services/localStorage';"),
        (r"import \{[^}]*exportAPI[^}]*\} from '../../services/api';", "import { exportStorage } from '../../services/localStorage';"),
        (r"import \{ useAuthStore \} from [^;]+;", ""),  # Remove auth store imports
    ],
    
    # Replace API calls with local storage calls
    'api_calls': [
        (r"contactsAPI\.getAll\(([^)]*)\)", r"contactsStorage.search(\1)"),
        (r"const response = await contactsStorage\.search", r"const results = await contactsStorage.search"),
        (r"setContacts\(response\.data\)", r"setContacts(results)"),
        (r"contactsAPI\.getOne\(", r"contactsStorage.getOne("),
        (r"contactsAPI\.create\(", r"contactsStorage.create("),
        (r"contactsAPI\.update\(", r"contactsStorage.update("),
        (r"contactsAPI\.delete\(", r"contactsStorage.delete("),
        (r"contactsAPI\.toggleFavorite\(", r"contactsStorage.toggleFavorite("),
        (r"contactsAPI\.merge\(", r"contactsStorage.merge("),
        
        (r"groupsAPI\.getAll\(\)", r"groupsStorage.getAll()"),
        (r"groupsAPI\.getOne\(", r"groupsStorage.getOne("),
        (r"groupsAPI\.create\(", r"groupsStorage.create("),
        (r"groupsAPI\.update\(", r"groupsStorage.update("),
        (r"groupsAPI\.delete\(", r"groupsStorage.delete("),
        (r"groupsAPI\.addContact\(", r"groupsStorage.addContact("),
        (r"groupsAPI\.removeContact\(", r"groupsStorage.removeContact("),
        
        (r"cryptosAPI\.getAll\(\)", r"cryptosStorage.getAll()"),
        (r"cryptosAPI\.create\(", r"cryptosStorage.create("),
        (r"cryptosAPI\.delete\(", r"cryptosStorage.delete("),
        
        (r"exportAPI\.exportJSON\(\)", r"exportStorage.exportJSON()"),
        (r"exportAPI\.exportCSV\(\)", r"exportStorage.exportCSV()"),
        
        (r"response\.data\.default_cryptos", r"result.default_cryptos"),
        (r"response\.data\.custom_cryptos", r"result.custom_cryptos"),
        (r"const response = await (\w+Storage\.\w+)", r"const result = await \1"),
        (r"response\.data", r"result"),
    ],
}

def update_file(filepath):
    """Update a single file with local storage modifications"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply import replacements
        for pattern, replacement in modifications['imports']:
            content = re.sub(pattern, replacement, content)
        
        # Apply API call replacements
        for pattern, replacement in modifications['api_calls']:
            content = re.sub(pattern, replacement, content)
        
        # Only write if changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Updated: {filepath}")
            return True
        else:
            print(f"⏭️  Skipped: {filepath} (no changes needed)")
            return False
    except Exception as e:
        print(f"❌ Error updating {filepath}: {e}")
        return False

def main():
    """Main refactoring function"""
    frontend_dir = '/app/frontend/app'
    
    # Find all TypeScript files
    tsx_files = []
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                # Skip auth files (we'll handle those separately)
                if '(auth)' not in root:
                    tsx_files.append(os.path.join(root, file))
    
    print(f"Found {len(tsx_files)} files to process")
    print("=" * 60)
    
    updated_count = 0
    for filepath in tsx_files:
        if update_file(filepath):
            updated_count += 1
    
    print("=" * 60)
    print(f"✨ Refactoring complete! Updated {updated_count} files")

if __name__ == '__main__':
    main()
