const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default football positions
  const positions = [
    { name: 'Goalkeeper', description: 'GK - Primary shot stopper and last line of defense' },
    { name: 'Right Back', description: 'RB - Defensive fullback on the right side' },
    { name: 'Left Back', description: 'LB - Defensive fullback on the left side' },
    { name: 'Center Back', description: 'CB - Central defender' },
    { name: 'Defensive Midfielder', description: 'CDM - Defensive midfielder, shield for defense' },
    { name: 'Central Midfielder', description: 'CM - Box-to-box midfielder' },
    { name: 'Attacking Midfielder', description: 'CAM - Creative midfielder behind forwards' },
    { name: 'Right Winger', description: 'RW - Attacking player on the right wing' },
    { name: 'Left Winger', description: 'LW - Attacking player on the left wing' },
    { name: 'Striker', description: 'ST - Primary goal scorer' },
    { name: 'Forward', description: 'CF - Versatile attacking player' },
  ];

  for (const position of positions) {
    await prisma.position.upsert({
      where: { name: position.name },
      update: {},
      create: position,
    });
  }

  // Create default club settings
  const defaultSettings = [
    // Branding Settings
    { category: 'branding', key: 'club.name', value: 'Westminster Wanderers FC', description: 'Club name' },
    { category: 'branding', key: 'club.chairman', value: '', description: 'Chairman name' },
    { category: 'branding', key: 'club.viceChairman', value: '', description: 'Vice Chairman name' },
    { category: 'branding', key: 'club.primaryColor', value: '#1e40af', description: 'Primary brand color (hex)' },
    { category: 'branding', key: 'club.secondaryColor', value: '#3b82f6', description: 'Secondary brand color (hex)' },
    { category: 'branding', key: 'club.logo', value: '', description: 'Active logo reference' },
    
    // Social Media Settings
    { category: 'social', key: 'social.facebook', value: '', description: 'Facebook URL' },
    { category: 'social', key: 'social.twitter', value: '', description: 'Twitter/X URL' },
    { category: 'social', key: 'social.instagram', value: '', description: 'Instagram URL' },
    { category: 'social', key: 'social.linkedin', value: '', description: 'LinkedIn URL' },
    { category: 'social', key: 'social.website', value: '', description: 'Official website URL' },
    
    // Communication Settings (Placeholders)
    { category: 'communication', key: 'communication.rsvpReminders', value: '{"enabled": false, "hoursBefore": 24}', description: 'RSVP reminder settings' },
    { category: 'communication', key: 'communication.matchNotifications', value: '{"enabled": false, "hoursBefore": 2}', description: 'Match day notifications' },
    { category: 'communication', key: 'communication.emailSettings', value: '{"enabled": false, "frequency": "daily"}', description: 'Email notification settings' },
    { category: 'communication', key: 'communication.preferences', value: '{"sms": false, "email": true, "push": false}', description: 'General communication preferences' },
    
    // System Settings
    { category: 'system', key: 'system.registrationOpen', value: 'true', description: 'User registration status' },
    { category: 'system', key: 'system.defaultUserRole', value: 'TRIALIST', description: 'Default role for new users' },
    { category: 'system', key: 'system.passwordPolicy', value: '{"minLength": 8, "requireUppercase": true, "requireLowercase": true, "requireNumbers": true}', description: 'Password requirements' },
    { category: 'system', key: 'system.sessionTimeout', value: '1440', description: 'Session timeout in minutes (24 hours)' },
  ];

  for (const setting of defaultSettings) {
    await prisma.clubSettings.upsert({
      where: { 
        category_key: {
          category: setting.category,
          key: setting.key
        }
      },
      update: {},
      create: setting,
    });
  }

  // Create default training costs
  const trainingCosts = [
    { trainingType: 'SMALL_SIDED', cost: 5.00 },
    { trainingType: 'CLUB_WIDE', cost: 3.00 },
    { trainingType: 'FITNESS', cost: 2.00 },
  ];

  for (const cost of trainingCosts) {
    await prisma.trainingCost.upsert({
      where: { trainingType: cost.trainingType },
      update: {},
      create: cost,
    });
  }

  // Create default payment configurations for all fee types
  const paymentConfigs = [
    { paymentType: 'YEARLY_SUBS', amount: 70.00 },
    { paymentType: 'MATCH_FEE', amount: 12.00 },
    { paymentType: 'TRAINING_FEE', amount: 6.00 },
    { paymentType: 'SOCIAL_EVENT', amount: 0.00 },
    { paymentType: 'YELLOW_CARD_FEE', amount: 5.00 },
    { paymentType: 'RED_CARD_FEE', amount: 25.00 },
  ];

  console.log('Creating payment configurations...');
  for (const config of paymentConfigs) {
    console.log(`Creating ${config.paymentType} config...`);
    await prisma.paymentConfig.upsert({
      where: { 
        paymentType: config.paymentType
      },
      update: { amount: config.amount },
      create: config,
    });
  }
  console.log('Payment configurations created successfully!');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
