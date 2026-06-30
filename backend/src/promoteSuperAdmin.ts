// Promote an existing account to super admin.
// Usage: npx tsx src/promoteSuperAdmin.ts <email>
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = process.argv[2];

async function main() {
  if (!email) {
    console.error('Usage: npx tsx src/promoteSuperAdmin.ts <email>');
    process.exit(1);
  }
  const user = await prisma.user.update({
    where: { email },
    data: { isSuperAdmin: true, accountStatus: 'ACTIVE' },
    select: { email: true, isSuperAdmin: true },
  });
  console.log(`✅ ${user.email} is now a super admin.`);
}

main()
  .catch((e) => { console.error('Failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
