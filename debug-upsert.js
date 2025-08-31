const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugUpsert() {
  try {
    console.log('🔍 Debugging Upsert Operation');
    console.log('=============================');
    
    // Check if there are any existing records that match our test case
    const existingTeams = await prisma.scrapedTeam.findMany({
      where: {
        teamName: 'AFC Hammersmith Town',
        division: 'Division 112318160',
        leagueId: '3545957',
        seasonId: '408332512'
      }
    });
    
    console.log(`\n📊 Existing teams matching our test case: ${existingTeams.length}`);
    existingTeams.forEach(team => {
      console.log(`   - ID: ${team.id}, Season: ${team.seasonId}, Division: ${team.divisionId}`);
    });
    
    // Check if there are any teams with the same name in any season
    const teamsWithSameName = await prisma.scrapedTeam.findMany({
      where: {
        teamName: 'AFC Hammersmith Town'
      },
      orderBy: { seasonId: 'asc' }
    });
    
    console.log(`\n📊 Teams with name 'AFC Hammersmith Town' in any season: ${teamsWithSameName.length}`);
    teamsWithSameName.forEach(team => {
      console.log(`   - ID: ${team.id}, Season: ${team.seasonId}, Division: ${team.divisionId}, Division Name: ${team.division}`);
    });
    
    // Check if there are any teams in the 2016-17 season
    const teams2016 = await prisma.scrapedTeam.findMany({
      where: { seasonId: '408332512' },
      orderBy: { teamName: 'asc' }
    });
    
    console.log(`\n📊 All teams in 2016-17 season: ${teams2016.length}`);
    teams2016.forEach(team => {
      console.log(`   - ${team.teamName} (ID: ${team.id}, Division: ${team.divisionId})`);
    });
    
    // Test the upsert operation manually
    console.log(`\n🧪 Testing upsert operation manually...`);
    
    const upsertResult = await prisma.scrapedTeam.upsert({
      where: {
        teamName_division_leagueId_seasonId: {
          teamName: 'AFC Hammersmith Town',
          division: 'Division 112318160',
          leagueId: '3545957',
          seasonId: '408332512'
        }
      },
      update: {
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        teamName: 'AFC Hammersmith Town',
        division: 'Division 112318160',
        leagueId: '3545957',
        divisionId: '112318160',
        seasonId: '408332512',
        isActive: true,
      }
    });
    
    console.log(`✅ Upsert result:`, upsertResult);
    
    // Check if it was created or updated
    const afterUpsert = await prisma.scrapedTeam.findUnique({
      where: { id: upsertResult.id }
    });
    
    console.log(`✅ After upsert:`, afterUpsert);
    
    // Clean up
    await prisma.scrapedTeam.delete({
      where: { id: upsertResult.id }
    });
    
    console.log(`✅ Cleaned up test record`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'P2002') {
      console.log('This is a unique constraint violation');
    }
  } finally {
    await prisma.$disconnect();
  }
}

debugUpsert();
