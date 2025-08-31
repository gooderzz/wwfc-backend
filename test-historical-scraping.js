const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';
const ADMIN_EMAIL = 'scraper@admin.com';
const ADMIN_PASSWORD = 'scraper123';

let authToken = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    authToken = response.data.access_token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testHistoricalScraping() {
  try {
    console.log('🧪 Testing historical scraping for 2016-17 season...');
    
    // Test scraping the 2016-17 season (which only has 1 division)
    const response = await axios.post(`${API_BASE_URL}/scraping/scrape-table`, {
      divisionId: '112318160', // Supreme Trophies Graham Dodd Premier
      seasonId: '408332512',   // 2016-17 season
      leagueId: '3545957'      // Southern Sunday Football League
    }, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Scraping response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Scraping failed:', error.response?.data || error.message);
    return null;
  }
}

async function runTest() {
  if (!await login()) {
    return;
  }
  
  await testHistoricalScraping();
}

runTest();
