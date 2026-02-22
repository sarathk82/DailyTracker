#!/bin/bash

# Firebase Security Rules Deployment Script
# This script deploys updated security rules to Firebase

set -e

echo "🔐 Firebase Security Rules Deployment"
echo "======================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo "   Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"
echo ""

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase"
    echo "   Run: firebase login"
    exit 1
fi

echo "✅ Logged in to Firebase"
echo ""

# Confirm deployment
echo "📋 Rules to deploy:"
echo "   • Firestore Rules (firestore.rules)"
echo "   • Realtime Database Rules (database.rules.json)"
echo ""

read -p "Deploy rules to Firebase? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "🚀 Deploying rules..."
echo ""

# Deploy Firestore rules
echo "📤 Deploying Firestore rules..."
if firebase deploy --only firestore:rules; then
    echo "✅ Firestore rules deployed"
else
    echo "❌ Failed to deploy Firestore rules"
    exit 1
fi

echo ""

# Deploy Realtime Database rules
echo "📤 Deploying Realtime Database rules..."
if firebase deploy --only database:rules; then
    echo "✅ Realtime Database rules deployed"
else
    echo "❌ Failed to deploy Realtime Database rules"
    exit 1
fi

echo ""
echo "✅ All rules deployed successfully!"
echo ""
echo "🔍 Next steps:"
echo "   1. Verify rules in Firebase Console:"
echo "      https://console.firebase.google.com/"
echo "   2. Check for any security warnings"
echo "   3. Test the app to ensure everything works"
echo ""
echo "📖 For more information, see FIREBASE_RULES.md"
