import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const prisma = new PrismaClient();

async function main() {
  const email = 'mashmarsley@gmail.com';
  const password = 'Admin@2026!'; // temporary — change after first login

  // 1. Create in Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'ADMIN', name: 'Mash Marsley' },
  });

  if (authError) {
    console.error('Auth error:', authError.message);
    process.exit(1);
  }

  console.log('✅ Supabase Auth user created:', authUser.user?.id);

  // 2. Create in Prisma User table
  const user = await prisma.user.create({
    data: {
      id: authUser.user!.id,
      email,
      name: 'Mash Marsley',
      role: 'ADMIN' as any,
      county: 'Nairobi',
    },
  });

  console.log('✅ Prisma User created:', user.id);
  console.log('\n📋 Login credentials:');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log('\n⚠️  Change your password after first login!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
