
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  phone: 'phone',
  name: 'name',
  avatar: 'avatar',
  gender: 'gender',
  role: 'role',
  educationLevel: 'educationLevel',
  formYear: 'formYear',
  county: 'county',
  points: 'points',
  tier: 'tier',
  streakDays: 'streakDays',
  lastActiveAt: 'lastActiveAt',
  isUnder18: 'isUnder18',
  strikes: 'strikes',
  createdAt: 'createdAt',
  bio: 'bio',
  settings: 'settings',
  curriculum: 'curriculum',
  dailyMessageCount: 'dailyMessageCount',
  dailySearchCount: 'dailySearchCount',
  lastCountReset: 'lastCountReset',
  subscriptionTier: 'subscriptionTier',
  banned: 'banned',
  suspended: 'suspended',
  plan: 'plan',
  planStartedAt: 'planStartedAt',
  planExpiresAt: 'planExpiresAt',
  planBillingCycle: 'planBillingCycle'
};

exports.Prisma.StudentProfileScalarFieldEnum = {
  userId: 'userId',
  subjects: 'subjects',
  weakTopics: 'weakTopics',
  studyStyle: 'studyStyle',
  preferredTimes: 'preferredTimes',
  goals: 'goals'
};

exports.Prisma.TutorProfileScalarFieldEnum = {
  userId: 'userId',
  subjects: 'subjects',
  levelsTaught: 'levelsTaught',
  verificationPath: 'verificationPath',
  gradesProof: 'gradesProof',
  hourlyRate: 'hourlyRate',
  bio: 'bio',
  isVerified: 'isVerified',
  verifiedAt: 'verifiedAt',
  rating: 'rating',
  totalSessions: 'totalSessions',
  mpesaNumber: 'mpesaNumber',
  availability: 'availability',
  sessionRate1on1: 'sessionRate1on1',
  sessionRateGroup: 'sessionRateGroup',
  payoutPhone: 'payoutPhone'
};

exports.Prisma.MatchRequestScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  subject: 'subject',
  topic: 'topic',
  tier1Tried: 'tier1Tried',
  tier2Tried: 'tier2Tried',
  resolvedAs: 'resolvedAs',
  sessionId: 'sessionId',
  createdAt: 'createdAt',
  resolvedAt: 'resolvedAt'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  partnerId: 'partnerId',
  tier: 'tier',
  subject: 'subject',
  topic: 'topic',
  status: 'status',
  roomId: 'roomId',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  durationMin: 'durationMin',
  pointsAwarded: 'pointsAwarded',
  priceKsh: 'priceKsh',
  paymentStatus: 'paymentStatus',
  mpesaRef: 'mpesaRef'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  senderId: 'senderId',
  content: 'content',
  isMash: 'isMash',
  flagged: 'flagged',
  createdAt: 'createdAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  reviewerId: 'reviewerId',
  revieweeId: 'revieweeId',
  rating: 'rating',
  comment: 'comment',
  createdAt: 'createdAt'
};

exports.Prisma.DailyChallengeScalarFieldEnum = {
  id: 'id',
  subject: 'subject',
  level: 'level',
  formYear: 'formYear',
  question: 'question',
  options: 'options',
  answer: 'answer',
  explanation: 'explanation',
  date: 'date'
};

exports.Prisma.DailyChallengeAttemptScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  challengeId: 'challengeId',
  correct: 'correct',
  pointsEarned: 'pointsEarned',
  createdAt: 'createdAt'
};

exports.Prisma.StruggleGroupScalarFieldEnum = {
  id: 'id',
  subject: 'subject',
  topic: 'topic',
  level: 'level',
  members: 'members',
  tutorId: 'tutorId',
  status: 'status',
  createdAt: 'createdAt',
  name: 'name'
};

exports.Prisma.GroupMessageScalarFieldEnum = {
  id: 'id',
  groupId: 'groupId',
  senderId: 'senderId',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.TutorApplicationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  path: 'path',
  gradesUrl: 'gradesUrl',
  subjects: 'subjects',
  status: 'status',
  reviewedBy: 'reviewedBy',
  reviewedAt: 'reviewedAt',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  body: 'body',
  actionUrl: 'actionUrl',
  read: 'read',
  createdAt: 'createdAt'
};

exports.Prisma.FeedPostScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  content: 'content',
  image: 'image',
  subject: 'subject',
  level: 'level',
  likes: 'likes',
  createdAt: 'createdAt'
};

exports.Prisma.PostLikeScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.CommentScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.AchievementScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  description: 'description',
  icon: 'icon',
  unlockedAt: 'unlockedAt'
};

exports.Prisma.PlatformSettingsScalarFieldEnum = {
  id: 'id',
  key: 'key',
  value: 'value',
  updatedAt: 'updatedAt'
};

exports.Prisma.AiConversationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  modelUsed: 'modelUsed',
  subject: 'subject',
  tokenCount: 'tokenCount',
  costEstimate: 'costEstimate',
  createdAt: 'createdAt'
};

exports.Prisma.ReportScalarFieldEnum = {
  id: 'id',
  reporterId: 'reporterId',
  reportedUserId: 'reportedUserId',
  contentType: 'contentType',
  contentId: 'contentId',
  reason: 'reason',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  title: 'title',
  body: 'body',
  targetAudience: 'targetAudience',
  publishedAt: 'publishedAt',
  expiresAt: 'expiresAt',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.NewsArticleScalarFieldEnum = {
  id: 'id',
  title: 'title',
  slug: 'slug',
  category: 'category',
  body: 'body',
  coverImage: 'coverImage',
  summary: 'summary',
  publishedAt: 'publishedAt',
  isDraft: 'isDraft',
  authorId: 'authorId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserCreditsScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  balance: 'balance',
  updatedAt: 'updatedAt'
};

exports.Prisma.CreditTransactionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  amount: 'amount',
  type: 'type',
  description: 'description',
  reference: 'reference',
  createdAt: 'createdAt'
};

exports.Prisma.TestimonialScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  authorName: 'authorName',
  quote: 'quote',
  school: 'school',
  avatar: 'avatar',
  isApproved: 'isApproved',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationSettingsScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  preferences: 'preferences',
  updatedAt: 'updatedAt'
};

exports.Prisma.PushSubscriptionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  endpoint: 'endpoint',
  p256dh: 'p256dh',
  auth: 'auth',
  createdAt: 'createdAt'
};

exports.Prisma.UserPreferencesScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  theme: 'theme',
  accentColor: 'accentColor',
  layout: 'layout',
  fontSize: 'fontSize',
  mashStyle: 'mashStyle',
  preferredLanguage: 'preferredLanguage',
  studyTime: 'studyTime',
  sessionLength: 'sessionLength',
  sessionTypePref: 'sessionTypePref',
  showProfile: 'showProfile',
  showOnlineStatus: 'showOnlineStatus',
  allowTutorRequests: 'allowTutorRequests',
  enableMashFallback: 'enableMashFallback',
  updatedAt: 'updatedAt'
};

exports.Prisma.ChallengeScalarFieldEnum = {
  id: 'id',
  subject: 'subject',
  educationLevel: 'educationLevel',
  difficulty: 'difficulty',
  question: 'question',
  correctAnswer: 'correctAnswer',
  explanation: 'explanation',
  options: 'options',
  points: 'points',
  generatedAt: 'generatedAt',
  isActive: 'isActive'
};

exports.Prisma.ChallengeCompletionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  challengeId: 'challengeId',
  wasCorrect: 'wasCorrect',
  completedAt: 'completedAt'
};

exports.Prisma.PlanScalarFieldEnum = {
  id: 'id',
  name: 'name',
  monthlyPrice: 'monthlyPrice',
  yearlyPrice: 'yearlyPrice',
  features: 'features',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  amount: 'amount',
  phone: 'phone',
  mpesaReceiptNumber: 'mpesaReceiptNumber',
  planType: 'planType',
  paymentType: 'paymentType',
  status: 'status',
  paidAt: 'paidAt',
  createdAt: 'createdAt',
  checkoutRequestId: 'checkoutRequestId',
  targetId: 'targetId'
};

exports.Prisma.SessionPaymentScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  studentId: 'studentId',
  tutorId: 'tutorId',
  grossAmount: 'grossAmount',
  platformFee: 'platformFee',
  tutorPayout: 'tutorPayout',
  mpesaReceipt: 'mpesaReceipt',
  paidAt: 'paidAt',
  refundedAt: 'refundedAt',
  createdAt: 'createdAt'
};

exports.Prisma.TutorPayoutScalarFieldEnum = {
  id: 'id',
  tutorId: 'tutorId',
  amount: 'amount',
  phone: 'phone',
  mpesaReceipt: 'mpesaReceipt',
  requestedAt: 'requestedAt',
  paidAt: 'paidAt',
  status: 'status'
};

exports.Prisma.SellerEarningScalarFieldEnum = {
  id: 'id',
  sellerId: 'sellerId',
  resourceId: 'resourceId',
  amount: 'amount',
  mpesaReceipt: 'mpesaReceipt',
  paidAt: 'paidAt',
  createdAt: 'createdAt'
};

exports.Prisma.CurriculumTopicScalarFieldEnum = {
  id: 'id',
  subject: 'subject',
  level: 'level',
  formYear: 'formYear',
  topicName: 'topicName',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ResourceScalarFieldEnum = {
  id: 'id',
  sellerId: 'sellerId',
  title: 'title',
  subject: 'subject',
  educationLevel: 'educationLevel',
  resourceType: 'resourceType',
  topic: 'topic',
  description: 'description',
  price: 'price',
  filePath: 'filePath',
  downloads: 'downloads',
  rating: 'rating',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.ResourcePurchaseScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  resourceId: 'resourceId',
  amount: 'amount',
  platformFee: 'platformFee',
  sellerPayout: 'sellerPayout',
  mpesaReceipt: 'mpesaReceipt',
  paidAt: 'paidAt'
};

exports.Prisma.Newsletter_subscribersScalarFieldEnum = {
  id: 'id',
  email: 'email',
  subscribed_at: 'subscribed_at',
  source: 'source'
};

exports.Prisma.InstitutionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  description: 'description',
  logo: 'logo',
  banner: 'banner',
  location: 'location',
  email: 'email',
  phone: 'phone',
  website: 'website',
  verified: 'verified',
  plan: 'plan',
  allowedDomains: 'allowedDomains',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InstitutionMemberScalarFieldEnum = {
  id: 'id',
  institutionId: 'institutionId',
  userId: 'userId',
  role: 'role',
  status: 'status',
  joinedAt: 'joinedAt'
};

exports.Prisma.InstitutionDocumentScalarFieldEnum = {
  id: 'id',
  institutionId: 'institutionId',
  title: 'title',
  description: 'description',
  filePath: 'filePath',
  fileType: 'fileType',
  fileSize: 'fileSize',
  uploadedBy: 'uploadedBy',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.Gender = exports.$Enums.Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE'
};

exports.Role = exports.$Enums.Role = {
  STUDENT: 'STUDENT',
  TUTOR: 'TUTOR',
  ADMIN: 'ADMIN'
};

exports.EduLevel = exports.$Enums.EduLevel = {
  HIGH_SCHOOL: 'HIGH_SCHOOL',
  UNIVERSITY: 'UNIVERSITY'
};

exports.Tier = exports.$Enums.Tier = {
  BRONZE: 'BRONZE',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
  PLATINUM: 'PLATINUM',
  LEGEND: 'LEGEND'
};

exports.VerifPath = exports.$Enums.VerifPath = {
  POINTS: 'POINTS',
  GRADES: 'GRADES'
};

exports.MatchTier = exports.$Enums.MatchTier = {
  TUTOR: 'TUTOR',
  PEER: 'PEER',
  MASH: 'MASH'
};

exports.SessionStatus = exports.$Enums.SessionStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.PayStatus = exports.$Enums.PayStatus = {
  NONE: 'NONE',
  HELD: 'HELD',
  RELEASED: 'RELEASED',
  REFUNDED: 'REFUNDED'
};

exports.AppStatus = exports.$Enums.AppStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.InstitutionRole = exports.$Enums.InstitutionRole = {
  INSTITUTION_ADMIN: 'INSTITUTION_ADMIN',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  INSTRUCTOR: 'INSTRUCTOR',
  STUDENT: 'STUDENT'
};

exports.Prisma.ModelName = {
  User: 'User',
  StudentProfile: 'StudentProfile',
  TutorProfile: 'TutorProfile',
  MatchRequest: 'MatchRequest',
  Session: 'Session',
  Message: 'Message',
  Review: 'Review',
  DailyChallenge: 'DailyChallenge',
  DailyChallengeAttempt: 'DailyChallengeAttempt',
  StruggleGroup: 'StruggleGroup',
  GroupMessage: 'GroupMessage',
  TutorApplication: 'TutorApplication',
  Notification: 'Notification',
  FeedPost: 'FeedPost',
  PostLike: 'PostLike',
  Comment: 'Comment',
  Achievement: 'Achievement',
  PlatformSettings: 'PlatformSettings',
  AiConversation: 'AiConversation',
  Report: 'Report',
  Announcement: 'Announcement',
  NewsArticle: 'NewsArticle',
  UserCredits: 'UserCredits',
  CreditTransaction: 'CreditTransaction',
  Testimonial: 'Testimonial',
  NotificationSettings: 'NotificationSettings',
  PushSubscription: 'PushSubscription',
  UserPreferences: 'UserPreferences',
  Challenge: 'Challenge',
  ChallengeCompletion: 'ChallengeCompletion',
  Plan: 'Plan',
  Payment: 'Payment',
  SessionPayment: 'SessionPayment',
  TutorPayout: 'TutorPayout',
  SellerEarning: 'SellerEarning',
  CurriculumTopic: 'CurriculumTopic',
  Resource: 'Resource',
  ResourcePurchase: 'ResourcePurchase',
  newsletter_subscribers: 'newsletter_subscribers',
  Institution: 'Institution',
  InstitutionMember: 'InstitutionMember',
  InstitutionDocument: 'InstitutionDocument'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
