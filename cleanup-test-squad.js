const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupTestSquad() {
  try {
    console.log('🧹 Cleaning up test squad...');
    
    // Find the test team
    const testTeam = await prisma.team.findFirst({
      where: { name: 'Test Squad' }
    });
    
    if (!testTeam) {
      console.log('⚠️  No test team found to clean up');
      return;
    }
    
    console.log(`📋 Found test team: ${testTeam.name} (ID: ${testTeam.id})`);
    
    // Find all test users (players with test emails)
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: '@player.player'
        }
      }
    });
    
    console.log(`👥 Found ${testUsers.length} test users to remove`);
    
    if (testUsers.length > 0) {
      // Delete test users
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: '@player.player'
          }
        }
      });
      
      console.log(`✅ Deleted ${testUsers.length} test users`);
    }
    
    // Delete the test team
    await prisma.team.delete({
      where: { id: testTeam.id }
    });
    
    console.log(`✅ Deleted test team: ${testTeam.name}`);
    
    console.log('\n🎉 Test squad cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error cleaning up test squad:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  cleanupTestSquad()
    .then(() => {
      console.log('\n✅ Cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupTestSquad };
