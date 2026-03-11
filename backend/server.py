from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'cryptags_db')]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not SECRET_KEY:
    SECRET_KEY = 'cryptags-dev-secret-key-2025'  # Only used in development
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="CrypTags API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ========================
# Models
# ========================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class CryptoAddress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    crypto_type: str
    address: str
    label: Optional[str] = None

class ContactCreate(BaseModel):
    name: str
    notes: Optional[str] = None
    profile_picture: Optional[str] = None  # base64
    crypto_addresses: List[CryptoAddress] = []
    is_favorite: bool = False
    group_ids: List[str] = []  # NEW: Groups this contact belongs to

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    profile_picture: Optional[str] = None
    crypto_addresses: Optional[List[CryptoAddress]] = None
    is_favorite: Optional[bool] = None
    group_ids: Optional[List[str]] = None  # NEW: Update group membership

class ContactResponse(BaseModel):
    id: str
    user_id: str
    name: str
    notes: Optional[str]
    profile_picture: Optional[str]
    crypto_addresses: List[CryptoAddress]
    is_favorite: bool
    group_ids: List[str] = []  # NEW
    created_at: datetime
    updated_at: datetime

class CustomCryptoCreate(BaseModel):
    name: str
    symbol: str
    address_regex: Optional[str] = None

class CustomCryptoResponse(BaseModel):
    id: str
    user_id: str
    name: str
    symbol: str
    address_regex: Optional[str]
    created_at: datetime

# ========================
# NEW: Group Models
# ========================

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None  # base64

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None

class GroupResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    image: Optional[str]
    contact_count: int = 0
    created_at: datetime
    updated_at: datetime

# ========================
# NEW: Merge Model
# ========================

class MergeContactsRequest(BaseModel):
    primary_contact_id: str
    source_contact_ids: List[str]  # Contacts to merge INTO primary
    delete_source_contacts: bool = True  # Whether to delete source contacts after merge

# ========================
# Pre-configured Cryptos with validation patterns
# ========================
DEFAULT_CRYPTOS = [
    {"name": "Bitcoin", "symbol": "BTC", "address_regex": r"^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{39,59}$"},
    {"name": "Ethereum", "symbol": "ETH", "address_regex": r"^0x[a-fA-F0-9]{40}$"},
    {"name": "USDT (ERC-20)", "symbol": "USDT", "address_regex": r"^0x[a-fA-F0-9]{40}$"},
    {"name": "Solana", "symbol": "SOL", "address_regex": r"^[1-9A-HJ-NP-Za-km-z]{32,44}$"},
    {"name": "BNB Smart Chain", "symbol": "BNB", "address_regex": r"^0x[a-fA-F0-9]{40}$"},
    {"name": "Polygon", "symbol": "MATIC", "address_regex": r"^0x[a-fA-F0-9]{40}$"},
    {"name": "Avalanche", "symbol": "AVAX", "address_regex": r"^0x[a-fA-F0-9]{40}$"},
    {"name": "Arbitrum", "symbol": "ARB", "address_regex": r"^0x[a-fA-F0-9]{40}$"},
    {"name": "Optimism", "symbol": "OP", "address_regex": r"^0x[a-fA-F0-9]{40}$"},
    {"name": "Tron", "symbol": "TRX", "address_regex": r"^T[a-zA-HJ-NP-Z0-9]{33}$"},
]

# ========================
# Helper Functions
# ========================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return user

def validate_crypto_address(address: str, crypto_symbol: str, custom_cryptos: list = []) -> bool:
    """Validate a crypto address against its expected format"""
    all_cryptos = DEFAULT_CRYPTOS + custom_cryptos
    crypto = next((c for c in all_cryptos if c["symbol"].upper() == crypto_symbol.upper()), None)
    
    if not crypto or not crypto.get("address_regex"):
        return True
    
    try:
        pattern = crypto["address_regex"]
        return bool(re.match(pattern, address))
    except re.error:
        return True

# ========================
# Auth Routes
# ========================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "email": user_data.email.lower(),
        "name": user_data.name,
        "password_hash": get_password_hash(user_data.password),
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token({"sub": user_id})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            email=user_dict["email"],
            name=user_dict["name"],
            created_at=user_dict["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token({"sub": user["id"]})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"]
    )

# ========================
# Contact Routes (Enhanced with sorting/filtering)
# ========================

@api_router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(
    search: Optional[str] = None,
    crypto_type: Optional[str] = None,
    favorites_only: bool = False,
    group_id: Optional[str] = None,  # NEW: Filter by group
    sort_by: Optional[Literal["name_asc", "name_desc", "updated_desc", "updated_asc", "created_desc", "created_asc"]] = "name_asc",
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    
    if favorites_only:
        query["is_favorite"] = True
    
    if group_id:
        query["group_ids"] = group_id
    
    # Determine sort order
    sort_field = "name"
    sort_order = 1  # Ascending
    
    if sort_by == "name_asc":
        sort_field, sort_order = "name", 1
    elif sort_by == "name_desc":
        sort_field, sort_order = "name", -1
    elif sort_by == "updated_desc":
        sort_field, sort_order = "updated_at", -1
    elif sort_by == "updated_asc":
        sort_field, sort_order = "updated_at", 1
    elif sort_by == "created_desc":
        sort_field, sort_order = "created_at", -1
    elif sort_by == "created_asc":
        sort_field, sort_order = "created_at", 1
    
    contacts = await db.contacts.find(query).sort(sort_field, sort_order).to_list(1000)
    
    # Apply filters
    results = []
    for contact in contacts:
        # Ensure group_ids exists
        if "group_ids" not in contact:
            contact["group_ids"] = []
        
        # Search filter
        if search:
            search_lower = search.lower()
            name_match = search_lower in contact["name"].lower()
            address_match = any(
                search_lower in addr.get("address", "").lower() or
                search_lower in addr.get("crypto_type", "").lower() or
                search_lower in (addr.get("label", "") or "").lower()
                for addr in contact.get("crypto_addresses", [])
            )
            notes_match = search_lower in (contact.get("notes", "") or "").lower()
            if not name_match and not address_match and not notes_match:
                continue
        
        # Crypto type filter
        if crypto_type:
            has_crypto = any(
                addr.get("crypto_type", "").upper() == crypto_type.upper()
                for addr in contact.get("crypto_addresses", [])
            )
            if not has_crypto:
                continue
        
        results.append(ContactResponse(**contact))
    
    return results

@api_router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    contact = await db.contacts.find_one({"id": contact_id, "user_id": current_user["id"]})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if "group_ids" not in contact:
        contact["group_ids"] = []
    return ContactResponse(**contact)

@api_router.post("/contacts", response_model=ContactResponse)
async def create_contact(contact_data: ContactCreate, current_user: dict = Depends(get_current_user)):
    custom_cryptos = await db.custom_cryptos.find({"user_id": current_user["id"]}).to_list(100)
    custom_crypto_list = [{"symbol": c["symbol"], "address_regex": c.get("address_regex")} for c in custom_cryptos]
    
    for addr in contact_data.crypto_addresses:
        if not validate_crypto_address(addr.address, addr.crypto_type, custom_crypto_list):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid {addr.crypto_type} address format: {addr.address}"
            )
    
    contact_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    contact_dict = {
        "id": contact_id,
        "user_id": current_user["id"],
        "name": contact_data.name,
        "notes": contact_data.notes,
        "profile_picture": contact_data.profile_picture,
        "crypto_addresses": [addr.dict() for addr in contact_data.crypto_addresses],
        "is_favorite": contact_data.is_favorite,
        "group_ids": contact_data.group_ids,
        "created_at": now,
        "updated_at": now
    }
    
    await db.contacts.insert_one(contact_dict)
    return ContactResponse(**contact_dict)

@api_router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    contact_data: ContactUpdate,
    current_user: dict = Depends(get_current_user)
):
    contact = await db.contacts.find_one({"id": contact_id, "user_id": current_user["id"]})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_dict = {"updated_at": datetime.utcnow()}
    
    if contact_data.name is not None:
        update_dict["name"] = contact_data.name
    if contact_data.notes is not None:
        update_dict["notes"] = contact_data.notes
    if contact_data.profile_picture is not None:
        update_dict["profile_picture"] = contact_data.profile_picture
    if contact_data.is_favorite is not None:
        update_dict["is_favorite"] = contact_data.is_favorite
    if contact_data.group_ids is not None:
        update_dict["group_ids"] = contact_data.group_ids
    if contact_data.crypto_addresses is not None:
        custom_cryptos = await db.custom_cryptos.find({"user_id": current_user["id"]}).to_list(100)
        custom_crypto_list = [{"symbol": c["symbol"], "address_regex": c.get("address_regex")} for c in custom_cryptos]
        
        for addr in contact_data.crypto_addresses:
            if not validate_crypto_address(addr.address, addr.crypto_type, custom_crypto_list):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid {addr.crypto_type} address format: {addr.address}"
                )
        update_dict["crypto_addresses"] = [addr.dict() for addr in contact_data.crypto_addresses]
    
    await db.contacts.update_one({"id": contact_id}, {"$set": update_dict})
    
    updated_contact = await db.contacts.find_one({"id": contact_id})
    if "group_ids" not in updated_contact:
        updated_contact["group_ids"] = []
    return ContactResponse(**updated_contact)

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.contacts.delete_one({"id": contact_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted successfully"}

@api_router.put("/contacts/{contact_id}/favorite", response_model=ContactResponse)
async def toggle_favorite(contact_id: str, current_user: dict = Depends(get_current_user)):
    contact = await db.contacts.find_one({"id": contact_id, "user_id": current_user["id"]})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    new_favorite_status = not contact.get("is_favorite", False)
    await db.contacts.update_one(
        {"id": contact_id},
        {"$set": {"is_favorite": new_favorite_status, "updated_at": datetime.utcnow()}}
    )
    
    updated_contact = await db.contacts.find_one({"id": contact_id})
    if "group_ids" not in updated_contact:
        updated_contact["group_ids"] = []
    return ContactResponse(**updated_contact)

# ========================
# NEW: Merge Contacts Route
# ========================

@api_router.post("/contacts/merge", response_model=ContactResponse)
async def merge_contacts(
    merge_data: MergeContactsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Merge wallet addresses from multiple contacts into a primary contact.
    Preserves all labels, notes, and metadata from source contacts.
    """
    # Validate primary contact exists
    primary = await db.contacts.find_one({
        "id": merge_data.primary_contact_id,
        "user_id": current_user["id"]
    })
    if not primary:
        raise HTTPException(status_code=404, detail="Primary contact not found")
    
    # Validate all source contacts exist
    source_contacts = []
    for source_id in merge_data.source_contact_ids:
        if source_id == merge_data.primary_contact_id:
            continue  # Skip if same as primary
        source = await db.contacts.find_one({
            "id": source_id,
            "user_id": current_user["id"]
        })
        if not source:
            raise HTTPException(status_code=404, detail=f"Source contact {source_id} not found")
        source_contacts.append(source)
    
    if not source_contacts:
        raise HTTPException(status_code=400, detail="No valid source contacts to merge")
    
    # Collect all addresses from source contacts
    merged_addresses = list(primary.get("crypto_addresses", []))
    existing_address_keys = set(
        f"{addr['crypto_type']}:{addr['address']}" 
        for addr in merged_addresses
    )
    
    # Merge notes
    merged_notes_parts = [primary.get("notes", "") or ""]
    
    # Merge group_ids
    merged_group_ids = set(primary.get("group_ids", []))
    
    for source in source_contacts:
        # Add addresses that don't already exist
        for addr in source.get("crypto_addresses", []):
            key = f"{addr['crypto_type']}:{addr['address']}"
            if key not in existing_address_keys:
                # Create new address entry with new ID
                new_addr = {
                    "id": str(uuid.uuid4()),
                    "crypto_type": addr["crypto_type"],
                    "address": addr["address"],
                    "label": addr.get("label") or f"From {source['name']}"
                }
                merged_addresses.append(new_addr)
                existing_address_keys.add(key)
        
        # Merge notes
        if source.get("notes"):
            merged_notes_parts.append(f"[From {source['name']}]: {source['notes']}")
        
        # Merge group IDs
        for gid in source.get("group_ids", []):
            merged_group_ids.add(gid)
    
    # Update primary contact
    merged_notes = "\n".join(filter(None, merged_notes_parts))
    
    await db.contacts.update_one(
        {"id": merge_data.primary_contact_id},
        {"$set": {
            "crypto_addresses": merged_addresses,
            "notes": merged_notes if merged_notes else None,
            "group_ids": list(merged_group_ids),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Delete source contacts if requested
    if merge_data.delete_source_contacts:
        for source in source_contacts:
            await db.contacts.delete_one({"id": source["id"]})
    
    # Return updated primary contact
    updated_primary = await db.contacts.find_one({"id": merge_data.primary_contact_id})
    if "group_ids" not in updated_primary:
        updated_primary["group_ids"] = []
    return ContactResponse(**updated_primary)

# ========================
# NEW: Group Routes
# ========================

@api_router.get("/groups", response_model=List[GroupResponse])
async def get_groups(current_user: dict = Depends(get_current_user)):
    """Get all groups for the current user with contact counts using aggregation"""
    # Use aggregation pipeline to get contact counts in a single query
    pipeline = [
        {"$match": {"user_id": current_user["id"]}},
        {"$lookup": {
            "from": "contacts",
            "let": {"group_id": "$id"},
            "pipeline": [
                {"$match": {
                    "$expr": {
                        "$and": [
                            {"$eq": ["$user_id", current_user["id"]]},
                            {"$in": ["$$group_id", {"$ifNull": ["$group_ids", []]}]}
                        ]
                    }
                }}
            ],
            "as": "matched_contacts"
        }},
        {"$addFields": {"contact_count": {"$size": "$matched_contacts"}}},
        {"$project": {"matched_contacts": 0}},
        {"$sort": {"name": 1}}
    ]
    
    groups = await db.groups.aggregate(pipeline).to_list(100)
    return [GroupResponse(**group) for group in groups]

@api_router.get("/groups/{group_id}", response_model=GroupResponse)
async def get_group(group_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single group with contact count using aggregation"""
    pipeline = [
        {"$match": {"id": group_id, "user_id": current_user["id"]}},
        {"$lookup": {
            "from": "contacts",
            "let": {"group_id": "$id"},
            "pipeline": [
                {"$match": {
                    "$expr": {
                        "$and": [
                            {"$eq": ["$user_id", current_user["id"]]},
                            {"$in": ["$$group_id", {"$ifNull": ["$group_ids", []]}]}
                        ]
                    }
                }}
            ],
            "as": "matched_contacts"
        }},
        {"$addFields": {"contact_count": {"$size": "$matched_contacts"}}},
        {"$project": {"matched_contacts": 0}}
    ]
    
    groups = await db.groups.aggregate(pipeline).to_list(1)
    if not groups:
        raise HTTPException(status_code=404, detail="Group not found")
    
    return GroupResponse(**groups[0])

@api_router.post("/groups", response_model=GroupResponse)
async def create_group(group_data: GroupCreate, current_user: dict = Depends(get_current_user)):
    group_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    group_dict = {
        "id": group_id,
        "user_id": current_user["id"],
        "name": group_data.name,
        "description": group_data.description,
        "image": group_data.image,
        "created_at": now,
        "updated_at": now
    }
    
    await db.groups.insert_one(group_dict)
    group_dict["contact_count"] = 0
    return GroupResponse(**group_dict)

@api_router.put("/groups/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: str,
    group_data: GroupUpdate,
    current_user: dict = Depends(get_current_user)
):
    group = await db.groups.find_one({"id": group_id, "user_id": current_user["id"]})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    update_dict = {"updated_at": datetime.utcnow()}
    
    if group_data.name is not None:
        update_dict["name"] = group_data.name
    if group_data.description is not None:
        update_dict["description"] = group_data.description
    if group_data.image is not None:
        update_dict["image"] = group_data.image
    
    await db.groups.update_one({"id": group_id}, {"$set": update_dict})
    
    updated_group = await db.groups.find_one({"id": group_id})
    contact_count = await db.contacts.count_documents({
        "user_id": current_user["id"],
        "group_ids": group_id
    })
    updated_group["contact_count"] = contact_count
    return GroupResponse(**updated_group)

@api_router.delete("/groups/{group_id}")
async def delete_group(group_id: str, current_user: dict = Depends(get_current_user)):
    group = await db.groups.find_one({"id": group_id, "user_id": current_user["id"]})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Remove group from all contacts
    await db.contacts.update_many(
        {"user_id": current_user["id"], "group_ids": group_id},
        {"$pull": {"group_ids": group_id}}
    )
    
    # Delete the group
    await db.groups.delete_one({"id": group_id})
    return {"message": "Group deleted successfully"}

@api_router.post("/groups/{group_id}/contacts/{contact_id}")
async def add_contact_to_group(
    group_id: str,
    contact_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Add a contact to a group"""
    group = await db.groups.find_one({"id": group_id, "user_id": current_user["id"]})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    contact = await db.contacts.find_one({"id": contact_id, "user_id": current_user["id"]})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Add group to contact if not already present
    if group_id not in contact.get("group_ids", []):
        await db.contacts.update_one(
            {"id": contact_id},
            {"$addToSet": {"group_ids": group_id}, "$set": {"updated_at": datetime.utcnow()}}
        )
    
    return {"message": "Contact added to group"}

@api_router.delete("/groups/{group_id}/contacts/{contact_id}")
async def remove_contact_from_group(
    group_id: str,
    contact_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a contact from a group"""
    group = await db.groups.find_one({"id": group_id, "user_id": current_user["id"]})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    contact = await db.contacts.find_one({"id": contact_id, "user_id": current_user["id"]})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    await db.contacts.update_one(
        {"id": contact_id},
        {"$pull": {"group_ids": group_id}, "$set": {"updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Contact removed from group"}

# ========================
# Custom Crypto Routes
# ========================

@api_router.get("/cryptos", response_model=dict)
async def get_cryptos(current_user: dict = Depends(get_current_user)):
    custom_cryptos = await db.custom_cryptos.find({"user_id": current_user["id"]}).to_list(100)
    return {
        "default_cryptos": DEFAULT_CRYPTOS,
        "custom_cryptos": [CustomCryptoResponse(**c) for c in custom_cryptos]
    }

@api_router.post("/cryptos", response_model=CustomCryptoResponse)
async def create_custom_crypto(crypto_data: CustomCryptoCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.custom_cryptos.find_one({
        "user_id": current_user["id"],
        "symbol": crypto_data.symbol.upper()
    })
    if existing:
        raise HTTPException(status_code=400, detail="Crypto with this symbol already exists")
    
    for default in DEFAULT_CRYPTOS:
        if default["symbol"].upper() == crypto_data.symbol.upper():
            raise HTTPException(status_code=400, detail="Cannot override default cryptocurrency")
    
    crypto_id = str(uuid.uuid4())
    crypto_dict = {
        "id": crypto_id,
        "user_id": current_user["id"],
        "name": crypto_data.name,
        "symbol": crypto_data.symbol.upper(),
        "address_regex": crypto_data.address_regex,
        "created_at": datetime.utcnow()
    }
    
    await db.custom_cryptos.insert_one(crypto_dict)
    return CustomCryptoResponse(**crypto_dict)

@api_router.delete("/cryptos/{crypto_id}")
async def delete_custom_crypto(crypto_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.custom_cryptos.delete_one({"id": crypto_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Custom crypto not found")
    return {"message": "Custom crypto deleted successfully"}

# ========================
# Export Routes
# ========================

@api_router.get("/export/json")
async def export_json(current_user: dict = Depends(get_current_user)):
    contacts = await db.contacts.find({"user_id": current_user["id"]}).to_list(1000)
    groups = await db.groups.find({"user_id": current_user["id"]}).to_list(100)
    
    export_data = []
    for contact in contacts:
        export_data.append({
            "name": contact["name"],
            "notes": contact.get("notes"),
            "is_favorite": contact.get("is_favorite", False),
            "crypto_addresses": contact.get("crypto_addresses", []),
            "group_ids": contact.get("group_ids", [])
        })
    
    groups_data = [{"id": g["id"], "name": g["name"], "description": g.get("description")} for g in groups]
    
    return {
        "contacts": export_data,
        "groups": groups_data,
        "exported_at": datetime.utcnow().isoformat()
    }

@api_router.get("/export/csv")
async def export_csv(current_user: dict = Depends(get_current_user)):
    contacts = await db.contacts.find({"user_id": current_user["id"]}).to_list(1000)
    
    csv_lines = ["Name,Crypto Type,Address,Label,Notes,Is Favorite,Groups"]
    
    for contact in contacts:
        groups_str = ";".join(contact.get("group_ids", []))
        for addr in contact.get("crypto_addresses", []):
            line = f'"{contact["name"]}","{addr.get("crypto_type", "")}","{addr.get("address", "")}","{addr.get("label", "")}","{contact.get("notes", "")}","{contact.get("is_favorite", False)}","{groups_str}"'
            csv_lines.append(line)
        
        if not contact.get("crypto_addresses"):
            line = f'"{contact["name"]}","","","","{contact.get("notes", "")}","{contact.get("is_favorite", False)}","{groups_str}"'
            csv_lines.append(line)
    
    return {"csv_content": "\n".join(csv_lines), "exported_at": datetime.utcnow().isoformat()}

# ========================
# Validation Route
# ========================

@api_router.post("/validate-address")
async def validate_address(
    crypto_type: str,
    address: str,
    current_user: dict = Depends(get_current_user)
):
    custom_cryptos = await db.custom_cryptos.find({"user_id": current_user["id"]}).to_list(100)
    custom_crypto_list = [{"symbol": c["symbol"], "address_regex": c.get("address_regex")} for c in custom_cryptos]
    
    is_valid = validate_crypto_address(address, crypto_type, custom_crypto_list)
    return {"is_valid": is_valid, "crypto_type": crypto_type, "address": address}

# ========================
# Health Check
# ========================

@api_router.get("/")
async def root():
    return {"message": "CrypTags API is running", "version": "2.1.1"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
