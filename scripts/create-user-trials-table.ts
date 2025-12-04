import { readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";
import pg from "pg";

// Load environment variables
dotenv.config({ path: join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function createUserTrialsTable() {
  let client: pg.Client | null = null;

  try {
    console.log("📖 Reading migration SQL...");
    const migrationSQL = readFileSync(
      join(process.cwd(), "supabase-migration-user-trials.sql"),
      "utf-8"
    );

    // Try to construct database connection string
    // Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
    // Or use DATABASE_URL if provided
    let connectionString = databaseUrl;

    if (!connectionString) {
      // Extract project ref from Supabase URL
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      
      if (!projectRef) {
        console.error("❌ Could not extract project reference from Supabase URL");
        console.error("💡 Please set DATABASE_URL in .env.local");
        console.error("   Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres");
        console.error("\n📋 Alternative: Apply migration manually in Supabase SQL Editor");
        process.exit(1);
      }

      const dbPassword = process.env.SUPABASE_DB_PASSWORD;
      const dbHost = process.env.SUPABASE_DB_HOST || `aws-0-us-east-1.pooler.supabase.com`;

      if (!dbPassword) {
        console.error("❌ Missing SUPABASE_DB_PASSWORD environment variable");
        console.error("💡 Get your database password from: Supabase Dashboard → Project Settings → Database");
        console.error("\n📋 Alternative: Apply migration manually in Supabase SQL Editor");
        process.exit(1);
      }

      connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@${dbHost}:6543/postgres`;
    }

    console.log("🔌 Connecting to database...");
    client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("✅ Connected to database");

    console.log("📤 Executing migration SQL...");
    await client.query(migrationSQL);

    console.log("✅ Migration applied successfully!");
    console.log("✅ user_trials table created!");
    
    // Verify the table was created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_trials'
    `);
    
    if (result.rows.length > 0) {
      console.log("✅ Verified: user_trials table exists");
    }

  } catch (error) {
    console.error("❌ Error applying migration:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("password authentication failed")) {
        console.error("\n💡 Authentication failed. Please check:");
        console.error("   - SUPABASE_DB_PASSWORD is correct");
        console.error("   - Database connection string is correct");
      } else if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
        console.error("\n💡 Connection failed. Please check:");
        console.error("   - SUPABASE_DB_HOST is correct");
        console.error("   - Network connectivity");
      }
    }
    
    console.error("\n📋 Alternative: Apply migration manually in Supabase SQL Editor");
    console.error("   1. Go to Supabase Dashboard → SQL Editor");
    console.error("   2. Copy contents of: supabase-migration-user-trials.sql");
    console.error("   3. Paste and click 'Run'");
    
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

createUserTrialsTable();
