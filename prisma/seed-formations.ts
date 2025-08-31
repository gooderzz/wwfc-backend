import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const formations = [
  {
    id: "4-3-3",
    version: 1,
    name: "4-3-3 Attacking",
    description: "Balanced attacking formation with wingers",
    positions: [
      { id: "lb", name: "Left Back", category: "DEFENDER", displayOrder: 1, isDefensive: true },
      { id: "cb1", name: "Center Back 1", category: "DEFENDER", displayOrder: 2, isDefensive: true },
      { id: "cb2", name: "Center Back 2", category: "DEFENDER", displayOrder: 3, isDefensive: true },
      { id: "rb", name: "Right Back", category: "DEFENDER", displayOrder: 4, isDefensive: true },
      { id: "dm", name: "Defensive Midfielder", category: "MIDFIELDER", displayOrder: 5, isDefensive: true },
      { id: "cm", name: "Center Midfielder", category: "MIDFIELDER", displayOrder: 6, isDefensive: false },
      { id: "am", name: "Attacking Midfielder", category: "MIDFIELDER", displayOrder: 7, isDefensive: false },
      { id: "lw", name: "Left Winger", category: "FORWARD", displayOrder: 8, isDefensive: false },
      { id: "st", name: "Striker", category: "FORWARD", displayOrder: 9, isDefensive: false },
      { id: "rw", name: "Right Winger", category: "FORWARD", displayOrder: 10, isDefensive: false }
    ]
  },
  {
    id: "4-4-2",
    version: 1,
    name: "4-4-2 Classic",
    description: "Traditional balanced formation",
    positions: [
      { id: "lb", name: "Left Back", category: "DEFENDER", displayOrder: 1, isDefensive: true },
      { id: "cb1", name: "Center Back 1", category: "DEFENDER", displayOrder: 2, isDefensive: true },
      { id: "cb2", name: "Center Back 2", category: "DEFENDER", displayOrder: 3, isDefensive: true },
      { id: "rb", name: "Right Back", category: "DEFENDER", displayOrder: 4, isDefensive: true },
      { id: "lm", name: "Left Midfielder", category: "MIDFIELDER", displayOrder: 5, isDefensive: false },
      { id: "cm1", name: "Center Midfielder 1", category: "MIDFIELDER", displayOrder: 6, isDefensive: false },
      { id: "cm2", name: "Center Midfielder 2", category: "MIDFIELDER", displayOrder: 7, isDefensive: false },
      { id: "rm", name: "Right Midfielder", category: "MIDFIELDER", displayOrder: 8, isDefensive: false },
      { id: "st1", name: "Striker 1", category: "FORWARD", displayOrder: 9, isDefensive: false },
      { id: "st2", name: "Striker 2", category: "FORWARD", displayOrder: 10, isDefensive: false }
    ]
  },
  {
    id: "3-5-2",
    version: 1,
    name: "3-5-2 Wing Back",
    description: "Attacking formation with wing backs",
    positions: [
      { id: "cb1", name: "Center Back 1", category: "DEFENDER", displayOrder: 1, isDefensive: true },
      { id: "cb2", name: "Center Back 2", category: "DEFENDER", displayOrder: 2, isDefensive: true },
      { id: "cb3", name: "Center Back 3", category: "DEFENDER", displayOrder: 3, isDefensive: true },
      { id: "lwb", name: "Left Wing Back", category: "DEFENDER", displayOrder: 4, isDefensive: true },
      { id: "dm", name: "Defensive Midfielder", category: "MIDFIELDER", displayOrder: 5, isDefensive: true },
      { id: "cm", name: "Center Midfielder", category: "MIDFIELDER", displayOrder: 6, isDefensive: false },
      { id: "am", name: "Attacking Midfielder", category: "MIDFIELDER", displayOrder: 7, isDefensive: false },
      { id: "rwb", name: "Right Wing Back", category: "DEFENDER", displayOrder: 8, isDefensive: true },
      { id: "st1", name: "Striker 1", category: "FORWARD", displayOrder: 9, isDefensive: false },
      { id: "st2", name: "Striker 2", category: "FORWARD", displayOrder: 10, isDefensive: false }
    ]
  },
  {
    id: "4-5-1",
    version: 1,
    name: "4-5-1 Defensive",
    description: "Defensive formation with midfield control",
    positions: [
      { id: "lb", name: "Left Back", category: "DEFENDER", displayOrder: 1, isDefensive: true },
      { id: "cb1", name: "Center Back 1", category: "DEFENDER", displayOrder: 2, isDefensive: true },
      { id: "cb2", name: "Center Back 2", category: "DEFENDER", displayOrder: 3, isDefensive: true },
      { id: "rb", name: "Right Back", category: "DEFENDER", displayOrder: 4, isDefensive: true },
      { id: "dm1", name: "Defensive Midfielder 1", category: "MIDFIELDER", displayOrder: 5, isDefensive: true },
      { id: "dm2", name: "Defensive Midfielder 2", category: "MIDFIELDER", displayOrder: 6, isDefensive: true },
      { id: "cm", name: "Center Midfielder", category: "MIDFIELDER", displayOrder: 7, isDefensive: false },
      { id: "am1", name: "Attacking Midfielder 1", category: "MIDFIELDER", displayOrder: 8, isDefensive: false },
      { id: "am2", name: "Attacking Midfielder 2", category: "MIDFIELDER", displayOrder: 9, isDefensive: false },
      { id: "st", name: "Striker", category: "FORWARD", displayOrder: 10, isDefensive: false }
    ]
  }
];

async function seedFormations() {
  console.log('🌱 Seeding formations...');

  try {
    // Clear existing formations (if any)
    await prisma.formationPosition.deleteMany();
    await prisma.formation.deleteMany();

    // Create formations and their positions
    for (const formationData of formations) {
      const { positions, ...formation } = formationData;
      
      console.log(`Creating formation: ${formation.name}`);
      
      const createdFormation = await prisma.formation.create({
        data: formation
      });

      // Create positions for this formation
      for (const positionData of positions) {
        await prisma.formationPosition.create({
          data: {
            ...positionData,
            id: `${createdFormation.id}_${positionData.id}`, // Make position IDs unique across formations
            formationId: createdFormation.id,
            category: positionData.category as any // Type assertion for enum
          }
        });
      }

      console.log(`✅ Created ${positions.length} positions for ${formation.name}`);
    }

    console.log('🎉 Formation seeding completed successfully!');
    
    // Verify the data
    const allFormations = await prisma.formation.findMany({
      include: {
        positions: {
          orderBy: {
            displayOrder: 'asc'
          }
        }
      }
    });

    console.log('\n📊 Seeded formations:');
    allFormations.forEach(formation => {
      console.log(`  ${formation.name} (${formation.id})`);
      formation.positions.forEach(pos => {
        console.log(`    - ${pos.name} (${pos.id}) - ${pos.category}`);
      });
    });

  } catch (error) {
    console.error('❌ Error seeding formations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedFormations()
  .then(() => {
    console.log('✅ Formation seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Formation seeding failed:', error);
    process.exit(1);
  });
