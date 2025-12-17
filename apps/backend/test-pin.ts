import { AppDataSource } from './src/database/data-source';
import { User } from './src/users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

async function testPIN() {
  await AppDataSource.initialize();
  
  const userRepo = AppDataSource.getRepository(User);
  const users = await userRepo.find();
  
  console.log(`Found ${users.length} users`);
  
  for (const user of users) {
    console.log(`\nTesting user: ${user.name}`);
    console.log(`PIN Hash: ${user.pinHash.substring(0, 30)}...`);
    
    // Test PIN 1234
    const test1234 = await bcrypt.compare('1234', user.pinHash);
    console.log(`PIN "1234" matches: ${test1234 ? '✅ YES' : '❌ NO'}`);
    
    // Test PIN 5678
    const test5678 = await bcrypt.compare('5678', user.pinHash);
    console.log(`PIN "5678" matches: ${test5678 ? '✅ YES' : '❌ NO'}`);
  }
  
  await AppDataSource.destroy();
}

testPIN().catch(console.error);
