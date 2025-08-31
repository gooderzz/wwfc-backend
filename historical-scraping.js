const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

// Configuration
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

async function discoverSeasons() {
  try {
    console.log('🔍 Discovering all available seasons...');
    const response = await axios.get(`${API_BASE_URL}/scraping/seasons`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const seasons = response.data.seasons || response.data;
    console.log(`✅ Found ${seasons.length} seasons:`);
    seasons.forEach(season => {
      console.log(`   - ${season.name} (ID: ${season.id}) ${season.isLive ? '[LIVE]' : ''}`);
    });
    
    return seasons;
  } catch (error) {
    console.error('❌ Failed to discover seasons:', error.response?.data || error.message);
    return [];
  }
}

async function discoverDivisionsForSeason(seasonId) {
  try {
    console.log(`🔍 Discovering divisions for season ${seasonId}...`);
    const response = await axios.get(`${API_BASE_URL}/scraping/divisions/${seasonId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const divisions = response.data.divisions || response.data;
    console.log(`✅ Found ${divisions.length} divisions for season ${seasonId}:`);
    divisions.forEach(division => {
      console.log(`   - ${division.name} (ID: ${division.id})`);
    });
    
    return divisions;
  } catch (error) {
    console.error(`❌ Failed to discover divisions for season ${seasonId}:`, error.response?.data || error.message);
    return [];
  }
}

async function scrapeDivision(divisionId, seasonId) {
  try {
    console.log(`📊 Scraping division ${divisionId} for season ${seasonId}...`);
    
    const response = await axios.post(`${API_BASE_URL}/scraping/scrape-table`, {
      divisionId,
      seasonId,
      leagueId: '3545957' // Southern Sunday Football League
    }, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = response.data;
    if (result.success) {
      console.log(`✅ Successfully scraped division ${divisionId} for season ${seasonId}`);
      console.log(`   - Teams found: ${result.databaseResult?.teamsCreated || 0} created, ${result.databaseResult?.teamsUpdated || 0} updated`);
      return true;
    } else {
      console.error(`❌ Failed to scrape division ${divisionId} for season ${seasonId}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error scraping division ${divisionId} for season ${seasonId}:`, error.response?.data || error.message);
    return false;
  }
}

async function getExistingData() {
  try {
    const existingSeasons = await prisma.scrapedTeam.groupBy({
      by: ['seasonId'],
      _count: { id: true }
    });
    
    const existingDivisions = await prisma.scrapedTeam.groupBy({
      by: ['seasonId', 'divisionId'],
      _count: { id: true }
    });
    
    console.log('📊 Existing data summary:');
    console.log(`   - Seasons with data: ${existingSeasons.length}`);
    existingSeasons.forEach(season => {
      console.log(`     * Season ${season.seasonId}: ${season._count.id} teams`);
    });
    
    return { existingSeasons, existingDivisions };
  } catch (error) {
    console.error('❌ Failed to get existing data:', error.message);
    return { existingSeasons: [], existingDivisions: [] };
  }
}

async function runHistoricalScraping() {
  try {
    console.log('🚀 Starting Historical Data Scraping');
    console.log('=====================================');
    
    // Login
    if (!await login()) {
      return;
    }
    
    // Get existing data summary
    await getExistingData();
    
    // Discover all seasons
    const seasons = await discoverSeasons();
    if (seasons.length === 0) {
      console.log('❌ No seasons found, exiting');
      return;
    }
    
    // Process each season
    let totalDivisions = 0;
    let totalScraped = 0;
    let totalErrors = 0;
    
    for (const season of seasons) {
      console.log(`\n📅 Processing season: ${season.name} (${season.id})`);
      console.log('----------------------------------------');
      
      // Discover divisions for this season
      const divisions = await discoverDivisionsForSeason(season.id);
      if (divisions.length === 0) {
        console.log(`⚠️  No divisions found for season ${season.name}, skipping`);
        continue;
      }
      
      totalDivisions += divisions.length;
      
      // Scrape each division
      for (const division of divisions) {
        console.log(`\n🏆 Scraping: ${division.name}`);
        
        const success = await scrapeDivision(division.id, season.id);
        if (success) {
          totalScraped++;
        } else {
          totalErrors++;
        }
        
        // Rate limiting - be nice to the server
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
      }
    }
    
    // Final summary
    console.log('\n🎉 Historical Scraping Complete!');
    console.log('================================');
    console.log(`📊 Summary:`);
    console.log(`   - Seasons processed: ${seasons.length}`);
    console.log(`   - Total divisions found: ${totalDivisions}`);
    console.log(`   - Successfully scraped: ${totalScraped}`);
    console.log(`   - Errors: ${totalErrors}`);
    
    // Show final data summary
    console.log('\n📈 Final Data Summary:');
    await getExistingData();
    
  } catch (error) {
    console.error('❌ Historical scraping failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
runHistoricalScraping();
