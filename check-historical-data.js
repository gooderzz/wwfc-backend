const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHistoricalData() {
  try {
    console.log('📊 Checking Historical Data After Scraping');
    console.log('==========================================');
    
    // Check all scraped teams by season
    const teamsBySeason = await prisma.scrapedTeam.groupBy({
      by: ['seasonId'],
      _count: { id: true }
    });
    
    console.log(`\n📈 Teams by Season:`);
    teamsBySeason.forEach(season => {
      console.log(`   - Season ${season.seasonId}: ${season._count.id} teams`);
    });
    
    // Check all scraped teams by division
    const teamsByDivision = await prisma.scrapedTeam.groupBy({
      by: ['divisionId'],
      _count: { id: true }
    });
    
    console.log(`\n🏆 Teams by Division:`);
    teamsByDivision.forEach(division => {
      console.log(`   - Division ${division.divisionId}: ${division._count.id} teams`);
    });
    
    // Check league table entries
    const leagueTableEntries = await prisma.leagueTable.groupBy({
      by: ['seasonId'],
      _count: { id: true }
    });
    
    console.log(`\n📋 League Table Entries by Season:`);
    leagueTableEntries.forEach(season => {
      console.log(`   - Season ${season.seasonId}: ${season._count.id} entries`);
    });
    
    // Check team identities
    const teamIdentities = await prisma.teamIdentity.count();
    console.log(`\n🆔 Total Team Identities: ${teamIdentities}`);
    
    // Sample some recent data
    const recentTeams = await prisma.scrapedTeam.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { teamIdentity: true }
    });
    
    console.log(`\n🔍 Sample Recent Teams:`);
    recentTeams.forEach(team => {
      console.log(`   - ${team.teamName} (Season: ${team.seasonId}, Division: ${team.divisionId})`);
      console.log(`     Team Identity: ${team.teamIdentity ? team.teamIdentity.displayName : 'None'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkHistoricalData();
