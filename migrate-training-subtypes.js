const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateTrainingSubtypes() {
  console.log('Starting migration of training subtypes...');

  try {
    // Update all CLUB_WIDE training events to MAIN_TRAINING
    const updatedEvents = await prisma.event.updateMany({
      where: {
        eventType: 'TRAINING',
        eventSubtype: 'CLUB_WIDE',
      },
      data: {
        eventSubtype: 'MAIN_TRAINING',
      },
    });

    console.log(`Updated ${updatedEvents.count} training events from CLUB_WIDE to MAIN_TRAINING`);

    // Update training costs if needed
    const existingMainTraining = await prisma.trainingCost.findUnique({
      where: { trainingType: 'MAIN_TRAINING' },
    });

    if (!existingMainTraining) {
      // Create MAIN_TRAINING cost entry if it doesn't exist
      await prisma.trainingCost.create({
        data: {
          trainingType: 'MAIN_TRAINING',
          cost: 5.00, // Default cost, adjust as needed
          isActive: true,
        },
      });
      console.log('Created MAIN_TRAINING cost entry');
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateTrainingSubtypes()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
