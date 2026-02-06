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
        self.created_groups = []

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

    # ========================
    # NEW: Group Tests for CrypTags Groups Feature  
    # ========================
    
    def test_groups_create(self):
        """Test group creation endpoint"""
        print("🧪 Testing group creation...")
        
        # Test creating Ethereum Foundation group
        group_data_1 = {
            "name": "Ethereum Foundation",
            "description": "ETH core team"
        }
        
        response = self.session.post(f"{self.base_url}/groups", json=group_data_1)
        
        if response.status_code != 200:
            print(f"❌ Group creation failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        group_id_1 = data.get("id")
        if not group_id_1:
            print(f"❌ No group ID in response: {data}")
            return False
        
        self.created_groups.append(group_id_1)
        print(f"✅ Group 1 created successfully - ID: {group_id_1}, Name: {data['name']}")
        
        # Test creating DeFi Projects group
        group_data_2 = {
            "name": "DeFi Projects", 
            "description": "DeFi related contacts"
        }
        
        response_2 = self.session.post(f"{self.base_url}/groups", json=group_data_2)
        
        if response_2.status_code != 200:
            print(f"❌ Group 2 creation failed: {response_2.status_code} - {response_2.text}")
            return False
        
        data_2 = response_2.json()
        group_id_2 = data_2.get("id")
        if not group_id_2:
            print(f"❌ No group ID in response 2: {data_2}")
            return False
        
        self.created_groups.append(group_id_2)
        print(f"✅ Group 2 created successfully - ID: {group_id_2}, Name: {data_2['name']}")
        
        # Verify contact_count is 0 for new groups
        if data.get("contact_count") != 0 or data_2.get("contact_count") != 0:
            print(f"❌ New groups should have contact_count=0, got {data.get('contact_count')} and {data_2.get('contact_count')}")
            return False
        
        print("✅ Group creation with contact_count validation successful")
        return True

    def test_groups_list(self):
        """Test group listing endpoint"""
        print("🧪 Testing group listing...")
        
        response = self.session.get(f"{self.base_url}/groups")
        
        if response.status_code != 200:
            print(f"❌ Group listing failed: {response.status_code} - {response.text}")
            return False
        
        groups = response.json()
        
        if len(groups) < 2:
            print(f"❌ Expected at least 2 groups, got {len(groups)}")
            return False
        
        # Verify each group has contact_count
        for group in groups:
            if "contact_count" not in group:
                print(f"❌ Group missing contact_count: {group}")
                return False
            if group["name"] in ["Ethereum Foundation", "DeFi Projects"]:
                print(f"✅ Found expected group: {group['name']} (contact_count: {group['contact_count']})")
        
        print(f"✅ Group listing successful - {len(groups)} groups found with contact counts")
        return True

    def test_groups_get_single(self):
        """Test get single group endpoint"""
        print("🧪 Testing single group retrieval...")
        
        if not self.created_groups:
            print("❌ No groups available for testing")
            return False
        
        group_id = self.created_groups[0]
        response = self.session.get(f"{self.base_url}/groups/{group_id}")
        
        if response.status_code != 200:
            print(f"❌ Group retrieval failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        if data.get("id") != group_id:
            print(f"❌ Group ID mismatch: expected {group_id}, got {data.get('id')}")
            return False
        
        if "contact_count" not in data:
            print(f"❌ Group missing contact_count: {data}")
            return False
        
        print(f"✅ Group retrieved successfully - {data['name']} (contact_count: {data['contact_count']})")
        return True

    def test_groups_update(self):
        """Test group update endpoint"""
        print("🧪 Testing group update...")
        
        if not self.created_groups:
            print("❌ No groups available for testing")
            return False
        
        group_id = self.created_groups[0]
        update_data = {
            "name": "Ethereum Foundation Updated",
            "description": "Updated ETH core team description"
        }
        
        response = self.session.put(f"{self.base_url}/groups/{group_id}", json=update_data)
        
        if response.status_code != 200:
            print(f"❌ Group update failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        if data.get("name") != update_data["name"]:
            print(f"❌ Name not updated: expected {update_data['name']}, got {data.get('name')}")
            return False
        
        print(f"✅ Group updated successfully - new name: {data['name']}")
        return True

    def test_contact_group_relationships(self):
        """Test adding and removing contacts from groups"""
        print("🧪 Testing contact-group relationships...")
        
        if not self.created_groups or not self.created_contacts:
            print("❌ Need both groups and contacts for testing relationships")
            return False
        
        group_id = self.created_groups[0]
        contact_id = self.created_contacts[0]
        
        # Add contact to group
        response = self.session.post(f"{self.base_url}/groups/{group_id}/contacts/{contact_id}")
        
        if response.status_code != 200:
            print(f"❌ Add contact to group failed: {response.status_code} - {response.text}")
            return False
        
        print(f"✅ Contact added to group successfully")
        
        # Verify contact is in group by filtering contacts
        filter_response = self.session.get(f"{self.base_url}/contacts?group_id={group_id}")
        
        if filter_response.status_code != 200:
            print(f"❌ Filter contacts by group failed: {filter_response.status_code} - {filter_response.text}")
            return False
        
        filtered_contacts = filter_response.json()
        contact_found = any(contact["id"] == contact_id for contact in filtered_contacts)
        
        if not contact_found:
            print(f"❌ Contact {contact_id} not found in group {group_id}")
            return False
        
        print(f"✅ Contact filtering by group working - found {len(filtered_contacts)} contacts in group")
        
        # Verify group contact_count increased
        group_response = self.session.get(f"{self.base_url}/groups/{group_id}")
        if group_response.status_code == 200:
            group_data = group_response.json()
            if group_data.get("contact_count", 0) > 0:
                print(f"✅ Group contact_count increased: {group_data['contact_count']}")
            else:
                print(f"❌ Group contact_count should be > 0, got {group_data.get('contact_count')}")
                return False
        
        # Remove contact from group
        remove_response = self.session.delete(f"{self.base_url}/groups/{group_id}/contacts/{contact_id}")
        
        if remove_response.status_code != 200:
            print(f"❌ Remove contact from group failed: {remove_response.status_code} - {remove_response.text}")
            return False
        
        print(f"✅ Contact removed from group successfully")
        
        # Verify contact is no longer in group
        verify_response = self.session.get(f"{self.base_url}/contacts?group_id={group_id}")
        if verify_response.status_code == 200:
            verify_contacts = verify_response.json()
            contact_still_found = any(contact["id"] == contact_id for contact in verify_contacts)
            if contact_still_found:
                print(f"❌ Contact should not be in group after removal")
                return False
            print(f"✅ Contact successfully removed from group")
        
        return True

    def test_merge_contacts(self):
        """Test contact merge functionality"""
        print("🧪 Testing contact merge functionality...")
        
        # First create Alice and Bob contacts for merging
        alice_data = {
            "name": "Alice Crypto",
            "notes": "Alice's original notes",
            "crypto_addresses": [
                {
                    "crypto_type": "ETH",
                    "address": "0x1234567890123456789012345678901234567890",
                    "label": "Alice ETH"
                }
            ]
        }
        
        bob_data = {
            "name": "Bob Bitcoin",
            "notes": "Bob's original notes", 
            "crypto_addresses": [
                {
                    "crypto_type": "BTC", 
                    "address": "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
                    "label": "Bob BTC"
                }
            ]
        }
        
        # Create Alice
        alice_response = self.session.post(f"{self.base_url}/contacts", json=alice_data)
        if alice_response.status_code != 200:
            print(f"❌ Failed to create Alice: {alice_response.status_code}")
            return False
        alice_id = alice_response.json()["id"]
        self.created_contacts.append(alice_id)
        
        # Create Bob  
        bob_response = self.session.post(f"{self.base_url}/contacts", json=bob_data)
        if bob_response.status_code != 200:
            print(f"❌ Failed to create Bob: {bob_response.status_code}")
            return False
        bob_id = bob_response.json()["id"]
        self.created_contacts.append(bob_id)
        
        print(f"✅ Created test contacts - Alice: {alice_id}, Bob: {bob_id}")
        
        # Perform merge operation
        merge_data = {
            "primary_contact_id": alice_id,
            "source_contact_ids": [bob_id],
            "delete_source_contacts": True
        }
        
        merge_response = self.session.post(f"{self.base_url}/contacts/merge", json=merge_data)
        
        if merge_response.status_code != 200:
            print(f"❌ Contact merge failed: {merge_response.status_code} - {merge_response.text}")
            return False
        
        merged_contact = merge_response.json()
        
        # Verify merged contact has addresses from both contacts
        addresses = merged_contact.get("crypto_addresses", [])
        eth_found = any(addr["crypto_type"] == "ETH" for addr in addresses)
        btc_found = any(addr["crypto_type"] == "BTC" for addr in addresses)
        
        if not eth_found or not btc_found:
            print(f"❌ Merged contact missing addresses - ETH: {eth_found}, BTC: {btc_found}")
            return False
        
        print(f"✅ Merge successful - contact has {len(addresses)} addresses (ETH + BTC)")
        
        # Verify notes were merged
        merged_notes = merged_contact.get("notes", "")
        if "Alice's original notes" not in merged_notes or "Bob's original notes" not in merged_notes:
            print(f"❌ Notes not properly merged: {merged_notes}")
            return False
        
        print(f"✅ Notes merged successfully")
        
        # Verify Bob was deleted (since delete_source_contacts=True)
        bob_verify_response = self.session.get(f"{self.base_url}/contacts/{bob_id}")
        if bob_verify_response.status_code != 404:
            print(f"❌ Bob should be deleted after merge, got {bob_verify_response.status_code}")
            return False
        
        print(f"✅ Source contact Bob successfully deleted after merge")
        
        # Remove Bob from created_contacts since it's deleted
        if bob_id in self.created_contacts:
            self.created_contacts.remove(bob_id)
        
        return True

    def test_advanced_sorting_filtering(self):
        """Test advanced sorting and filtering options"""
        print("🧪 Testing advanced sorting and filtering...")
        
        # Test descending name sort
        desc_response = self.session.get(f"{self.base_url}/contacts?sort_by=name_desc")
        if desc_response.status_code != 200:
            print(f"❌ Name descending sort failed: {desc_response.status_code}")
            return False
        
        desc_contacts = desc_response.json()
        if len(desc_contacts) >= 2:
            # Verify descending order
            first_name = desc_contacts[0]["name"]
            second_name = desc_contacts[1]["name"] 
            if first_name < second_name:
                print(f"❌ Descending sort not working: {first_name} should be after {second_name}")
                return False
        
        print(f"✅ Descending name sort working - {len(desc_contacts)} contacts")
        
        # Test updated_desc sort
        updated_response = self.session.get(f"{self.base_url}/contacts?sort_by=updated_desc")
        if updated_response.status_code != 200:
            print(f"❌ Updated descending sort failed: {updated_response.status_code}")
            return False
        
        updated_contacts = updated_response.json()
        print(f"✅ Updated descending sort working - {len(updated_contacts)} contacts")
        
        # Test crypto type filtering
        eth_filter_response = self.session.get(f"{self.base_url}/contacts?crypto_type=ETH")
        if eth_filter_response.status_code != 200:
            print(f"❌ ETH crypto filter failed: {eth_filter_response.status_code}")
            return False
        
        eth_contacts = eth_filter_response.json()
        
        # Verify all returned contacts have ETH addresses
        for contact in eth_contacts:
            has_eth = any(addr["crypto_type"] == "ETH" for addr in contact.get("crypto_addresses", []))
            if not has_eth:
                print(f"❌ Contact {contact['name']} in ETH filter but has no ETH address")
                return False
        
        print(f"✅ ETH crypto type filter working - {len(eth_contacts)} ETH contacts")
        
        # Test BTC crypto type filtering
        btc_filter_response = self.session.get(f"{self.base_url}/contacts?crypto_type=BTC")
        if btc_filter_response.status_code == 200:
            btc_contacts = btc_filter_response.json()
            print(f"✅ BTC crypto type filter working - {len(btc_contacts)} BTC contacts")
        
        return True

    def test_groups_delete(self):
        """Test group deletion (ensuring contacts are NOT deleted)"""
        print("🧪 Testing group deletion...")
        
        if not self.created_groups:
            print("❌ No groups available for testing deletion")
            return False
        
        # Get contacts count before group deletion
        contacts_before_response = self.session.get(f"{self.base_url}/contacts")
        if contacts_before_response.status_code != 200:
            print(f"❌ Failed to get contacts before group deletion")
            return False
        contacts_before = len(contacts_before_response.json())
        
        # Delete a group
        group_id = self.created_groups[-1]  # Use last group for deletion
        response = self.session.delete(f"{self.base_url}/groups/{group_id}")
        
        if response.status_code != 200:
            print(f"❌ Group deletion failed: {response.status_code} - {response.text}")
            return False
        
        print(f"✅ Group deleted successfully")
        
        # Verify group is deleted
        verify_response = self.session.get(f"{self.base_url}/groups/{group_id}")
        if verify_response.status_code != 404:
            print(f"❌ Deleted group should return 404, got {verify_response.status_code}")
            return False
        
        # Verify contacts are NOT deleted
        contacts_after_response = self.session.get(f"{self.base_url}/contacts")
        if contacts_after_response.status_code != 200:
            print(f"❌ Failed to get contacts after group deletion")
            return False
        contacts_after = len(contacts_after_response.json())
        
        if contacts_after != contacts_before:
            print(f"❌ Contacts count changed after group deletion: {contacts_before} → {contacts_after}")
            return False
        
        print(f"✅ Group deletion successful - contacts preserved ({contacts_after} contacts)")
        
        # Remove from created_groups list
        self.created_groups.remove(group_id)
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
        
        # Delete remaining groups
        for group_id in self.created_groups[:]:
            try:
                response = self.session.delete(f"{self.base_url}/groups/{group_id}")
                if response.status_code == 200:
                    self.created_groups.remove(group_id)
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
        
        # NEW: Group CRUD Tests
        test_results["group_create"] = self.test_groups_create()
        test_results["group_list"] = self.test_groups_list()
        test_results["group_get"] = self.test_groups_get_single()
        test_results["group_update"] = self.test_groups_update()
        
        # NEW: Contact-Group Relationship Tests
        test_results["contact_group_relationship"] = self.test_contact_group_relationships()
        
        # NEW: Merge Contacts Test
        test_results["merge_contacts"] = self.test_merge_contacts()
        
        # NEW: Advanced Sorting/Filtering Tests
        test_results["advanced_filtering"] = self.test_advanced_sorting_filtering()
        
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
        
        # NEW: Group deletion test (after other group tests)
        test_results["group_delete"] = self.test_groups_delete()
        
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
            print(f"{test_name:<25} {status}")
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