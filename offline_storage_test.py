#!/usr/bin/env python3
"""
CrypTags Offline Local Storage Test Script
Testing the React Native localStorage.ts service using Node.js
"""

import subprocess
import json
import os

def run_node_test():
    """Run the Node.js test script for localStorage"""
    print("=== CrypTags Offline Local Storage Tests ===")
    
    # Create Node.js test script
    node_test_script = """
const fs = require('fs');
const path = require('path');

// Mock React Native environment
global.Platform = { OS: 'web' };

// Mock AsyncStorage
const mockStorage = new Map();
const AsyncStorage = {
    getItem: async (key) => mockStorage.get(key) || null,
    setItem: async (key, value) => { mockStorage.set(key, value); },
    removeItem: async (key) => { mockStorage.delete(key); },
    clear: async () => { mockStorage.clear(); }
};

// Mock SecureStore  
const SecureStore = {
    getItemAsync: async (key) => mockStorage.get(key) || null,
    setItemAsync: async (key, value) => { mockStorage.set(key, value); },
    deleteItemAsync: async (key) => { mockStorage.delete(key); }
};

// Set up global mocks
global.require = require;
global.exports = exports;
global.module = module;

// Mock modules
const moduleCache = {
    '@react-native-async-storage/async-storage': { default: AsyncStorage },
    'expo-secure-store': SecureStore,
    'react-native': { Platform: global.Platform }
};

const originalRequire = require;
require = function(moduleName) {
    if (moduleCache[moduleName]) {
        return moduleCache[moduleName];
    }
    return originalRequire(moduleName);
};

// Import the localStorage service
const localStoragePath = path.join(__dirname, 'frontend', 'services', 'localStorage.ts');

// Read and evaluate TypeScript file as JavaScript (simplified)
let code = fs.readFileSync(localStoragePath, 'utf8');

// Simple TypeScript to JavaScript conversion
code = code
    .replace(/import.*from.*['"][^'"]+['"];?/g, '')
    .replace(/export\s+(const|interface|type)/g, '$1')
    .replace(/:\s*[A-Za-z<>[\]|&{},\s?]+(\s*=)/g, '$1')
    .replace(/:\s*[A-Za-z<>[\]|&{},\s?]+(\s*[);,])/g, '$1')
    .replace(/:\s*[A-Za-z<>[\]|&{},\s?]+$/gm, '')
    .replace(/async\s+([^(]+)\([^)]*\)\s*:\s*Promise<[^>]+>/g, 'async $1()')
    .replace(/\?\s*:/g, ':');

// Create exports object
const exports = {};
eval(code);

// Extract exports from the code
const contactsStorage = eval('contactsStorage');
const groupsStorage = eval('groupsStorage');  
const cryptosStorage = eval('cryptosStorage');
const exportStorage = eval('exportStorage');

async function runTests() {
    console.log('\\n=== Starting CrypTags Offline Storage Tests ===\\n');
    
    let passedTests = 0;
    let totalTests = 0;
    
    function assert(condition, message) {
        totalTests++;
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passedTests++;
        } else {
            console.log(`❌ FAIL: ${message}`);
        }
    }
    
    try {
        // Clear storage before tests
        mockStorage.clear();
        
        // === CONTACTS STORAGE TESTS ===
        console.log('\\n📁 CONTACTS STORAGE TESTS');
        
        // Test 1: Create contact with crypto addresses
        console.log('\\n1. Testing contactsStorage.create()');
        const alice = await contactsStorage.create({
            name: 'Alice',
            notes: 'Bitcoin enthusiast',
            crypto_addresses: [{
                id: 'addr1',
                crypto_type: 'BTC',
                address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                label: 'Main BTC wallet'
            }],
            is_favorite: false,
            group_ids: []
        });
        assert(alice.name === 'Alice', 'Alice contact created with correct name');
        assert(alice.crypto_addresses[0].crypto_type === 'BTC', 'Alice has BTC address');
        assert(alice.id && alice.created_at && alice.updated_at, 'Alice has auto-generated fields');
        
        const bob = await contactsStorage.create({
            name: 'Bob',
            notes: 'Ethereum developer',
            crypto_addresses: [{
                id: 'addr2', 
                crypto_type: 'ETH',
                address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                label: 'Main ETH wallet'
            }],
            is_favorite: false,
            group_ids: []
        });
        assert(bob.name === 'Bob', 'Bob contact created with correct name');
        assert(bob.crypto_addresses[0].crypto_type === 'ETH', 'Bob has ETH address');
        
        // Test 2: Get all contacts
        console.log('\\n2. Testing contactsStorage.getAll()');
        const allContacts = await contactsStorage.getAll();
        assert(allContacts.length === 2, 'Retrieved 2 contacts from storage');
        assert(allContacts.some(c => c.name === 'Alice'), 'Alice found in all contacts');
        assert(allContacts.some(c => c.name === 'Bob'), 'Bob found in all contacts');
        
        // Test 3: Get single contact
        console.log('\\n3. Testing contactsStorage.getOne()');
        const retrievedAlice = await contactsStorage.getOne(alice.id);
        assert(retrievedAlice && retrievedAlice.name === 'Alice', 'Retrieved Alice by ID');
        
        const nonExistent = await contactsStorage.getOne('fake-id');
        assert(nonExistent === null, 'Non-existent contact returns null');
        
        // Test 4: Update contact
        console.log('\\n4. Testing contactsStorage.update()');
        const updatedAlice = await contactsStorage.update(alice.id, {
            notes: 'Updated notes for Alice'
        });
        assert(updatedAlice && updatedAlice.notes === 'Updated notes for Alice', 'Contact updated correctly');
        assert(updatedAlice.created_at === alice.created_at, 'created_at preserved during update');
        assert(updatedAlice.updated_at !== alice.updated_at, 'updated_at changed during update');
        
        // Test 5: Toggle favorite
        console.log('\\n5. Testing contactsStorage.toggleFavorite()');
        const favoritedAlice = await contactsStorage.toggleFavorite(alice.id);
        assert(favoritedAlice && favoritedAlice.is_favorite === true, 'Alice marked as favorite');
        
        const unfavoritedAlice = await contactsStorage.toggleFavorite(alice.id);
        assert(unfavoritedAlice && unfavoritedAlice.is_favorite === false, 'Alice unmarked as favorite');
        
        // Test 6: Search functionality
        console.log('\\n6. Testing contactsStorage.search()');
        
        // Search by name
        const searchByName = await contactsStorage.search({ search: 'Alice' });
        assert(searchByName.length === 1 && searchByName[0].name === 'Alice', 'Search by name works');
        
        // Search by crypto type
        const searchByBTC = await contactsStorage.search({ crypto_type: 'BTC' });
        assert(searchByBTC.length === 1 && searchByBTC[0].name === 'Alice', 'Search by crypto type works');
        
        const searchByETH = await contactsStorage.search({ crypto_type: 'ETH' });
        assert(searchByETH.length === 1 && searchByETH[0].name === 'Bob', 'Search by ETH works');
        
        // Search favorites only (should be empty since we unfavorited Alice)
        const searchFavorites = await contactsStorage.search({ favorites_only: true });
        assert(searchFavorites.length === 0, 'Favorites search returns empty when no favorites');
        
        // Test 7: Merge contacts
        console.log('\\n7. Testing contactsStorage.merge()');
        const charlie = await contactsStorage.create({
            name: 'Charlie',
            notes: 'Additional contact for merge test',
            crypto_addresses: [{
                id: 'addr3',
                crypto_type: 'SOL', 
                address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
                label: 'Solana wallet'
            }],
            is_favorite: false,
            group_ids: []
        });
        
        const mergedResult = await contactsStorage.merge({
            primary_contact_id: alice.id,
            source_contact_ids: [charlie.id],
            delete_source_contacts: true
        });
        
        assert(mergedResult && mergedResult.crypto_addresses.length > 1, 'Addresses merged successfully');
        
        const contactsAfterMerge = await contactsStorage.getAll();
        assert(contactsAfterMerge.length === 2, 'Source contact deleted after merge');
        
        // Test 8: Delete contact
        console.log('\\n8. Testing contactsStorage.delete()');
        const deleteResult = await contactsStorage.delete(bob.id);
        assert(deleteResult === true, 'Contact deletion returns true');
        
        const contactsAfterDelete = await contactsStorage.getAll();
        assert(contactsAfterDelete.length === 1, 'Contact count decreased after deletion');
        
        // === GROUPS STORAGE TESTS ===
        console.log('\\n\\n📂 GROUPS STORAGE TESTS');
        
        // Test 9: Create group
        console.log('\\n9. Testing groupsStorage.create()');
        const friendsGroup = await groupsStorage.create({
            name: 'Friends',
            description: 'Close friends group'
        });
        assert(friendsGroup.name === 'Friends', 'Friends group created');
        assert(friendsGroup.contact_count === 0, 'New group has 0 contacts');
        
        // Test 10: Get all groups
        console.log('\\n10. Testing groupsStorage.getAll()');
        const allGroups = await groupsStorage.getAll();
        assert(allGroups.length === 1, 'Retrieved 1 group');
        assert(allGroups[0].name === 'Friends', 'Friends group found');
        
        // Test 11: Get single group
        console.log('\\n11. Testing groupsStorage.getOne()');
        const retrievedGroup = await groupsStorage.getOne(friendsGroup.id);
        assert(retrievedGroup && retrievedGroup.name === 'Friends', 'Retrieved Friends group by ID');
        
        // Test 12: Update group
        console.log('\\n12. Testing groupsStorage.update()');
        const updatedGroup = await groupsStorage.update(friendsGroup.id, {
            description: 'Updated description'
        });
        assert(updatedGroup && updatedGroup.description === 'Updated description', 'Group updated');
        
        // Test 13: Add contact to group
        console.log('\\n13. Testing groupsStorage.addContact()');
        const addResult = await groupsStorage.addContact(friendsGroup.id, alice.id);
        assert(addResult === true, 'Contact added to group successfully');
        
        const updatedAliceInGroup = await contactsStorage.getOne(alice.id);
        assert(updatedAliceInGroup && updatedAliceInGroup.group_ids.includes(friendsGroup.id), 'Alice is in Friends group');
        
        // Test 14: Remove contact from group
        console.log('\\n14. Testing groupsStorage.removeContact()');
        const removeResult = await groupsStorage.removeContact(friendsGroup.id, alice.id);
        assert(removeResult === true, 'Contact removed from group successfully');
        
        const aliceAfterRemove = await contactsStorage.getOne(alice.id);
        assert(aliceAfterRemove && !aliceAfterRemove.group_ids.includes(friendsGroup.id), 'Alice removed from Friends group');
        
        // Test 15: Delete group
        console.log('\\n15. Testing groupsStorage.delete()');
        const groupDeleteResult = await groupsStorage.delete(friendsGroup.id);
        assert(groupDeleteResult === true, 'Group deleted successfully');
        
        const groupsAfterDelete = await groupsStorage.getAll();
        assert(groupsAfterDelete.length === 0, 'No groups after deletion');
        
        // === CRYPTOS STORAGE TESTS ===
        console.log('\\n\\n💰 CRYPTOS STORAGE TESTS');
        
        // Test 16: Get all cryptos (default + custom)
        console.log('\\n16. Testing cryptosStorage.getAll()');
        const allCryptos = await cryptosStorage.getAll();
        assert(allCryptos.default_cryptos.length === 10, 'Retrieved 10 default cryptos');
        assert(allCryptos.custom_cryptos.length === 0, 'No custom cryptos initially');
        
        // Test 17: Create custom crypto
        console.log('\\n17. Testing cryptosStorage.create()');
        const customCrypto = await cryptosStorage.create({
            name: 'Dogecoin',
            symbol: 'DOGE',
            address_regex: '^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$'
        });
        assert(customCrypto.symbol === 'DOGE', 'Custom crypto created');
        
        const cryptosWithCustom = await cryptosStorage.getAll();
        assert(cryptosWithCustom.custom_cryptos.length === 1, '1 custom crypto after creation');
        
        // Test 18: Delete custom crypto
        console.log('\\n18. Testing cryptosStorage.delete()');
        const cryptoDeleteResult = await cryptosStorage.delete(customCrypto.id);
        assert(cryptoDeleteResult === true, 'Custom crypto deleted');
        
        const cryptosAfterDelete = await cryptosStorage.getAll();
        assert(cryptosAfterDelete.custom_cryptos.length === 0, 'No custom cryptos after deletion');
        
        // Test 19: Address validation
        console.log('\\n19. Testing cryptosStorage.validateAddress()');
        const validBTC = cryptosStorage.validateAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'BTC');
        assert(validBTC === true, 'Valid BTC address validation passes');
        
        const validETH = cryptosStorage.validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'ETH');
        assert(validETH === true, 'Valid ETH address validation passes');
        
        // === EXPORT STORAGE TESTS ===
        console.log('\\n\\n📤 EXPORT STORAGE TESTS');
        
        // Test 20: Export JSON
        console.log('\\n20. Testing exportStorage.exportJSON()');
        const exportedJSON = await exportStorage.exportJSON();
        assert(exportedJSON.contacts && Array.isArray(exportedJSON.contacts), 'JSON export contains contacts array');
        assert(exportedJSON.groups && Array.isArray(exportedJSON.groups), 'JSON export contains groups array');
        assert(exportedJSON.exported_at, 'JSON export has timestamp');
        
        // Test 21: Export CSV
        console.log('\\n21. Testing exportStorage.exportCSV()');
        const exportedCSV = await exportStorage.exportCSV();
        assert(exportedCSV.csv_content && exportedCSV.csv_content.includes('Name,Crypto Type'), 'CSV export has correct headers');
        assert(exportedCSV.exported_at, 'CSV export has timestamp');
        
        // === FINAL RESULTS ===
        console.log(`\\n\\n=== TEST RESULTS ===`);
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${totalTests - passedTests}`);
        console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
        
        if (passedTests === totalTests) {
            console.log('\\n🎉 ALL TESTS PASSED! CrypTags offline storage is working correctly.');
        } else {
            console.log('\\n⚠️  Some tests failed. Please check the implementation.');
        }
        
    } catch (error) {
        console.error('\\n❌ Test execution error:', error);
    }
}

runTests();
"""
    
    # Write the test script
    test_file = '/tmp/localStorage_test.js'
    with open(test_file, 'w') as f:
        f.write(node_test_script)
    
    # Change to app directory and run the test
    try:
        result = subprocess.run(['node', test_file], 
                              capture_output=True, 
                              text=True,
                              cwd='/app')
        
        print("STDOUT:")
        print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
            
        return result.returncode == 0
        
    except Exception as e:
        print(f"Error running Node.js test: {e}")
        return False
    finally:
        # Clean up
        if os.path.exists(test_file):
            os.remove(test_file)

if __name__ == "__main__":
    success = run_node_test()
    exit(0 if success else 1)