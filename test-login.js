const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

const testCredentials = [
  { email: 'admin@admin.admin', password: 'admin' },
  { email: 'admin@admin.admin', password: 'password' },
  { email: 'admin@admin.admin', password: '123456' },
  { email: 'test@test.com', password: 'test' },
  { email: 'test@test.com', password: 'password' },
  { email: 'test@test.com', password: '123456' },
  { email: 'test@example.com', password: 'test' },
  { email: 'test@example.com', password: 'password' },
  { email: 'test@example.com', password: '123456' },
];

async function testLogin(credentials) {
  try {
    console.log(`Testing: ${credentials.email} / ${credentials.password}`);
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    console.log(`✅ SUCCESS: ${credentials.email} / ${credentials.password}`);
    console.log(`Token: ${response.data.access_token.substring(0, 50)}...`);
    return response.data.access_token;
  } catch (error) {
    console.log(`❌ FAILED: ${credentials.email} / ${credentials.password}`);
    return null;
  }
}

async function testAllCredentials() {
  console.log('🔐 Testing all possible admin credentials...\n');
  
  for (const cred of testCredentials) {
    const token = await testLogin(cred);
    if (token) {
      console.log(`\n🎉 Found working credentials: ${cred.email} / ${cred.password}`);
      return { email: cred.email, password: cred.password, token };
    }
  }
  
  console.log('\n❌ No working credentials found');
  return null;
}

testAllCredentials();
