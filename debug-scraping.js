const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugScraping() {
  try {
    console.log('🔍 Debugging Scraping Process');
    console.log('=============================');
    
    // Check if teams from 2016-17 season exist
    const teams2016 = await prisma.scrapedTeam.findMany({
      where: { seasonId: '408332512' },
      include: { teamIdentity: true }
    });
    
    console.log(`\n📊 Teams from 2016-17 season (${teams2016.length}):`);
    teams2016.forEach(team => {
      console.log(`   - ${team.teamName} (ID: ${team.id}, Division: ${team.divisionId})`);
    });
    
    // Check league table entries for 2016-17
    const leagueTable2016 = await prisma.leagueTable.findMany({
      where: { seasonId: '408332512' }
    });
    
    console.log(`\n📋 League table entries for 2016-17 season (${leagueTable2016.length}):`);
    leagueTable2016.forEach(entry => {
      console.log(`   - ${entry.teamName} (Position: ${entry.position}, Points: ${entry.points})`);
    });
    
    // Check if any teams from the test scraping exist
    const testTeams = [
      'AFC Hammersmith Town',
      'AFC Putney First', 
      'Battersea Park Rangers',
      'FC Morden',
      'SWAG FC',
      'Parklife 1st Team',
      'Westminster Wanderers 1st Team',
      'Albion',
      'Huracan'
    ];
    
    console.log(`\n🔍 Checking if test teams exist in any season:`);
    for (const teamName of testTeams) {
      const existingTeams = await prisma.scrapedTeam.findMany({
        where: { teamName },
        include: { teamIdentity: true }
      });
      
      if (existingTeams.length > 0) {
        console.log(`   ✅ ${teamName} exists in ${existingTeams.length} season(s):`);
        existingTeams.forEach(team => {
          console.log(`      - Season ${team.seasonId}, Division ${team.divisionId}`);
        });
      } else {
        console.log(`   ❌ ${teamName} not found in any season`);
      }
    }
    
    // Check unique constraints
    console.log(`\n🔧 Checking unique constraints:`);
    const allTeams = await prisma.scrapedTeam.findMany({
      where: { teamName: 'Westminster Wanderers 1st Team' },
      orderBy: { seasonId: 'asc' }
    });
    
    console.log(`Westminster Wanderers 1st Team appears in ${allTeams.length} seasons:`);
    allTeams.forEach(team => {
      console.log(`   - Season ${team.seasonId}, Division ${team.divisionId}, Active: ${team.isActive}`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugScraping();
