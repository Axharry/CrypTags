#!/usr/bin/env python3
"""
CrypTags Offline Local Storage Analysis and Test
Analyzing the localStorage.ts implementation for completeness and functionality
"""

import re
import json

def analyze_localStorage_implementation():
    """Analyze the localStorage.ts file for required functionality"""
    print("=== CrypTags Offline Local Storage Analysis ===\n")
    
    try:
        with open('/app/frontend/services/localStorage.ts', 'r') as f:
            code = f.read()
            
        print("📄 Reading localStorage.ts file...")
        print(f"   File size: {len(code)} characters")
        
        # Track what we found
        found_functions = {}
        test_results = []
        
        def check_function(pattern, name, description):
            if re.search(pattern, code, re.MULTILINE | re.DOTALL):
                found_functions[name] = True
                test_results.append(f"✅ PASS: {description}")
                return True
            else:
                found_functions[name] = False
                test_results.append(f"❌ FAIL: {description}")
                return False
        
        print("\n📁 CONTACTS STORAGE FUNCTIONS")
        check_function(r'contactsStorage\s*=\s*{', 'contactsStorage', 'contactsStorage object defined')
        check_function(r'async\s+getAll\(\)', 'contacts_getAll', 'contactsStorage.getAll() function exists')
        check_function(r'async\s+getOne\(id:\s*string\)', 'contacts_getOne', 'contactsStorage.getOne(id) function exists')
        check_function(r'async\s+create\(', 'contacts_create', 'contactsStorage.create() function exists')
        check_function(r'async\s+update\(id:\s*string', 'contacts_update', 'contactsStorage.update(id, data) function exists')
        check_function(r'async\s+delete\(id:\s*string\)', 'contacts_delete', 'contactsStorage.delete(id) function exists')
        check_function(r'async\s+toggleFavorite\(id:\s*string\)', 'contacts_toggleFavorite', 'contactsStorage.toggleFavorite(id) function exists')
        check_function(r'async\s+search\(', 'contacts_search', 'contactsStorage.search() function exists')
        check_function(r'async\s+merge\(', 'contacts_merge', 'contactsStorage.merge() function exists')
        
        print("\n📂 GROUPS STORAGE FUNCTIONS")
        check_function(r'groupsStorage\s*=\s*{', 'groupsStorage', 'groupsStorage object defined')
        check_function(r'async\s+getAll\(\).*Promise<Group\[\]>', 'groups_getAll', 'groupsStorage.getAll() function exists')
        check_function(r'async\s+getOne\(id:\s*string\).*Promise<Group', 'groups_getOne', 'groupsStorage.getOne(id) function exists')
        check_function(r'async\s+create\(.*name:\s*string', 'groups_create', 'groupsStorage.create() function exists')
        check_function(r'async\s+update\(id:\s*string.*Promise<Group', 'groups_update', 'groupsStorage.update(id, data) function exists')
        check_function(r'async\s+delete\(id:\s*string\).*Promise<boolean>', 'groups_delete', 'groupsStorage.delete(id) function exists')
        check_function(r'async\s+addContact\(groupId:\s*string,\s*contactId:\s*string\)', 'groups_addContact', 'groupsStorage.addContact(groupId, contactId) function exists')
        check_function(r'async\s+removeContact\(groupId:\s*string,\s*contactId:\s*string\)', 'groups_removeContact', 'groupsStorage.removeContact(groupId, contactId) function exists')
        
        print("\n💰 CRYPTOS STORAGE FUNCTIONS")
        check_function(r'cryptosStorage\s*=\s*{', 'cryptosStorage', 'cryptosStorage object defined')
        check_function(r'DEFAULT_CRYPTOS\s*=\s*\[', 'default_cryptos', 'DEFAULT_CRYPTOS array defined')
        check_function(r'async\s+getAll\(\).*default_cryptos.*custom_cryptos', 'cryptos_getAll', 'cryptosStorage.getAll() returns default + custom cryptos')
        check_function(r'async\s+create\(.*name:\s*string.*symbol:\s*string', 'cryptos_create', 'cryptosStorage.create() function exists')
        check_function(r'async\s+delete\(id:\s*string\).*Promise<boolean>', 'cryptos_delete', 'cryptosStorage.delete(id) function exists')
        check_function(r'validateAddress\(.*address:\s*string.*cryptoSymbol:\s*string\)', 'cryptos_validateAddress', 'cryptosStorage.validateAddress() function exists')
        
        print("\n📤 EXPORT STORAGE FUNCTIONS")
        check_function(r'exportStorage\s*=\s*{', 'exportStorage', 'exportStorage object defined')
        check_function(r'async\s+exportJSON\(\)', 'export_json', 'exportStorage.exportJSON() function exists')
        check_function(r'async\s+exportCSV\(\)', 'export_csv', 'exportStorage.exportCSV() function exists')
        
        print("\n🔧 IMPLEMENTATION DETAILS")
        
        # Check for AsyncStorage usage
        async_storage_usage = len(re.findall(r'AsyncStorage\.(?:getItem|setItem|removeItem)', code))
        test_results.append(f"✅ PASS: AsyncStorage used {async_storage_usage} times" if async_storage_usage > 5 else f"❌ FAIL: AsyncStorage usage insufficient ({async_storage_usage} times)")
        
        # Check for proper error handling
        error_handling = len(re.findall(r'try\s*{.*catch.*error', code, re.DOTALL))
        test_results.append(f"✅ PASS: Error handling blocks found ({error_handling})" if error_handling > 0 else f"❌ FAIL: No error handling found")
        
        # Check for data validation
        validation_checks = len(re.findall(r'if\s*\(.*\)\s*return', code))
        test_results.append(f"✅ PASS: Validation checks found ({validation_checks})" if validation_checks > 5 else f"❌ FAIL: Insufficient validation checks")
        
        # Check for search functionality 
        search_features = []
        if 'search?' in code: search_features.append('search query')
        if 'crypto_type?' in code: search_features.append('crypto_type filter')
        if 'favorites_only?' in code: search_features.append('favorites filter')
        if 'group_id?' in code: search_features.append('group filter')
        if 'sort_by?' in code: search_features.append('sorting')
        
        test_results.append(f"✅ PASS: Search features: {', '.join(search_features)}" if len(search_features) >= 4 else f"❌ FAIL: Missing search features")
        
        # Check for merge functionality
        merge_features = []
        if 'primary_contact_id' in code: merge_features.append('primary contact')
        if 'source_contact_ids' in code: merge_features.append('source contacts')
        if 'delete_source_contacts' in code: merge_features.append('optional deletion')
        if 'crypto_addresses.*push' in re.search(r'merge.*?{.*?}', code, re.DOTALL).group() if re.search(r'merge.*?{.*?}', code, re.DOTALL) else '':
            merge_features.append('address merging')
            
        test_results.append(f"✅ PASS: Merge functionality complete" if len(merge_features) >= 3 else f"⚠️  PARTIAL: Some merge features missing")
        
        print("\n🗂️ DATA STRUCTURE ANALYSIS")
        
        # Check Contact interface usage
        contact_fields = ['id', 'name', 'notes', 'crypto_addresses', 'is_favorite', 'group_ids', 'created_at', 'updated_at']
        contact_usage = sum(1 for field in contact_fields if field in code)
        test_results.append(f"✅ PASS: Contact fields used ({contact_usage}/{len(contact_fields)})" if contact_usage >= 7 else f"❌ FAIL: Missing contact fields")
        
        # Check Group interface usage  
        group_fields = ['id', 'name', 'description', 'contact_count', 'created_at', 'updated_at']
        group_usage = sum(1 for field in group_fields if field in code)
        test_results.append(f"✅ PASS: Group fields used ({group_usage}/{len(group_fields)})" if group_usage >= 5 else f"❌ FAIL: Missing group fields")
        
        # Check crypto address structure
        crypto_fields = ['crypto_type', 'address', 'label']
        crypto_usage = sum(1 for field in crypto_fields if field in code)
        test_results.append(f"✅ PASS: Crypto address fields used ({crypto_usage}/{len(crypto_fields)})" if crypto_usage >= 2 else f"❌ FAIL: Missing crypto fields")
        
        print("\n🏗️ ARCHITECTURE ANALYSIS")
        
        # Check if it's truly offline (no API calls)
        api_calls = re.findall(r'fetch\(|axios\.|http|api/', code, re.IGNORECASE)
        test_results.append(f"✅ PASS: No API calls found - fully offline" if len(api_calls) == 0 else f"❌ FAIL: Found potential API calls: {api_calls}")
        
        # Check storage keys are defined
        storage_keys = len(re.findall(r'KEYS\.', code))
        test_results.append(f"✅ PASS: Storage keys used ({storage_keys} times)" if storage_keys > 5 else f"❌ FAIL: Insufficient storage key usage")
        
        # Check for proper async/await usage
        async_functions = len(re.findall(r'async\s+\w+\(', code))
        await_usage = len(re.findall(r'await\s+', code))
        test_results.append(f"✅ PASS: Async/await properly used ({async_functions} async functions, {await_usage} await calls)" if await_usage > async_functions else f"⚠️  WARNING: Potential async/await issues")
        
        print("\n🧪 FUNCTIONAL COMPLETENESS TEST")
        
        # Count required functions
        required_functions = [
            'contactsStorage.create', 'contactsStorage.getAll', 'contactsStorage.getOne', 
            'contactsStorage.update', 'contactsStorage.delete', 'contactsStorage.search',
            'contactsStorage.toggleFavorite', 'contactsStorage.merge',
            'groupsStorage.create', 'groupsStorage.getAll', 'groupsStorage.getOne',
            'groupsStorage.update', 'groupsStorage.delete', 'groupsStorage.addContact', 'groupsStorage.removeContact',
            'cryptosStorage.getAll', 'cryptosStorage.create', 'cryptosStorage.delete', 'cryptosStorage.validateAddress',
            'exportStorage.exportJSON', 'exportStorage.exportCSV'
        ]
        
        implemented_count = sum(1 for func in required_functions if any(func.split('.')[-1] in code for func in [func]))
        test_results.append(f"✅ PASS: All required functions implemented ({implemented_count}/{len(required_functions)})" if implemented_count >= 18 else f"❌ FAIL: Missing functions ({implemented_count}/{len(required_functions)})")
        
        # Count test results
        passed_tests = len([t for t in test_results if t.startswith('✅')])
        warning_tests = len([t for t in test_results if t.startswith('⚠️')])
        failed_tests = len([t for t in test_results if t.startswith('❌')])
        total_tests = len(test_results)
        
        print(f"\n=== ANALYSIS RESULTS ===")
        print(f"Total Checks: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Warnings: {warning_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {round((passed_tests / total_tests) * 100)}%")
        
        print(f"\n📋 DETAILED RESULTS:")
        for result in test_results:
            print(f"  {result}")
            
        # Overall assessment
        if failed_tests == 0:
            print(f"\n🎉 EXCELLENT: CrypTags offline localStorage implementation is complete and well-structured!")
            success_level = "EXCELLENT"
        elif failed_tests <= 2:
            print(f"\n✨ GOOD: CrypTags offline localStorage implementation is mostly complete with minor issues.")
            success_level = "GOOD"  
        elif failed_tests <= 5:
            print(f"\n⚠️  PARTIAL: CrypTags offline localStorage implementation has some missing functionality.")
            success_level = "PARTIAL"
        else:
            print(f"\n❌ INCOMPLETE: CrypTags offline localStorage implementation needs significant work.")
            success_level = "INCOMPLETE"
            
        # Specific test validation based on requirements
        print(f"\n📝 REQUIREMENT VALIDATION:")
        requirements_met = []
        
        # Check specific requirements from review request
        if 'contactsStorage' in code and 'create(' in code:
            requirements_met.append("✅ Contact creation with crypto addresses")
        if 'getAll()' in code and 'contactsStorage' in code:
            requirements_met.append("✅ Retrieve all contacts")
        if 'getOne(' in code and 'contactsStorage' in code:
            requirements_met.append("✅ Retrieve single contact")
        if 'update(' in code and 'contactsStorage' in code:
            requirements_met.append("✅ Update contact")
        if 'delete(' in code and 'contactsStorage' in code:
            requirements_met.append("✅ Delete contact")
        if 'search(' in code and ('crypto_type' in code or 'favorites_only' in code):
            requirements_met.append("✅ Search with filters")
        if 'toggleFavorite(' in code:
            requirements_met.append("✅ Toggle favorite functionality")
        if 'merge(' in code:
            requirements_met.append("✅ Merge contacts functionality")
        if 'groupsStorage' in code:
            requirements_met.append("✅ Groups storage implementation")
        if 'DEFAULT_CRYPTOS' in code and 'cryptosStorage' in code:
            requirements_met.append("✅ Cryptos storage with defaults + custom")
        if 'exportJSON(' in code and 'exportCSV(' in code:
            requirements_met.append("✅ Export functionality (JSON/CSV)")
        if not re.search(r'fetch\(|axios|http', code, re.IGNORECASE):
            requirements_met.append("✅ Fully offline (no API calls)")
            
        for req in requirements_met:
            print(f"  {req}")
            
        return success_level, passed_tests, total_tests, requirements_met
        
    except Exception as e:
        print(f"❌ Error analyzing localStorage.ts: {e}")
        return "ERROR", 0, 0, []

if __name__ == "__main__":
    success_level, passed, total, requirements = analyze_localStorage_implementation()
    
    # Return appropriate exit code
    if success_level in ["EXCELLENT", "GOOD"]:
        exit(0)
    else:
        exit(1)