// Create (or update) a dedicated, data-less super-admin account.
// Usage: npx tsx src/createSuperAdmin.ts <email> <password> [fullName]
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const [email, password, fullName = 'Platform Admin'] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npx tsx src/createSuperAdmin.ts <email> <password> [fullName]');
    process.exit(1);
  }
  const hashed = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { isSuperAdmin: true, accountStatus: 'ACTIVE', role: 'OWNER', ownerId: null, password: hashed },
    });
    console.log(`✅ Updated ${email} as super admin.`);
  } else {
    await prisma.user.create({
      data: { email, password: hashed, fullName, companyName: 'Platform Admin', isSuperAdmin: true, accountStatus: 'ACTIVE', role: 'OWNER', plan: 'BUSINESS' },
    });
    console.log(`✅ Created super admin ${email}.`);
  }
}

main().catch((e) => { console.error('Failed:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
