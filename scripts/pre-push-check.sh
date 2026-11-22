#!/bin/bash
# Local quality check script - run before pushing to save CI minutes
# Usage: ./scripts/pre-push-check.sh

echo "🔍 Running pre-push quality checks..."
echo ""

# TypeScript check
echo "1️⃣  TypeScript check..."
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ TypeScript check failed"
  exit 1
fi
echo "✅ TypeScript check passed"
echo ""

# ESLint
echo "2️⃣  ESLint check..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ ESLint check failed"
  exit 1
fi
echo "✅ ESLint check passed"
echo ""

# Unit tests
echo "3️⃣  Unit tests..."
npm run test
if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed"
  exit 1
fi
echo "✅ Unit tests passed"
echo ""

# Production build
echo "4️⃣  Production build..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Production build failed"
  exit 1
fi
echo "✅ Production build passed"
echo ""

echo "🎉 All quality checks passed! Safe to push."
echo ""
echo "To run CI manually on GitHub:"
echo "1. Go to: https://github.com/Micjeal/clinic-mvp/actions"
echo "2. Click 'CI' workflow"
echo "3. Click 'Run workflow'"
echo "4. Select branch and click 'Run workflow'"
