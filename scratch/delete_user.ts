import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const emailToDelete = process.argv[2];

async function main() {
  if (!emailToDelete) {
    console.error("Please provide an email to delete. Example: npx tsx scratch/delete_user.ts test@edyfra.com");
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: emailToDelete }
    });

    if (!user) {
      console.log(`User with email ${emailToDelete} not found in Prisma.`);
      return;
    }

    // Delete related records first if necessary, or use cascade delete if configured
    // For now, let's just delete the user directly (will fail if there are restrictive foreign keys without cascade)
    // If it fails, we will need to delete relations first.
    
    // 1. Delete deeply nested relations first
    await prisma.message.deleteMany({ where: { senderId: user.id } });
    await prisma.postLike.deleteMany({ where: { userId: user.id } });
    await prisma.comment.deleteMany({ where: { userId: user.id } });
    await prisma.feedPost.deleteMany({ where: { userId: user.id } });
    await prisma.dailyChallengeAttempt.deleteMany({ where: { userId: user.id } });
    await prisma.achievement.deleteMany({ where: { userId: user.id } });
    await prisma.notification.deleteMany({ where: { userId: user.id } });

    // 2. Delete Reviews
    await prisma.review.deleteMany({ where: { OR: [{ reviewerId: user.id }, { revieweeId: user.id }] } });
    
    // 3. Delete Sessions
    await prisma.session.deleteMany({ where: { OR: [{ studentId: user.id }, { partnerId: user.id }] } });

    // 4. Delete Profiles and Apps
    await prisma.tutorProfile.deleteMany({ where: { userId: user.id } });
    await prisma.studentProfile.deleteMany({ where: { userId: user.id } });
    await prisma.tutorApplication.deleteMany({ where: { userId: user.id } });

    // 4. Finally delete the User
    await prisma.user.delete({
      where: { email: emailToDelete }
    });

    console.log(`✅ Successfully completely deleted ${emailToDelete} from the Prisma database.`);
  } catch (error) {
    console.error("Failed to delete user:", error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
