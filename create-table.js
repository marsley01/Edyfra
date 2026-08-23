const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  const query = 'CREATE TABLE IF NOT EXISTS "SiteTestimonial" ("id" TEXT NOT NULL, "authorName" TEXT NOT NULL, "school" TEXT, "quote" TEXT NOT NULL, "rating" INTEGER NOT NULL DEFAULT 5, "approved" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SiteTestimonial_pkey" PRIMARY KEY ("id"))';
  await client.query(query);
  console.log('Table created successfully.');
  await client.end();
}
run().catch(console.error);