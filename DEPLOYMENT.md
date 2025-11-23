# Deployment Guide

This guide explains how to deploy the POS Checkout MVP to Firebase and push changes to Git.

## Prerequisites

1. **Git** installed and configured
2. **Node.js** >= 20.0.0 and **npm** >= 10.0.0
3. **Firebase CLI** installed (`npm install -g firebase-tools`)
4. **Firebase project** created and configured
5. **Firebase authentication** completed (`firebase login`)

## Quick Deployment

### Option 1: Using the deployment script (Recommended)

**Windows (PowerShell):**
```powershell
.\deploy.ps1
```

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Manual deployment

#### Step 1: Git Operations

```bash
# Add all changes
git add .

# Check status
git status

# Commit changes
git commit -m "feat: complete implementation with offline sync, print proxy, and CI/CD"

# Push to remote
git push
```

#### Step 2: Build Functions

```bash
npm run build:functions
```

This command:
- Builds shared packages
- Builds payment adapters
- Builds backend
- Copies backend dist to functions
- Builds Firebase functions

#### Step 3: Deploy to Firebase

**Deploy Functions:**
```bash
npm run deploy:functions
```

**Deploy Hosting (Frontend):**
```bash
npm run deploy:web
```

Or deploy both at once:
```bash
firebase deploy
```

## Firebase Configuration

### Initial Setup

1. **Login to Firebase:**
   ```bash
   firebase login
   ```

2. **Initialize Firebase project:**
   ```bash
   firebase init
   ```
   - Select Functions and Hosting
   - Choose your Firebase project
   - Use default settings

3. **Configure Firebase project ID:**
   Update `.firebaserc` with your project ID:
   ```json
   {
     "projects": {
       "default": "your-project-id"
     }
   }
   ```

### Environment Variables

Before deploying functions, set up Firebase secrets:

```bash
# Required secrets
firebase functions:secrets:set DATABASE_URL
firebase functions:secrets:set JWT_SECRET
firebase functions:secrets:set JWT_REFRESH_SECRET

# Optional secrets
firebase functions:secrets:set FIREBASE_PROJECT_ID
firebase functions:secrets:set FIREBASE_CLIENT_EMAIL
firebase functions:secrets:set FIREBASE_PRIVATE_KEY
```

### Firestore Indexes

Deploy Firestore indexes:
```bash
firebase deploy --only firestore:indexes
```

## Deployment Checklist

Before deploying, ensure:

- [ ] All tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Environment variables are configured
- [ ] Firebase project is set up
- [ ] Firestore indexes are created
- [ ] Service account credentials are configured (if using cloud Firestore)

## Post-Deployment

1. **Verify Functions:**
   - Check Firebase Console → Functions
   - Test API endpoints

2. **Verify Hosting:**
   - Check Firebase Console → Hosting
   - Visit the deployed URL

3. **Update Frontend API URL:**
   - Update `VITE_API_URL` in frontend `.env` or build config
   - Or update `apps/frontend/src/config.ts` with production URL

## Troubleshooting

### Functions deployment fails

- Check Firebase CLI version: `firebase --version`
- Verify Node.js version matches runtime (nodejs20)
- Check function logs: `firebase functions:log`

### Hosting deployment fails

- Ensure frontend build succeeds: `npm run build --workspace=apps/frontend`
- Check `firebase.json` configuration
- Verify `apps/frontend/dist` directory exists

### Git push fails

- Check authentication: `git config --list`
- Verify remote URL: `git remote -v`
- Check branch permissions

## CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) automatically:
- Runs tests on push/PR
- Builds Docker images
- Validates code quality

For automatic deployment, add a deployment workflow or use Firebase GitHub Actions.

## Rollback

If deployment fails:

1. **Rollback Functions:**
   ```bash
   firebase functions:rollback
   ```

2. **Rollback Hosting:**
   - Use Firebase Console → Hosting → Releases
   - Click "Rollback" on previous release

3. **Git Rollback:**
   ```bash
   git revert HEAD
   git push
   ```

