# Secure Personal Vault

A zero-knowledge encrypted personal vault for storing credit card details and sensitive information. Built with Next.js, Firebase, and client-side encryption.

## 🔐 Security Features

- **Zero-knowledge encryption**: All sensitive data is encrypted client-side before storage
- **Argon2id key derivation**: Secure password-based key derivation with server pepper
- **AES-GCM encryption**: Strong symmetric encryption for data protection
- **Automatic clipboard clearing**: Copied values are cleared after 30 seconds
- **Firebase Security Rules**: Strict database access controls
- **Email allowlist**: Server-side user validation

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd secure-vault
npm install
```

### 2. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication and select Google as a sign-in provider
3. Create a Firestore database
4. Get your Firebase configuration from Project Settings

### 3. Environment Configuration

Update `.env.local` with your Firebase configuration:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Server Configuration
PEPPER=your_random_pepper_string_here
ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com
```

### 4. Deploy Firestore Security Rules

Deploy the security rules to your Firebase project:

```bash
firebase deploy --only firestore:rules
```

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🏗️ Architecture

### Client-Side Encryption Flow

1. **Key Derivation**: User passcode + server pepper → Argon2id → wrapping key
2. **Data Encryption**: Random DEK encrypts data with AES-GCM
3. **Key Wrapping**: Wrapping key encrypts DEK with AES-GCM
4. **Storage**: Only encrypted blob stored in Firestore

### Data Structure

**Cards Collection:**
- `cardName` (plaintext) - for display/search
- `encryptedBlob` (encrypted) - contains all sensitive card data
- `userId` - user identifier

**Other Collection:**
- `itemName` (plaintext) - for display/search
- `encryptedBlob` (encrypted) - contains all sensitive item data
- `userId` - user identifier

## 🚀 Deployment

### Vercel Deployment

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform:
- All Firebase configuration variables
- `PEPPER` - A strong random string for key derivation
- `ALLOWED_EMAILS` - Comma-separated list of allowed user emails

## 🔒 Security Considerations

1. **Passcode Security**: Use a strong, unique passcode for encryption
2. **Pepper Storage**: Keep the server pepper secure and backed up
3. **HTTPS Only**: Always use HTTPS in production
4. **Regular Backups**: Export encrypted data regularly
5. **Access Logs**: Monitor authentication and access patterns

## 🧪 Testing

The application includes comprehensive error handling and validation:
- Client-side encryption/decryption testing
- Firebase authentication flow
- Secure data storage and retrieval
- Rate limiting on pepper endpoint

## 📱 Features

### Cards Management
- Add/edit/view/delete credit cards
- Secure storage of card numbers, CVV, expiry dates
- Visual card display with custom backgrounds
- One-click copying with auto-clear

### Other Items Management
- Support for various item types (passport, license, etc.)
- Custom field definitions
- Secure storage of any sensitive information
- Organized display with type-specific icons

## 🤝 Contributing

This is a security-focused application. Please ensure all contributions maintain the zero-knowledge encryption model and follow security best practices.
