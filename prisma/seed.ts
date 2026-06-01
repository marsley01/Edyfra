import { PrismaClient, Role, EduLevel, Tier, VerifPath, MatchTier, SessionStatus, PayStatus, AppStatus } from '@prisma/client';

const prisma = new PrismaClient();

const counties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Kiambu', 'Machakos', 'Kakamega', 'Meru', 'Nyeri'];
const subjects = ['Mathematics', 'Biology', 'Chemistry', 'Physics', 'English', 'Kiswahili', 'History', 'Geography'];
const topics = ['Quadratic Equations', 'Genetics', 'Organic Chemistry', 'Newton\'s Laws', 'Grammar', 'Fasihi', 'World War II', 'Map Reading'];
const studyStyles = ['visual', 'auditory', 'group', 'solo'];

async function main() {
  console.log('Clearing database...');
  // Clean up order matters to avoid foreign key constraints
  await prisma.dailyChallengeAttempt.deleteMany();
  await prisma.dailyChallenge.deleteMany();
  await prisma.review.deleteMany();
  await prisma.message.deleteMany();
  await prisma.session.deleteMany();
  await prisma.matchRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.tutorApplication.deleteMany();
  await prisma.struggleGroup.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.tutorProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding 30 Days of Daily Challenges...');
  // No tutors, no students — fresh start
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const challengeDate = new Date(today);
    challengeDate.setDate(today.getDate() - i);
    
    await prisma.dailyChallenge.create({
      data: {
        subject: subjects[0], // Mathematics
        level: EduLevel.HIGH_SCHOOL,
        formYear: 4,
        question: `What are the roots of the quadratic equation x^2 - 5x + 6 = 0? (Day ${30 - i})`,
        options: ['x=2, x=3', 'x=-2, x=-3', 'x=1, x=6', 'x=-1, x=-6'],
        answer: 'x=2, x=3',
        explanation: 'Factoring x^2 - 5x + 6 gives (x-2)(x-3)=0, therefore x=2 or x=3.',
        date: challengeDate
      }
    });
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
