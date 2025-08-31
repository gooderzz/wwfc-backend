const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testManualInsert() {
  try {
    console.log('🧪 Testing manual team insertion...');
    
    // Try to manually insert a team from 2016-17 season
    const testTeam = await prisma.scrapedTeam.create({
      data: {
        teamName: 'AFC Hammersmith Town',
        division: 'Division 112318160',
        leagueId: '3545957',
        divisionId: '112318160',
        seasonId: '408332512', // 2016-17 season
        isActive: true,
      }
    });
    
    console.log('✅ Successfully created test team:', testTeam);
    
    // Check if it exists
    const foundTeam = await prisma.scrapedTeam.findUnique({
      where: { id: testTeam.id }
    });
    
    console.log('✅ Found team in database:', foundTeam);
    
    // Clean up
    await prisma.scrapedTeam.delete({
      where: { id: testTeam.id }
    });
    
    console.log('✅ Cleaned up test team');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'P2002') {
      console.log('This is a unique constraint violation');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testManualInsert();
