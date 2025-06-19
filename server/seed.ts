import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcrypt";

async function createDemoUsers() {
  try {
    console.log("Creating demo users...");
    
    const demoUsers = [
      { 
        username: 'superadmin', 
        password: 'admin123', 
        fullName: 'Super Administrator', 
        role: 'superadmin' as const, 
        email: 'superadmin@paradelivery.com',
        phone: '+62812345678'
      },
      { 
        username: 'admin', 
        password: 'admin123', 
        fullName: 'System Administrator', 
        role: 'admin' as const, 
        email: 'admin@paradelivery.com',
        phone: '+62812345679'
      },
      { 
        username: 'pic', 
        password: 'pic123', 
        fullName: 'PIC Manager', 
        role: 'pic' as const, 
        email: 'pic@paradelivery.com',
        phone: '+62812345680'
      },
      { 
        username: 'kurir', 
        password: 'kurir123', 
        fullName: 'Courier Driver', 
        role: 'kurir' as const, 
        email: 'kurir@paradelivery.com',
        phone: '+62812345681'
      }
    ];

    for (const user of demoUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      try {
        const [createdUser] = await db.insert(users).values({
          username: user.username,
          password: hashedPassword,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          phone: user.phone,
          isActive: true
        }).returning();
        
        console.log(`✓ Created user: ${user.username} (${user.role})`);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`- User ${user.username} already exists, skipping...`);
        } else {
          console.error(`Error creating user ${user.username}:`, error.message);
        }
      }
    }
    
    console.log("Demo users setup completed!");
    process.exit(0);
  } catch (error) {
    console.error('Error setting up demo users:', error);
    process.exit(1);
  }
}

createDemoUsers();