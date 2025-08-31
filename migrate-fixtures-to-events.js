const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateFixturesToEvents() {
  console.log('Starting migration of fixtures to events...');

  try {
    // Get all fixtures
    const fixtures = await prisma.fixture.findMany({
      include: {
        team: true,
        rsvps: {
          include: {
            user: true,
          },
        },
      },
    });

    console.log(`Found ${fixtures.length} fixtures to migrate`);

    for (const fixture of fixtures) {
      console.log(`Migrating fixture: ${fixture.opponent} vs ${fixture.team.name}`);

      // Create event for this fixture
      const event = await prisma.event.create({
        data: {
          title: `${fixture.team.name} vs ${fixture.opponent}`,
          description: `Fixture: ${fixture.fixtureType}${fixture.cupName ? ` - ${fixture.cupName}` : ''}`,
          eventType: 'FIXTURE',
          eventSubtype: fixture.fixtureType,
          startDateTime: fixture.kickOffTime,
          endDateTime: null, // Fixtures don't have end times
          location: fixture.location,
          address: fixture.address,
          cost: null, // Fixtures don't have costs
          maxAttendees: null,
          rsvpDeadline: null,
          isRecurring: false,
          recurringRule: null,
          parentEventId: null,
          createdBy: 1, // Default to admin user ID 1
          createdFor: 'TEAM_SPECIFIC',
          teamId: fixture.teamId,
          isActive: true,
        },
      });

      console.log(`Created event with ID: ${event.id}`);

      // Migrate RSVPs
      for (const rsvp of fixture.rsvps) {
        await prisma.eventRSVP.create({
          data: {
            eventId: event.id,
            userId: rsvp.userId,
            status: rsvp.status,
          },
        });
      }

      console.log(`Migrated ${fixture.rsvps.length} RSVPs for fixture ${fixture.id}`);
    }

    console.log('Migration completed successfully!');
    console.log(`Migrated ${fixtures.length} fixtures to events`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateFixturesToEvents()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
