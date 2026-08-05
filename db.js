const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Create tables if they don't exist
async function initDB() {
  await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        full_name VARCHAR(200)
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        actor_name VARCHAR(200),
        actor_role VARCHAR(50),
        action_type VARCHAR(100),
        description TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS distribution_points (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        ward VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS fraud_alerts (
        id SERIAL PRIMARY KEY,
        alert_type VARCHAR(100),
        description TEXT,
        voucher_code VARCHAR(50),
        farmer_name VARCHAR(200),
        detected_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS farmers (
        id            SERIAL PRIMARY KEY,
        nin           VARCHAR(11) UNIQUE NOT NULL,
        full_name     VARCHAR(200) NOT NULL,
        phone_number  VARCHAR(15) NOT NULL,
        ward          VARCHAR(100),
        village       VARCHAR(100),
        crop_type     VARCHAR(100),
        acreage_ha    DECIMAL(6,2),
        verification_status VARCHAR(20) DEFAULT 'verified',
        registered_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vouchers (
        id                    SERIAL PRIMARY KEY,
        farmer_id             INT REFERENCES farmers(id),
        voucher_code          VARCHAR(20) UNIQUE NOT NULL,
        bags_allocated        INT NOT NULL,
        bags_redeemed         INT DEFAULT 0,
        distribution_point    VARCHAR(200),
        collection_start      DATE,
        collection_end        DATE,
        status                VARCHAR(20) DEFAULT 'pending',
        created_at            TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS distribution_events (
        id                 SERIAL PRIMARY KEY,
        voucher_id         INT REFERENCES vouchers(id),
        agent_name         VARCHAR(200),
        bags_collected     INT NOT NULL,
        distribution_point VARCHAR(200),
        collected_at       TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO users (username, password, role, full_name) VALUES 
        ('officer1', 'officer123', 'officer', 'Admin Officer'),
        ('agent1', 'agent123', 'agent', 'Distribution Agent'),
        ('supervisor1', 'supervisor123', 'supervisor', 'Chief Supervisor')
      ON CONFLICT DO NOTHING;

      INSERT INTO distribution_points (name, ward) VALUES 
        ('Basirka Distribution Point', 'Basirka'),
        ('Dingaya Distribution Point', 'Dingaya'),
        ('Fagam Distribution Point', 'Fagam'),
        ('Farin Dutse Distribution Point', 'Farin Dutse'),
        ('Gwaram Tsohuwa Distribution Point', 'Gwaram Tsohuwa'),
        ('Kila Distribution Point', 'Kila'),
        ('Kwandiko Distribution Point', 'Kwandiko'),
        ('Maruta Distribution Point', 'Maruta'),
        ('Sara Distribution Point', 'Sara'),
        ('Tsangarwa Distribution Point', 'Tsangarwa'),
        ('Zandam Nagog Distribution Point', 'Zandam Nagog')
      ON CONFLICT DO NOTHING;
  `);
  
  // Try to add the new verification_status column to the farmers table if it existed before we added the new features
  try {
    await pool.query("ALTER TABLE farmers ADD COLUMN verification_status VARCHAR(20) DEFAULT 'verified';");
    console.log('✅ Added missing verification_status column to farmers table');
  } catch (err) {
    // If it throws an error, it means the column already exists, which is fine!
  }

  console.log('✅ Database tables ready');
}

module.exports = { pool, initDB };
