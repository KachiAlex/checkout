#!/bin/bash
# Deployment script for Firebase and Git

set -e

echo "🚀 Starting deployment process..."

# Step 1: Git operations
echo ""
echo "📦 Step 1: Committing and pushing to Git..."
git add .
git status

read -p "Enter commit message (or press Enter for default): " commit_msg
if [ -z "$commit_msg" ]; then
  commit_msg="feat: complete implementation with offline sync, print proxy, and CI/CD"
fi

git commit -m "$commit_msg"
git push

echo "✅ Git push completed!"

# Step 2: Build functions
echo ""
echo "🔨 Step 2: Building functions..."
npm run build:functions

# Step 3: Deploy to Firebase
echo ""
echo "🔥 Step 3: Deploying to Firebase..."

# Deploy functions
echo "Deploying Firebase Functions..."
npm run deploy:functions

# Deploy hosting
echo "Deploying Firebase Hosting..."
npm run deploy:web

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "  - Git: Changes pushed to repository"
echo "  - Firebase Functions: Deployed"
echo "  - Firebase Hosting: Deployed"

