# Firebase Setup for SARM ENTERPRISES

## 1. Firebase Console Setup
1. Go to https://console.firebase.google.com/
2. Create a new project named "SARM ENTERPRISES"
3. Enable the following services:
   - Authentication (Email/Password sign-in)
   - Firestore Database
   - Storage (if you want to upload images)

## 2. Firestore Rules
Set these rules in Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{product} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /quotes/{quote} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
