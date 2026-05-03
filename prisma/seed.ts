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

  console.log('Seeding 50 Students...');
  for (let i = 1; i <= 50; i++) {
    const isHS = Math.random() > 0.3;
    const user = await prisma.user.create({
      data: {
        email: `student${i}@edyfra.com`,
        name: `Student ${i}`,
        role: Role.STUDENT,
        educationLevel: isHS ? EduLevel.HIGH_SCHOOL : EduLevel.UNIVERSITY,
        formYear: isHS ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 4) + 1,
        county: counties[Math.floor(Math.random() * counties.length)],
        points: Math.floor(Math.random() * 2000),
        tier: Tier.BRONZE,
        isUnder18: isHS,
        studentProfile: {
          create: {
            subjects: [subjects[Math.floor(Math.random() * subjects.length)], subjects[Math.floor(Math.random() * subjects.length)]],
            weakTopics: [topics[Math.floor(Math.random() * topics.length)]],
            studyStyle: studyStyles[Math.floor(Math.random() * studyStyles.length)],
            preferredTimes: { "monday": ["16:00", "18:00"], "saturday": ["10:00", "12:00"] },
            goals: ['KCSE prep', 'Improve grades']
          }
        }
      }
    });
  }

  console.log('Seeding 10 Tutors...');
  for (let i = 1; i <= 10; i++) {
    await prisma.user.create({
      data: {
        email: `tutor${i}@edyfra.com`,
        phone: `+2547000000${i.toString().padStart(2, '0')}`,
        name: `Tutor ${i}`,
        role: Role.TUTOR,
        educationLevel: EduLevel.UNIVERSITY,
        formYear: 4,
        county: counties[Math.floor(Math.random() * counties.length)],
        points: 5000 + Math.floor(Math.random() * 5000),
        tier: Tier.PLATINUM,
        isUnder18: false,
        tutorProfile: {
          create: {
            subjects: subjects.slice(0, 3), // Math, Bio, Chem
            levelsTaught: ['1', '2', '3', '4'],
            verificationPath: VerifPath.GRADES,
            hourlyRate: 500 + Math.floor(Math.random() * 500),
            bio: `Experienced tutor specializing in sciences. Dedicated to helping students excel in KCSE.`,
            isVerified: true,
            verifiedAt: new Date(),
            rating: 4.5 + Math.random() * 0.5,
            totalSessions: 10 + Math.floor(Math.random() * 90),
            availability: { "monday": ["18:00", "20:00"], "tuesday": ["18:00", "20:00"] }
          }
        }
      }
    });
  }

  console.log('Seeding 30 Days of Daily Challenges...');
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
