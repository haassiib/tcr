// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/auth/hashing';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (optional - be careful in production)
  console.log('🗑️ Clearing existing data...');
  
  await prisma.menu.deleteMany();
  await prisma.agentStat.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.loginHistory.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared');

  // Create Roles and Permissions
  console.log('👥 Creating roles and permissions...');
  
  await prisma.permission.createMany({
    data: [
      { name: 'user:read', description: 'Read user data' },
      { name: 'user:write', description: 'Create and update users' },
      { name: 'user:delete', description: 'Delete users' },
      { name: 'brand:read', description: 'Read brand data' },
      { name: 'brand:write', description: 'Create and update brands' },
      { name: 'brand:delete', description: 'Delete brands' },
      { name: 'agent:read', description: 'Read agent data' },
      { name: 'agent:write', description: 'Create and update agents' },
      { name: 'agent:delete', description: 'Delete agents' },
      { name: 'agentStat:read', description: 'Read agent statistics' },
      { name: 'agentStat:write', description: 'Create and update agent statistics' },
      { name: 'agentStat:delete', description: 'Delete agent statistics' },
      { name: 'notification:read', description: 'Read notifications' },
      { name: 'notification:write', description: 'Create and update notifications' },
      { name: 'notification:delete', description: 'Delete notifications' },
    ],
  });

  const permissions = await prisma.permission.findMany();

  await prisma.role.createMany({
    data: [
      { name: 'admin', description: 'Administrator with full access' },
      { name: 'manager', description: 'Manager with limited access' },
      { name: 'vendor', description: 'Vendor with limited admin access' },
      { name: 'agent', description: 'Agent with limited admin access' },
      { name: 'user', description: 'Regular user' },
      { name: 'guest', description: 'Guest user' },
    ],
  });

  const roles = await prisma.role.findMany();

  // Assign permissions to roles
  const adminRole = roles.find(r => r.name === 'admin');
  const managerRole = roles.find(r => r.name === 'manager');
  const vendorRole = roles.find(r => r.name === 'vendor');
  const agentRole = roles.find(r => r.name === 'agent');
  const userRole = roles.find(r => r.name === 'user');
  
  if (adminRole) {
    await prisma.rolePermission.createMany({
      data: permissions.map(p => ({
        roleId: adminRole.id,
        permissionId: p.id,
      })),
    });
  }

  if (managerRole) {
    const managerPermissions = permissions.filter(p => 
      p.name.startsWith('tour:') || p.name.startsWith('booking:') || p.name.startsWith('content:') || p.name === 'user:read'
    );
    await prisma.rolePermission.createMany({
      data: managerPermissions.map(p => ({
        roleId: managerRole.id,
        permissionId: p.id,
      })),
    });
  }

  if (vendorRole) {
    const vendorPermissions = permissions.filter(p =>
      p.name.startsWith('brand:') || p.name.startsWith('agent:') || p.name.startsWith('agentStat:') || p.name.startsWith('notification:')
    );
    await prisma.rolePermission.createMany({
      data: vendorPermissions.map(p => ({
        roleId: vendorRole.id,
        permissionId: p.id,
      })),
    });
  }

  if (agentRole) {
    const agentPermissions = permissions.filter(p => p.name === 'agent:read' || p.name === 'agentStat:read' || p.name === 'notification:read');
    await prisma.rolePermission.createMany({
      data: agentPermissions.map(p => ({
        roleId: agentRole.id,
        permissionId: p.id,
      })),
    });
  }

  if (userRole) {
    const userPermissions = permissions.filter(p => 
      p.name === 'user:read' || p.name === 'tour:read' || p.name === 'booking:read' || p.name === 'content:read'
    );
    await prisma.rolePermission.createMany({
      data: userPermissions.map(p => ({
        roleId: userRole.id,
        permissionId: p.id,
      })),
    });
  }

  console.log('✅ Roles and permissions created');

  // Create Menus
  console.log('🌱 Creating menu items...');

  const userReadPermission = permissions.find(p => p.name === 'user:read');
  const brandReadPermission = permissions.find(p => p.name === 'brand:read');
  const notificationReadPermission = permissions.find(p => p.name === 'notification:read');

  // Create top-level menu items first
  const dashboardMenu = await prisma.menu.create({
    data: {
      name: 'Dashboard',
      href: '/dashboard',
      icon: 'Home',
      order: 0,
    },
  });

  const userManagementMenu = await prisma.menu.create({
    data: {
      name: 'User Management',
      icon: 'Users',
      order: 10,
      permissionId: userReadPermission?.id,
    },
  });

  const brandManagementMenu = await prisma.menu.create({
    data: {
      name: 'Brand Management',
      icon: 'Briefcase',
      order: 20,
      permissionId: brandReadPermission?.id,
    },
  });

  await prisma.menu.create({
    data: {
      name: 'Notifications',
      href: '/notifications',
      icon: 'Bell',
      order: 30,
      permissionId: notificationReadPermission?.id,
    },
  });

  // Create nested menu items
  await prisma.menu.createMany({
    data: [
      // Children of User Management
      { name: 'Users', href: '/users', icon: 'Circle', order: 0, parentId: userManagementMenu.id },
      { name: 'Roles', href: '/roles', icon: 'Circle', order: 1, parentId: userManagementMenu.id },
      { name: 'Permissions', href: '/permissions', icon: 'Circle', order: 2, parentId: userManagementMenu.id },

      // Children of Brand Management
      { name: 'Brands', href: '/brands', icon: 'Circle', order: 0, parentId: brandManagementMenu.id },
      { name: 'Agents', href: '/agents', icon: 'Circle', order: 1, parentId: brandManagementMenu.id },
    ],
  });

  console.log('✅ Menu items created');


  // Create Users
  console.log('👤 Creating users...');
  
  const passwordHash = await hashPassword('password123');

  await prisma.user.createMany({
    data: [
      {
        uuid: uuidv4(),
        email: 'admin@tc.com',
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+351912345678',
        avatarUrl: '/images/avatars/admin.jpg',
        dateOfBirth: new Date('1980-01-01'),
        gender: 'male',
        emailVerifiedAt: new Date(),
        isActive: true,
      },
      {
        uuid: uuidv4(),
        email: 'manager@tc.com',
        passwordHash,
        firstName: 'Tour',
        lastName: 'Manager',
        phone: '+351912345679',
        avatarUrl: '/images/avatars/manager.jpg',
        dateOfBirth: new Date('1985-05-15'),
        gender: 'female',
        emailVerifiedAt: new Date(),
        isActive: true,
      },
      {
        uuid: uuidv4(),
        email: 'user@tc.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+351912345680',
        avatarUrl: '/images/avatars/customer1.jpg',
        dateOfBirth: new Date('1990-08-20'),
        gender: 'male',
        emailVerifiedAt: new Date(),
        isActive: true,
      },
      {
        uuid: uuidv4(),
        email: 'guest@tc.com',
        passwordHash,
        firstName: 'Sarah',
        lastName: 'Smith',
        phone: '+351912345681',
        avatarUrl: '/images/avatars/customer2.jpg',
        dateOfBirth: new Date('1992-03-10'),
        gender: 'female',
        emailVerifiedAt: new Date(),
        isActive: true,
      },
      {
        uuid: uuidv4(),
        email: 'vendor@tc.com',
        passwordHash,
        firstName: 'Vendor',
        lastName: 'User',
        phone: '+351912345682',
        avatarUrl: '/images/avatars/vendor.jpg',
        dateOfBirth: new Date('1988-11-22'),
        gender: 'male',
        emailVerifiedAt: new Date(),
        isActive: true,
      },
      {
        uuid: uuidv4(),
        email: 'agent@tc.com',
        passwordHash,
        firstName: 'Agent',
        lastName: 'Smith',
        phone: '+351912345683',
        isActive: true,
      },
    ],
  });

  const users = await prisma.user.findMany();

  // Assign roles to users
  const adminUser = users.find(u => u.email === 'admin@tc.com');
  const managerUser = users.find(u => u.email === 'manager@tc.com');
  const vendorUser = users.find(u => u.email === 'vendor@tc.com');
  const agentUser = users.find(u => u.email === 'agent@tc.com');
  const regularUser = users.find(u => u.email === 'user@tc.com');

  if (adminUser && adminRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });
  }

  if (managerUser && managerRole) {
    await prisma.userRole.create({
      data: {
        userId: managerUser.id,
        roleId: managerRole.id,
      },
    });
  }

  if (regularUser && userRole) {
    await prisma.userRole.create({
      data: {
        userId: regularUser.id,
        roleId: userRole.id,
      },
    });
  }

  console.log('✅ Users created and roles assigned');

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📊 Seeding Summary:');
  console.log('');
  console.log('🔑 Test Login Credentials:');
  console.log('   Admin: admin@tc.com / password123');
  console.log('   Manager: manager@tc.com / password123');
  console.log('   Vendor: vendor@tc.com / password123');
  console.log('   Agent: agent@tc.com / password123');
  console.log('   Customer: user@tc.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });