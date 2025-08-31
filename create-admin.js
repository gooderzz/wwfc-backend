const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔧 Creating new admin user...');
    
    const email = 'scraper@admin.com';
    const password = 'scraper123';
    const name = 'Scraper Admin';
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('⚠️  User already exists, updating password...');
      await prisma.user.update({
        where: { email },
        data: { passwordHash }
      });
      console.log('✅ Password updated');
    } else {
      // Create new admin user
      await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'ADMIN'
        }
      });
      console.log('✅ New admin user created');
    }
    
    console.log(`\n🎉 Admin credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ADMIN`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
