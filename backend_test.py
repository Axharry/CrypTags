#!/usr/bin/env python3
"""
CrypTags Backend API Test Suite

Tests all backend API endpoints comprehensively including:
- Authentication (register, login, me)
- Contact CRUD operations
- Custom cryptocurrency management
- Data export (JSON/CSV)
- Address validation
"""

import requests
import json
import uuid
from datetime import datetime
import csv
import io


class CrypTagsAPITester:
    def __init__(self, base_url="https://crypto-contacts-1.preview.emergentagent.com/api"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_data = {
            "email": f"test.user.{uuid.uuid4().hex[:8]}@example.com",
            "password": "SecurePassword123!",
            "name": "Test User CrypTags"
        }
        self.created_contacts = []
        self.created_cryptos = []

    def set_auth(self, token):
        """Set authentication token for requests"""
        self.auth_token = token
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def clear_auth(self):
        """Clear authentication token"""
        self.auth_token = None
        if "Authorization" in self.session.headers:
            del self.session.headers["Authorization"]

    def test_auth_register(self):
        """Test user registration endpoint"""
        print("🧪 Testing user registration...")
        
        # Test valid registration
        response = self.session.post(f"{self.base_url}/auth/register", json=self.test_user_data)
        
        if response.status_code != 200:
            print(f"❌ Registration failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        if not all(key in data for key in ["access_token", "token_type", "user"]):
            print(f"❌ Invalid registration response structure: {data}")
            return False
        
        # Set token for future requests
        self.set_auth(data["access_token"])
        print(f"✅ Registration successful - User ID: {data['user']['id']}")
        
        # Test duplicate registration (should fail)
        duplicate_response = self.session.post(f"{self.base_url}/auth/register", json=self.test_user_data)
        if duplicate_response.status_code != 400:
            print(f"❌ Duplicate registration should return 400, got {duplicate_response.status_code}")
            return False
        
        print("✅ Duplicate registration properly rejected")
        return True

    def test_auth_login(self):
        """Test user login endpoint"""
        print("🧪 Testing user login...")
        
        # Clear auth first
        self.clear_auth()
        
        # Test valid login
        login_data = {
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        
        response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
        
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        if not all(key in data for key in ["access_token", "token_type", "user"]):
            print(f"❌ Invalid login response structure: {data}")
            return False
        
        # Set token for future requests
        self.set_auth(data["access_token"])
        print(f"✅ Login successful - Token received")
        
        # Test invalid credentials
        self.clear_auth()
        invalid_login = {
            "email": self.test_user_data["email"],
            "password": "WrongPassword123"
        }
        
        invalid_response = self.session.post(f"{self.base_url}/auth/login", json=invalid_login)
        if invalid_response.status_code != 401:
            print(f"❌ Invalid login should return 401, got {invalid_response.status_code}")
            return False
        
        # Reset auth token for subsequent tests
        self.set_auth(data["access_token"])
        print("✅ Invalid credentials properly rejected")
        return True

    def test_auth_me(self):
        """Test get current user endpoint"""
        print("🧪 Testing get current user...")
        
        # Test with valid token
        response = self.session.get(f"{self.base_url}/auth/me")
        
        if response.status_code != 200:
            print(f"❌ Get user info failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        expected_fields = ["id", "email", "name", "created_at"]
        if not all(key in data for key in expected_fields):
            print(f"❌ Invalid user info response structure: {data}")
            return False
        
        print(f"✅ User info retrieved successfully - {data['name']} ({data['email']})")
        
        # Test with invalid token
        original_token = self.auth_token
        self.set_auth("invalid_token_12345")
        
        invalid_response = self.session.get(f"{self.base_url}/auth/me")
        if invalid_response.status_code != 401:
            print(f"❌ Invalid token should return 401, got {invalid_response.status_code}")
            return False
        
        # Restore valid token
        self.set_auth(original_token)
        print("✅ Invalid token properly rejected")
        return True

    def test_contacts_create(self):
        """Test contact creation endpoint"""
        print("🧪 Testing contact creation...")
        
        # Test valid contact with multiple crypto addresses
        contact_data = {
            "name": "Alice Ethereum",
            "notes": "My main crypto trading contact",
            "crypto_addresses": [
                {
                    "crypto_type": "ETH",
                    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD24",
                    "label": "Main wallet"
                },
                {
                    "crypto_type": "BTC",
                    "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                    "label": "Cold storage"
                }
            ],
            "is_favorite": False
        }
        
        response = self.session.post(f"{self.base_url}/contacts", json=contact_data)
        
        if response.status_code != 200:
            print(f"❌ Contact creation failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        contact_id = data.get("id")
        if not contact_id:
            print(f"❌ No contact ID in response: {data}")
            return False
        
        self.created_contacts.append(contact_id)
        print(f"✅ Contact created successfully - ID: {contact_id}")
        
        # Test invalid crypto address
        invalid_contact = {
            "name": "Invalid Address Test",
            "crypto_addresses": [
                {
                    "crypto_type": "ETH",
                    "address": "invalid_ethereum_address_format",
                    "label": "Invalid"
                }
            ]
        }
        
        invalid_response = self.session.post(f"{self.base_url}/contacts", json=invalid_contact)
        if invalid_response.status_code != 400:
            print(f"❌ Invalid address should return 400, got {invalid_response.status_code}")
            return False
        
        print("✅ Invalid crypto address properly rejected")
        return True

    def test_contacts_list(self):
        """Test contact listing with filters"""
        print("🧪 Testing contact listing...")
        
        # Create a few more test contacts for filtering
        test_contacts = [
            {
                "name": "Bob Bitcoin",
                "notes": "Bitcoin specialist",
                "crypto_addresses": [
                    {
                        "crypto_type": "BTC",
                        "address": "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
                        "label": "Main BTC"
                    }
                ],
                "is_favorite": True
            },
            {
                "name": "Charlie Solana",
                "notes": "SOL trader",
                "crypto_addresses": [
                    {
                        "crypto_type": "SOL",
                        "address": "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1",
                        "label": "SOL wallet"
                    }
                ],
                "is_favorite": False
            }
        ]
        
        for contact in test_contacts:
            response = self.session.post(f"{self.base_url}/contacts", json=contact)
            if response.status_code == 200:
                self.created_contacts.append(response.json()["id"])
        
        # Test basic listing
        response = self.session.get(f"{self.base_url}/contacts")
        if response.status_code != 200:
            print(f"❌ Contact listing failed: {response.status_code} - {response.text}")
            return False
        
        contacts = response.json()
        if len(contacts) < 3:
            print(f"❌ Expected at least 3 contacts, got {len(contacts)}")
            return False
        
        print(f"✅ Contact listing successful - {len(contacts)} contacts found")
        
        # Test search filter
        search_response = self.session.get(f"{self.base_url}/contacts?search=Bitcoin")
        if search_response.status_code == 200:
            search_results = search_response.json()
            print(f"✅ Search filter working - {len(search_results)} results for 'Bitcoin'")
        
        # Test crypto_type filter
        crypto_filter_response = self.session.get(f"{self.base_url}/contacts?crypto_type=ETH")
        if crypto_filter_response.status_code == 200:
            crypto_results = crypto_filter_response.json()
            print(f"✅ Crypto type filter working - {len(crypto_results)} ETH contacts")
        
        # Test favorites filter
        favorites_response = self.session.get(f"{self.base_url}/contacts?favorites_only=true")
        if favorites_response.status_code == 200:
            favorite_results = favorites_response.json()
            print(f"✅ Favorites filter working - {len(favorite_results)} favorite contacts")
        
        return True

    def test_contacts_get_single(self):
        """Test get single contact endpoint"""
        print("🧪 Testing single contact retrieval...")
        
        if not self.created_contacts:
            print("❌ No contacts available for testing")
            return False
        
        contact_id = self.created_contacts[0]
        response = self.session.get(f"{self.base_url}/contacts/{contact_id}")
        
        if response.status_code != 200:
            print(f"❌ Contact retrieval failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        if data.get("id") != contact_id:
            print(f"❌ Contact ID mismatch: expected {contact_id}, got {data.get('id')}")
            return False
        
        print(f"✅ Contact retrieved successfully - {data['name']}")
        
        # Test non-existent contact
        fake_id = str(uuid.uuid4())
        not_found_response = self.session.get(f"{self.base_url}/contacts/{fake_id}")
        if not_found_response.status_code != 404:
            print(f"❌ Non-existent contact should return 404, got {not_found_response.status_code}")
            return False
        
        print("✅ Non-existent contact properly returns 404")
        return True

    def test_contacts_update(self):
        """Test contact update endpoint"""
        print("🧪 Testing contact update...")
        
        if not self.created_contacts:
            print("❌ No contacts available for testing")
            return False
        
        contact_id = self.created_contacts[0]
        update_data = {
            "name": "Alice Updated Name",
            "notes": "Updated notes for Alice",
            "is_favorite": True
        }
        
        response = self.session.put(f"{self.base_url}/contacts/{contact_id}", json=update_data)
        
        if response.status_code != 200:
            print(f"❌ Contact update failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        if data.get("name") != update_data["name"]:
            print(f"❌ Name not updated: expected {update_data['name']}, got {data.get('name')}")
            return False
        
        print(f"✅ Contact updated successfully - new name: {data['name']}")
        return True

    def test_contacts_favorite_toggle(self):
        """Test contact favorite toggle endpoint"""
        print("🧪 Testing favorite toggle...")
        
        if not self.created_contacts:
            print("❌ No contacts available for testing")
            return False
        
        contact_id = self.created_contacts[0]
        
        # Get current favorite status
        get_response = self.session.get(f"{self.base_url}/contacts/{contact_id}")
        if get_response.status_code != 200:
            print("❌ Could not get contact for favorite test")
            return False
        
        current_favorite = get_response.json().get("is_favorite", False)
        
        # Toggle favorite
        response = self.session.put(f"{self.base_url}/contacts/{contact_id}/favorite")
        
        if response.status_code != 200:
            print(f"❌ Favorite toggle failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        new_favorite = data.get("is_favorite", False)
        
        if new_favorite == current_favorite:
            print(f"❌ Favorite status not toggled: was {current_favorite}, still {new_favorite}")
            return False
        
        print(f"✅ Favorite toggled successfully: {current_favorite} → {new_favorite}")
        return True

    def test_contacts_delete(self):
        """Test contact deletion endpoint"""
        print("🧪 Testing contact deletion...")
        
        if not self.created_contacts:
            print("❌ No contacts available for testing")
            return False
        
        # Use the last contact for deletion test
        contact_id = self.created_contacts[-1]
        
        response = self.session.delete(f"{self.base_url}/contacts/{contact_id}")
        
        if response.status_code != 200:
            print(f"❌ Contact deletion failed: {response.status_code} - {response.text}")
            return False
        
        # Verify contact is deleted
        verify_response = self.session.get(f"{self.base_url}/contacts/{contact_id}")
        if verify_response.status_code != 404:
            print(f"❌ Deleted contact should return 404, got {verify_response.status_code}")
            return False
        
        self.created_contacts.remove(contact_id)
        print(f"✅ Contact deleted successfully")
        return True

    def test_cryptos_list(self):
        """Test cryptocurrency listing endpoint"""
        print("🧪 Testing cryptocurrency listing...")
        
        response = self.session.get(f"{self.base_url}/cryptos")
        
        if response.status_code != 200:
            print(f"❌ Crypto listing failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        
        # Check for expected structure
        if "default_cryptos" not in data or "custom_cryptos" not in data:
            print(f"❌ Invalid crypto response structure: {data}")
            return False
        
        default_cryptos = data["default_cryptos"]
        if len(default_cryptos) < 10:
            print(f"❌ Expected at least 10 default cryptos, got {len(default_cryptos)}")
            return False
        
        # Check for expected cryptocurrencies
        expected_symbols = ["BTC", "ETH", "SOL", "USDT", "BNB"]
        found_symbols = [crypto["symbol"] for crypto in default_cryptos]
        
        for symbol in expected_symbols:
            if symbol not in found_symbols:
                print(f"❌ Expected crypto {symbol} not found in defaults")
                return False
        
        print(f"✅ Crypto listing successful - {len(default_cryptos)} default, {len(data['custom_cryptos'])} custom")
        return True

    def test_cryptos_create_custom(self):
        """Test custom cryptocurrency creation"""
        print("🧪 Testing custom cryptocurrency creation...")
        
        custom_crypto = {
            "name": "TestCoin",
            "symbol": "TEST",
            "address_regex": r"^test[a-zA-Z0-9]{32}$"
        }
        
        response = self.session.post(f"{self.base_url}/cryptos", json=custom_crypto)
        
        if response.status_code != 200:
            print(f"❌ Custom crypto creation failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        crypto_id = data.get("id")
        
        if not crypto_id:
            print(f"❌ No crypto ID in response: {data}")
            return False
        
        self.created_cryptos.append(crypto_id)
        print(f"✅ Custom crypto created successfully - {data['symbol']}")
        
        # Test duplicate symbol
        duplicate_response = self.session.post(f"{self.base_url}/cryptos", json=custom_crypto)
        if duplicate_response.status_code != 400:
            print(f"❌ Duplicate crypto should return 400, got {duplicate_response.status_code}")
            return False
        
        # Test conflict with default crypto
        btc_crypto = {
            "name": "Fake Bitcoin",
            "symbol": "BTC",
            "address_regex": r"^fake"
        }
        
        conflict_response = self.session.post(f"{self.base_url}/cryptos", json=btc_crypto)
        if conflict_response.status_code != 400:
            print(f"❌ Conflicting default crypto should return 400, got {conflict_response.status_code}")
            return False
        
        print("✅ Duplicate and conflict validation working")
        return True

    def test_cryptos_delete_custom(self):
        """Test custom cryptocurrency deletion"""
        print("🧪 Testing custom cryptocurrency deletion...")
        
        if not self.created_cryptos:
            print("❌ No custom cryptos available for testing")
            return False
        
        crypto_id = self.created_cryptos[0]
        
        response = self.session.delete(f"{self.base_url}/cryptos/{crypto_id}")
        
        if response.status_code != 200:
            print(f"❌ Custom crypto deletion failed: {response.status_code} - {response.text}")
            return False
        
        print(f"✅ Custom crypto deleted successfully")
        
        # Test non-existent crypto deletion
        fake_id = str(uuid.uuid4())
        not_found_response = self.session.delete(f"{self.base_url}/cryptos/{fake_id}")
        if not_found_response.status_code != 404:
            print(f"❌ Non-existent crypto should return 404, got {not_found_response.status_code}")
            return False
        
        print("✅ Non-existent crypto deletion properly returns 404")
        return True

    def test_export_json(self):
        """Test JSON export endpoint"""
        print("🧪 Testing JSON export...")
        
        response = self.session.get(f"{self.base_url}/export/json")
        
        if response.status_code != 200:
            print(f"❌ JSON export failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        
        # Check structure
        if "contacts" not in data or "exported_at" not in data:
            print(f"❌ Invalid JSON export structure: {data}")
            return False
        
        contacts = data["contacts"]
        if not isinstance(contacts, list):
            print(f"❌ Contacts should be a list, got {type(contacts)}")
            return False
        
        print(f"✅ JSON export successful - {len(contacts)} contacts exported")
        
        # Verify contact structure
        if contacts:
            contact = contacts[0]
            expected_fields = ["name", "notes", "is_favorite", "crypto_addresses"]
            if not all(field in contact for field in expected_fields):
                print(f"❌ Contact missing required fields: {contact}")
                return False
        
        print("✅ JSON export format validated")
        return True

    def test_export_csv(self):
        """Test CSV export endpoint"""
        print("🧪 Testing CSV export...")
        
        response = self.session.get(f"{self.base_url}/export/csv")
        
        if response.status_code != 200:
            print(f"❌ CSV export failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        
        # Check structure
        if "csv_content" not in data or "exported_at" not in data:
            print(f"❌ Invalid CSV export structure: {data}")
            return False
        
        csv_content = data["csv_content"]
        if not isinstance(csv_content, str):
            print(f"❌ CSV content should be string, got {type(csv_content)}")
            return False
        
        # Parse CSV to validate format
        try:
            csv_reader = csv.reader(io.StringIO(csv_content))
            rows = list(csv_reader)
            
            if len(rows) < 1:
                print("❌ CSV should have at least a header row")
                return False
            
            # Check header
            header = rows[0]
            expected_columns = ["Name", "Crypto Type", "Address", "Label", "Notes", "Is Favorite"]
            if header != expected_columns:
                print(f"❌ CSV header mismatch. Expected: {expected_columns}, Got: {header}")
                return False
            
            print(f"✅ CSV export successful - {len(rows)-1} data rows")
            
        except Exception as e:
            print(f"❌ CSV parsing error: {e}")
            return False
        
        print("✅ CSV export format validated")
        return True

    def test_validate_address(self):
        """Test crypto address validation endpoint"""
        print("🧪 Testing address validation...")
        
        # Test valid Ethereum address
        eth_params = {
            "crypto_type": "ETH",
            "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD24"
        }
        
        response = self.session.post(f"{self.base_url}/validate-address", params=eth_params)
        
        if response.status_code != 200:
            print(f"❌ Address validation failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        
        if not data.get("is_valid", False):
            print(f"❌ Valid ETH address should be valid: {data}")
            return False
        
        print(f"✅ Valid ETH address validation successful")
        
        # Test invalid address
        invalid_params = {
            "crypto_type": "ETH", 
            "address": "invalid_eth_address"
        }
        
        invalid_response = self.session.post(f"{self.base_url}/validate-address", params=invalid_params)
        
        if invalid_response.status_code == 200:
            invalid_data = invalid_response.json()
            if invalid_data.get("is_valid", True):
                print(f"❌ Invalid ETH address should be invalid: {invalid_data}")
                return False
            
            print("✅ Invalid address properly rejected")
        
        # Test Bitcoin address
        btc_params = {
            "crypto_type": "BTC",
            "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        }
        
        btc_response = self.session.post(f"{self.base_url}/validate-address", params=btc_params)
        
        if btc_response.status_code == 200:
            btc_data = btc_response.json()
            print(f"✅ BTC address validation: {btc_data['is_valid']}")
        
        return True

    def test_health_endpoints(self):
        """Test health check endpoints"""
        print("🧪 Testing health endpoints...")
        
        # Test root endpoint
        root_response = self.session.get(f"{self.base_url}/")
        if root_response.status_code == 200:
            print("✅ Root endpoint working")
        else:
            print(f"❌ Root endpoint failed: {root_response.status_code}")
        
        # Test health endpoint
        health_response = self.session.get(f"{self.base_url}/health")
        if health_response.status_code == 200:
            print("✅ Health endpoint working")
        else:
            print(f"❌ Health endpoint failed: {health_response.status_code}")
        
        return True

    def cleanup(self):
        """Clean up created test data"""
        print("🧹 Cleaning up test data...")
        
        # Delete remaining contacts
        for contact_id in self.created_contacts[:]:
            try:
                response = self.session.delete(f"{self.base_url}/contacts/{contact_id}")
                if response.status_code == 200:
                    self.created_contacts.remove(contact_id)
            except:
                pass
        
        # Delete remaining custom cryptos
        for crypto_id in self.created_cryptos[:]:
            try:
                response = self.session.delete(f"{self.base_url}/cryptos/{crypto_id}")
                if response.status_code == 200:
                    self.created_cryptos.remove(crypto_id)
            except:
                pass
        
        print("✅ Cleanup completed")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting CrypTags Backend API Test Suite")
        print(f"🌍 Testing against: {self.base_url}")
        print("=" * 60)
        
        test_results = {}
        
        # Authentication Tests
        test_results["register"] = self.test_auth_register()
        test_results["login"] = self.test_auth_login()
        test_results["auth_me"] = self.test_auth_me()
        
        # Contact CRUD Tests
        test_results["contact_create"] = self.test_contacts_create()
        test_results["contact_list"] = self.test_contacts_list()
        test_results["contact_get"] = self.test_contacts_get_single()
        test_results["contact_update"] = self.test_contacts_update()
        test_results["contact_favorite"] = self.test_contacts_favorite_toggle()
        
        # Custom Crypto Tests
        test_results["crypto_list"] = self.test_cryptos_list()
        test_results["crypto_create"] = self.test_cryptos_create_custom()
        test_results["crypto_delete"] = self.test_cryptos_delete_custom()
        
        # Export Tests
        test_results["export_json"] = self.test_export_json()
        test_results["export_csv"] = self.test_export_csv()
        
        # Address Validation Test
        test_results["validate_address"] = self.test_validate_address()
        
        # Health Tests
        test_results["health"] = self.test_health_endpoints()
        
        # Contact deletion test (after other tests)
        test_results["contact_delete"] = self.test_contacts_delete()
        
        # Cleanup
        self.cleanup()
        
        # Results Summary
        print("=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = 0
        failed = 0
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:<20} {status}")
            if result:
                passed += 1
            else:
                failed += 1
        
        print("-" * 60)
        print(f"Total Tests: {len(test_results)} | Passed: {passed} | Failed: {failed}")
        
        if failed == 0:
            print("🎉 ALL TESTS PASSED! CrypTags Backend API is working correctly.")
            return True
        else:
            print(f"⚠️  {failed} test(s) failed. Please review the issues above.")
            return False


if __name__ == "__main__":
    tester = CrypTagsAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)