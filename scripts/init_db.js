require('dotenv').config({ path: '.env' });
const { neon } = require('@neondatabase/serverless');

async function init() {
  const sql = neon(process.env.DATABASE_URL);

  console.log("Creating tables...");
  
  await sql`
    CREATE TABLE IF NOT EXISTS zones (
      zone_id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100),
      current_temp FLOAT,
      humidity FLOAT,
      status VARCHAR(20) DEFAULT 'off',
      online BOOLEAN DEFAULT false,
      last_seen TIMESTAMP,
      settings JSONB DEFAULT '{"targetTemp": null, "mode": "off", "hold": false, "scheduleEnabled": false}'::jsonb,
      pending JSONB DEFAULT '{"settings": null, "commands": []}'::jsonb,
      schedule JSONB
    );
  `;
  console.log("Tables created successfully.");

  // Insert default zones if table is empty
  const countRes = await sql`SELECT COUNT(*) FROM zones`;
  if (countRes[0].count === '0') {
    console.log("Inserting default zones...");
    await sql`
      INSERT INTO zones (zone_id, name, settings, pending) VALUES 
      ('zone-1', 'Living Room', '{"targetTemp": 70, "mode": "heat", "hold": false, "scheduleEnabled": false}'::jsonb, '{"settings": null, "commands": []}'::jsonb),
      ('zone-2', 'Bedroom', '{"targetTemp": 68, "mode": "off", "hold": false, "scheduleEnabled": false}'::jsonb, '{"settings": null, "commands": []}'::jsonb)
    `;
    console.log("Default zones inserted.");
  } else {
    console.log(`Zones already exist: ${countRes[0].count}`);
  }
}

init().catch(console.error);