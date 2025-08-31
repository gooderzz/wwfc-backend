const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Test squad configuration
const TEST_SQUAD = [
  // Primary Squad (11 players)
  {
    name: 'Test GK',
    email: 'testgk@player.player',
    primaryPosition: 'Goalkeeper',
    secondaryPosition: null, // Goalkeepers don't have secondary positions
    password: 'testplayer123'
  },
  {
    name: 'Test LB',
    email: 'testlb@player.player',
    primaryPosition: 'Left Back',
    secondaryPosition: 'Left Wing',
    password: 'testplayer123'
  },
  {
    name: 'Test CB1',
    email: 'testcb1@player.player',
    primaryPosition: 'Center Back',
    secondaryPosition: 'Defensive Midfielder',
    password: 'testplayer123'
  },
  {
    name: 'Test CB2',
    email: 'testcb2@player.player',
    primaryPosition: 'Center Back',
    secondaryPosition: 'Right Back',
    password: 'testplayer123'
  },
  {
    name: 'Test RB',
    email: 'testrb@player.player',
    primaryPosition: 'Right Back',
    secondaryPosition: 'Right Wing',
    password: 'testplayer123'
  },
  {
    name: 'Test DM',
    email: 'testdm@player.player',
    primaryPosition: 'Defensive Midfielder',
    secondaryPosition: 'Center Back',
    password: 'testplayer123'
  },
  {
    name: 'Test CM',
    email: 'testcm@player.player',
    primaryPosition: 'Center Midfielder',
    secondaryPosition: 'Attacking Midfielder',
    password: 'testplayer123'
  },
  {
    name: 'Test AM',
    email: 'testam@player.player',
    primaryPosition: 'Attacking Midfielder',
    secondaryPosition: 'Striker',
    password: 'testplayer123'
  },
  {
    name: 'Test LW',
    email: 'testlw@player.player',
    primaryPosition: 'Left Wing',
    secondaryPosition: 'Striker',
    password: 'testplayer123'
  },
  {
    name: 'Test ST',
    email: 'testst@player.player',
    primaryPosition: 'Striker',
    secondaryPosition: 'Attacking Midfielder',
    password: 'testplayer123'
  },
  {
    name: 'Test RW',
    email: 'testrw@player.player',
    primaryPosition: 'Right Wing',
    secondaryPosition: 'Striker',
    password: 'testplayer123'
  },
  
  // Secondary Squad (11 additional players for depth)
  {
    name: 'Test GK2',
    email: 'testgk2@player.player',
    primaryPosition: 'Goalkeeper',
    secondaryPosition: null,
    password: 'testplayer123'
  },
  {
    name: 'Test LWB',
    email: 'testlwb@player.player',
    primaryPosition: 'Left Wing Back',
    secondaryPosition: 'Left Back',
    password: 'testplayer123'
  },
  {
    name: 'Test CB3',
    email: 'testcb3@player.player',
    primaryPosition: 'Center Back',
    secondaryPosition: 'Defensive Midfielder',
    password: 'testplayer123'
  },
  {
    name: 'Test RWB',
    email: 'testrwb@player.player',
    primaryPosition: 'Right Wing Back',
    secondaryPosition: 'Right Back',
    password: 'testplayer123'
  },
  {
    name: 'Test DM2',
    email: 'testdm2@player.player',
    primaryPosition: 'Defensive Midfielder',
    secondaryPosition: 'Center Midfielder',
    password: 'testplayer123'
  },
  {
    name: 'Test CM2',
    email: 'testcm2@player.player',
    primaryPosition: 'Center Midfielder',
    secondaryPosition: 'Defensive Midfielder',
    password: 'testplayer123'
  },
  {
    name: 'Test AM2',
    email: 'testam2@player.player',
    primaryPosition: 'Attacking Midfielder',
    secondaryPosition: 'Center Midfielder',
    password: 'testplayer123'
  },
  {
    name: 'Test LW2',
    email: 'testlw2@player.player',
    primaryPosition: 'Left Wing',
    secondaryPosition: 'Attacking Midfielder',
    password: 'testplayer123'
  },
  {
    name: 'Test ST2',
    email: 'testst2@player.player',
    primaryPosition: 'Striker',
    secondaryPosition: 'Right Wing',
    password: 'testplayer123'
  },
  {
    name: 'Test RW2',
    email: 'testrw2@player.player',
    primaryPosition: 'Right Wing',
    secondaryPosition: 'Attacking Midfielder',
    password: 'testplayer123'
  },
  {
    name: 'Test Utility',
    email: 'testutility@player.player',
    primaryPosition: 'Center Midfielder',
    secondaryPosition: 'Right Back',
    password: 'testplayer123'
  }
];

// Position mapping to match the database
const POSITION_MAPPING = {
  'Goalkeeper': { name: 'Goalkeeper' },
  'Left Back': { name: 'Left Back' },
  'Center Back': { name: 'Center Back' },
  'Right Back': { name: 'Right Back' },
  'Left Wing Back': { name: 'Left Wing Back' },
  'Right Wing Back': { name: 'Right Wing Back' },
  'Defensive Midfielder': { name: 'Defensive Midfielder' },
  'Center Midfielder': { name: 'Center Midfielder' },
  'Attacking Midfielder': { name: 'Attacking Midfielder' },
  'Left Wing': { name: 'Left Wing' },
  'Right Wing': { name: 'Right Wing' },
  'Striker': { name: 'Striker' }
};

async function createTestSquad() {
  try {
    console.log('🏃‍♂️ Creating test squad...');
    
    // First, ensure we have a test team
    let testTeam = await prisma.team.findFirst({
      where: { name: 'Test Squad' }
    });
    
    if (!testTeam) {
      console.log('📋 Creating test team...');
      testTeam = await prisma.team.create({
        data: {
          name: 'Test Squad',
          division: 'Test Division',
          slug: 'test-squad'
        }
      });
      console.log(`✅ Created test team: ${testTeam.name} (ID: ${testTeam.id})`);
    } else {
      console.log(`✅ Using existing test team: ${testTeam.name} (ID: ${testTeam.id})`);
    }
    
    // Create or get positions
    const positions = {};
    for (const [key, positionData] of Object.entries(POSITION_MAPPING)) {
      let position = await prisma.position.findFirst({
        where: { name: positionData.name }
      });
      
      if (!position) {
        position = await prisma.position.create({
          data: {
            name: positionData.name
          }
        });
        console.log(`✅ Created position: ${position.name}`);
      }
      
      positions[key] = position;
    }
    
    // Create test users
    const createdUsers = [];
    
    for (const player of TEST_SQUAD) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: player.email }
      });
      
      if (existingUser) {
        console.log(`⚠️  User already exists: ${player.name} (${player.email})`);
        createdUsers.push(existingUser);
        continue;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(player.password, 10);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          name: player.name,
          email: player.email,
          passwordHash: hashedPassword,
          role: 'PLAYER',
          status: 'ACTIVE',
          teamId: testTeam.id,
          primaryPositionId: positions[player.primaryPosition]?.id || null,
          secondaryPositionId: player.secondaryPosition ? positions[player.secondaryPosition]?.id || null : null
        }
      });
      
      console.log(`✅ Created player: ${player.name} (${player.email})`);
      console.log(`   Primary: ${player.primaryPosition}`);
      if (player.secondaryPosition) {
        console.log(`   Secondary: ${player.secondaryPosition}`);
      }
      
      createdUsers.push(user);
    }
    
    console.log('\n🎉 Test squad creation completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Team: ${testTeam.name} (ID: ${testTeam.id})`);
    console.log(`   - Players created: ${createdUsers.length}`);
    console.log(`   - Total positions: ${Object.keys(positions).length}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('   All players use password: testplayer123');
    console.log('   Email format: test[position]@player.player');
    
    console.log('\n📋 Test Squad Roster:');
    createdUsers.forEach((user, index) => {
      const player = TEST_SQUAD[index];
      console.log(`   ${index + 1}. ${user.name} - ${player.primaryPosition}${player.secondaryPosition ? ` / ${player.secondaryPosition}` : ''}`);
    });
    
    console.log('\n🚀 Ready for testing!');
    console.log('   - Use these players to test team selection');
    console.log('   - Test different formations with realistic position assignments');
    console.log('   - Test RSVP functionality with multiple players');
    
  } catch (error) {
    console.error('❌ Error creating test squad:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  createTestSquad()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestSquad };
