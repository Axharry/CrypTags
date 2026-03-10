// Simple Node.js test for localStorage functionality
const fs = require('fs');
const path = require('path');

// Mock React Native environment
global.Platform = { OS: 'web' };

// Mock AsyncStorage with simple Map
const mockStorage = new Map();
const mockAsyncStorage = {
    getItem: async (key) => mockStorage.get(key) || null,
    setItem: async (key, value) => { mockStorage.set(key, value); },
    removeItem: async (key) => { mockStorage.delete(key); },
    clear: async () => { mockStorage.clear(); }
};

// Mock SecureStore  
const mockSecureStore = {
    getItemAsync: async (key) => mockStorage.get(key) || null,
    setItemAsync: async (key, value) => { mockStorage.set(key, value); },
    deleteItemAsync: async (key) => { mockStorage.delete(key); }
};

// Override require to provide mocks
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
    if (id === '@react-native-async-storage/async-storage') {
        return { default: mockAsyncStorage };
    }
    if (id === 'expo-secure-store') {
        return mockSecureStore;
    }
    if (id === 'react-native') {
        return { Platform: global.Platform };
    }
    return originalRequire.apply(this, arguments);
};

// Read the localStorage.ts file and convert to JS
const localStoragePath = path.join(__dirname, 'frontend', 'services', 'localStorage.ts');
let code = fs.readFileSync(localStoragePath, 'utf8');

// Basic TypeScript to JavaScript conversion
code = code
    .replace(/import\s+[^;]+;/g, '') // Remove imports
    .replace(/export\s+/g, '') // Remove export keywords
    .replace(/:\s*[^=,)}\n]+/g, '') // Remove type annotations
    .replace(/\?\s*:/g, ':') // Remove optional type annotations
    .replace(/<[^>]+>/g, ''); // Remove generics

// Evaluate the code
try {
    eval(code);
} catch (e) {
    console.error('Error evaluating localStorage code:', e.message);
    process.exit(1);
}

// Test runner
async function runTests() {
    console.log('\n=== CrypTags Offline Storage Tests ===\n');
    
    let passedTests = 0;
    let totalTests = 0;
    let failedTests = [];
    
    function assert(condition, message) {
        totalTests++;
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passedTests++;
        } else {
            console.log(`❌ FAIL: ${message}`);
            failedTests.push(message);
        }
    }
    
    try {
        // Clear storage
        mockStorage.clear();
        
        console.log('\n📁 CONTACTS STORAGE TESTS\n');
        
        // Test 1: Create contacts
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
        
        assert(alice && alice.name === 'Alice', 'Alice contact created');
        assert(alice.crypto_addresses[0].crypto_type === 'BTC', 'Alice has BTC address');
        
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
        
        assert(bob && bob.name === 'Bob', 'Bob contact created');
        
        // Test 2: Get all contacts
        const allContacts = await contactsStorage.getAll();
        assert(allContacts.length === 2, `Expected 2 contacts, got ${allContacts.length}`);
        
        // Test 3: Get single contact
        const retrievedAlice = await contactsStorage.getOne(alice.id);
        assert(retrievedAlice && retrievedAlice.name === 'Alice', 'Retrieved Alice by ID');
        
        // Test 4: Update contact
        const updatedAlice = await contactsStorage.update(alice.id, {
            notes: 'Updated Bitcoin enthusiast'
        });
        assert(updatedAlice && updatedAlice.notes === 'Updated Bitcoin enthusiast', 'Alice updated');
        
        // Test 5: Toggle favorite
        const favoritedAlice = await contactsStorage.toggleFavorite(alice.id);
        assert(favoritedAlice && favoritedAlice.is_favorite === true, 'Alice marked as favorite');
        
        // Test 6: Search by name
        const searchResults = await contactsStorage.search({ search: 'Alice' });
        assert(searchResults.length === 1 && searchResults[0].name === 'Alice', 'Search by name works');
        
        // Test 7: Search by crypto type
        const btcResults = await contactsStorage.search({ crypto_type: 'BTC' });
        assert(btcResults.length === 1 && btcResults[0].name === 'Alice', 'Search by BTC works');
        
        // Test 8: Favorites search
        const favoriteResults = await contactsStorage.search({ favorites_only: true });
        assert(favoriteResults.length === 1, 'Favorites search works');
        
        // Test 9: Contact merge
        const charlie = await contactsStorage.create({
            name: 'Charlie',
            notes: 'Solana user',
            crypto_addresses: [{
                id: 'addr3',
                crypto_type: 'SOL',
                address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
                label: 'Solana wallet'
            }],
            is_favorite: false,
            group_ids: []
        });
        
        const mergedContact = await contactsStorage.merge({
            primary_contact_id: alice.id,
            source_contact_ids: [charlie.id],
            delete_source_contacts: true
        });
        assert(mergedContact && mergedContact.crypto_addresses.length > 1, 'Contact merge works');
        
        // Test 10: Delete contact
        const deleteResult = await contactsStorage.delete(bob.id);
        assert(deleteResult === true, 'Contact deletion works');
        
        console.log('\n📂 GROUPS STORAGE TESTS\n');
        
        // Test 11: Create group
        const friendsGroup = await groupsStorage.create({
            name: 'Friends',
            description: 'Close friends'
        });
        assert(friendsGroup && friendsGroup.name === 'Friends', 'Group creation works');
        
        // Test 12: Get all groups
        const allGroups = await groupsStorage.getAll();
        assert(allGroups.length === 1, 'Get all groups works');
        
        // Test 13: Add contact to group
        const addResult = await groupsStorage.addContact(friendsGroup.id, alice.id);
        assert(addResult === true, 'Add contact to group works');
        
        // Test 14: Remove contact from group
        const removeResult = await groupsStorage.removeContact(friendsGroup.id, alice.id);
        assert(removeResult === true, 'Remove contact from group works');
        
        console.log('\n💰 CRYPTOS STORAGE TESTS\n');
        
        // Test 15: Get all cryptos
        const allCryptos = await cryptosStorage.getAll();
        assert(allCryptos.default_cryptos.length === 10, 'Default cryptos loaded');
        assert(allCryptos.custom_cryptos.length === 0, 'No custom cryptos initially');
        
        // Test 16: Create custom crypto
        const customCrypto = await cryptosStorage.create({
            name: 'Dogecoin',
            symbol: 'DOGE'
        });
        assert(customCrypto && customCrypto.symbol === 'DOGE', 'Custom crypto creation works');
        
        // Test 17: Delete custom crypto
        const cryptoDeleteResult = await cryptosStorage.delete(customCrypto.id);
        assert(cryptoDeleteResult === true, 'Custom crypto deletion works');
        
        console.log('\n📤 EXPORT STORAGE TESTS\n');
        
        // Test 18: Export JSON
        const jsonExport = await exportStorage.exportJSON();
        assert(jsonExport && Array.isArray(jsonExport.contacts), 'JSON export works');
        
        // Test 19: Export CSV
        const csvExport = await exportStorage.exportCSV();
        assert(csvExport && csvExport.csv_content.includes('Name,Crypto Type'), 'CSV export works');
        
        // Results
        console.log('\n=== TEST RESULTS ===');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${totalTests - passedTests}`);
        console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
        
        if (passedTests === totalTests) {
            console.log('\n🎉 ALL TESTS PASSED! CrypTags offline storage working correctly.');
            return true;
        } else {
            console.log('\n⚠️  Failed tests:');
            failedTests.forEach(test => console.log(`  - ${test}`));
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ Test execution error:', error.message);
        return false;
    }
}

// Run tests
runTests().then(success => {
    process.exit(success ? 0 : 1);
});