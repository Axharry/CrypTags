# CrypTags - Offline Crypto Address Book

**Version 2.0.0 - Privacy-First, Fully Offline**

CrypTags is a privacy-focused mobile application for managing cryptocurrency addresses and contacts, designed to work 100% offline without requiring any backend server or user authentication.

## 🔒 Privacy & Security Features

- **100% Offline**: All data stored locally on your device
- **No Login Required**: Instant access without creating an account
- **No Backend**: Zero server dependencies or cloud connections
- **Local Storage**: Secure on-device data storage using AsyncStorage and SecureStore
- **Optional Encryption**: Sensitive data can be encrypted locally

## ✨ Features

### Contact Management
- ✅ Create and manage crypto contacts
- ✅ Multiple wallet addresses per contact (BTC, ETH, SOL, USDT, and more)
- ✅ Add custom cryptocurrencies
- ✅ Profile pictures (base64 storage)
- ✅ Notes and labels
- ✅ Favorites system

### Organization
- ✅ Group contacts into categories
- ✅ Advanced search and filtering
- ✅ Sort by name, date created, date updated
- ✅ Filter by cryptocurrency type

### Advanced Features
- ✅ QR Code generation for addresses
- ✅ QR Code scanning (camera permission required)
- ✅ Merge duplicate contacts
- ✅ Export data (JSON/CSV format)
- ✅ Address validation for major cryptocurrencies
- ✅ Dark mode support

## 📱 Supported Cryptocurrencies (Default)

1. Bitcoin (BTC)
2. Ethereum (ETH)
3. USDT (ERC-20)
4. Solana (SOL)
5. BNB Smart Chain
6. Polygon (MATIC)
7. Avalanche (AVAX)
8. Arbitrum (ARB)
9. Optimism (OP)
10. Tron (TRX)

**Plus**: Add your own custom cryptocurrencies!

## 🏗️ Architecture

### Local Storage Layer
The app uses a custom local storage service (`localStorage.ts`) that provides:
- Contact CRUD operations
- Group management
- Custom cryptocurrency storage
- Data export functionality
- All operations are synchronous to the device

### Data Structure
```typescript
Contact {
  id: string
  name: string
  notes?: string
  profile_picture?: string (base64)
  crypto_addresses: CryptoAddress[]
  is_favorite: boolean
  group_ids: string[]
  created_at: string
  updated_at: string
}

CryptoAddress {
  id: string
  crypto_type: string
  address: string
  label?: string
}

Group {
  id: string
  name: string
  description?: string
  image?: string (base64)
  contact_count: number
  created_at: string
  updated_at: string
}
```

## 🚀 Running the App

### Development
```bash
cd /app/frontend
yarn install
yarn start
```

### Expo Go (Mobile Testing)
1. Install Expo Go from App Store / Play Store
2. Scan the QR code from the terminal
3. App will load on your device

### Web Preview
Access the web version at your preview URL

## 📦 Tech Stack

- **Framework**: React Native + Expo
- **Routing**: Expo Router (file-based)
- **State Management**: Zustand
- **Local Storage**: AsyncStorage + SecureStore
- **UI Components**: Custom components with Ionicons
- **QR Codes**: react-native-qrcode-svg
- **Camera**: expo-camera
- **Image Handling**: Base64 encoding

## 🔧 Configuration

### Required Permissions (Mobile)
- **Camera**: For QR code scanning
- **Photos**: For profile picture uploads

These permissions are requested at runtime when needed.

## 💾 Data Management

### Export Data
Export your contacts in two formats:
- **JSON**: Full backup including all metadata
- **CSV**: Spreadsheet-compatible format

### Clear All Data
Option available in Settings to completely wipe all local data.

**Warning**: This action is irreversible!

## 🎨 Theme Support

Three theme modes available:
- **Light Mode**
- **Dark Mode** 
- **System** (follows device settings)

## 🔐 Security Considerations

1. **Local Data Only**: All data remains on your device
2. **No Cloud Sync**: Data is never transmitted to external servers
3. **Backup Responsibility**: Users must manually export/backup their data
4. **Device Security**: App security relies on device-level protection

## 📝 Version History

### v2.0.0 (Offline) - March 2026
- ✨ Complete refactoring to offline-first architecture
- ❌ Removed all backend dependencies
- ❌ Removed authentication system
- ✅ Local storage implementation
- ✅ Privacy-first design

### v1.0.0 - February 2026
- Initial release with backend API
- JWT authentication
- Cloud-based data storage

## 🛠️ Development Notes

### File Structure
```
/app/frontend/
├── app/                  # Expo Router screens
│   ├── (tabs)/          # Tab navigation screens
│   ├── contact/         # Contact management
│   └── group/           # Group management
├── services/
│   └── localStorage.ts  # Local storage service
├── stores/             # Zustand state management
├── components/         # Reusable UI components
└── types/              # TypeScript type definitions
```

### Key Files
- `services/localStorage.ts`: All local CRUD operations
- `types/index.ts`: TypeScript interfaces
- `app/index.tsx`: Entry point (redirects to main app)
- `app/_layout.tsx`: Root layout (theme setup)

## 📄 License

MIT License - Feel free to use and modify

## 👨‍💻 Developer

Xolaria Corporation
Email: xolariacorporation@gmail.com

---

**Built with ❤️ for crypto users who value privacy**
