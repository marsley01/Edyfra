import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env vars
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
  const BUCKET_NAME = 'institution-csvs';
  console.log(`Checking if bucket '${BUCKET_NAME}' exists...`);
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error("Failed to list buckets:", listError);
    process.exit(1);
  }

  const exists = buckets.find(b => b.name === BUCKET_NAME);
  if (exists) {
    console.log(`Bucket '${BUCKET_NAME}' already exists.`);
    return;
  }

  console.log(`Creating bucket '${BUCKET_NAME}'...`);
  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['text/csv', 'application/vnd.ms-excel'],
  });

  if (error) {
    console.error("Failed to create bucket:", error);
    process.exit(1);
  }

  console.log(`Successfully created bucket '${BUCKET_NAME}'.`);
}

createBucket();
