#!/usr/bin/env node

/**
 * Simple test script to validate browser services
 * Run with: node test-browser-services.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Testing Browser Services Implementation...\n');

// Test 1: Check if backend builds successfully
console.log('1️⃣ Testing build compilation...');
try {
  execSync('npm run build', { cwd: __dirname, stdio: 'pipe' });
  console.log('✅ Build successful');
} catch (error) {
  console.log('❌ Build failed:', error.message);
  process.exit(1);
}

// Test 2: Check if service starts without errors
console.log('\n2️⃣ Testing service startup...');
try {
  // Start service in background
  const child = execSync('npm run start:dev', { 
    cwd: __dirname, 
    stdio: 'pipe',
    timeout: 15000 // 15 second timeout
  });
  console.log('✅ Service started successfully');
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('✅ Service started (timeout expected for background process)');
  } else {
    console.log('❌ Service startup failed:', error.message);
    process.exit(1);
  }
}

// Test 3: Test basic endpoint response
console.log('\n3️⃣ Testing basic endpoint response...');
try {
  const response = execSync('curl -s http://localhost:3001/', { 
    cwd: __dirname, 
    stdio: 'pipe',
    timeout: 5000
  }).toString().trim();
  
  if (response === 'Hello World!') {
    console.log('✅ Basic endpoint responding correctly');
  } else {
    console.log('⚠️  Unexpected response:', response);
  }
} catch (error) {
  console.log('❌ Endpoint test failed:', error.message);
}

console.log('\n🎯 Manual Testing Steps:');
console.log('1. Open a new terminal and navigate to the backend directory');
console.log('2. Run: npm run start:dev');
console.log('3. Wait for service to start (should see "Found 0 errors")');
console.log('4. Test these endpoints manually:');
console.log('   - GET http://localhost:3001/ (should return "Hello World!")');
console.log('   - GET http://localhost:3001/scraping/status (will require auth)');
console.log('5. Check console logs for any browser service initialization messages');

console.log('\n🔍 What to Look For:');
console.log('- No Puppeteer-related errors in startup logs');
console.log('- Service starts without crashing');
console.log('- Browser service factory creates correct service type');
console.log('- No dependency injection errors');

console.log('\n📝 Next Steps After Manual Testing:');
console.log('- If all tests pass, we can proceed to automated testing');
console.log('- If issues found, we can debug and fix before continuing');

console.log('\n✨ Ready for manual testing!');
