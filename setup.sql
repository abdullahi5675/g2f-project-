-- Database Setup Script for G2F Project
-- Run this script using the terminal:
-- psql -U postgres -f setup.sql

-- Drop the database if it already exists (useful for resetting)
-- DROP DATABASE IF EXISTS g2f_db;

-- Create the database
CREATE DATABASE g2f_db;

-- Connect to the newly created database
\c g2f_db;

-- Create farmers table
CREATE TABLE IF NOT EXISTS farmers (
    id            SERIAL PRIMARY KEY,
    nin           VARCHAR(11) UNIQUE NOT NULL,
    full_name     VARCHAR(200) NOT NULL,
    phone_number  VARCHAR(15) NOT NULL,
    ward          VARCHAR(100),
    village       VARCHAR(100),
    crop_type     VARCHAR(100),
    acreage_ha    DECIMAL(6,2),
    is_verified   BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMP DEFAULT NOW()
);

-- Create vouchers table
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

-- Create distribution_events table
CREATE TABLE IF NOT EXISTS distribution_events (
    id                 SERIAL PRIMARY KEY,
    voucher_id         INT REFERENCES vouchers(id),
    agent_name         VARCHAR(200),
    bags_collected     INT NOT NULL,
    distribution_point VARCHAR(200),
    collected_at       TIMESTAMP DEFAULT NOW()
);

-- Note: db.js also ensures these tables are created automatically when the server starts,
-- but creating the database itself must be done first!
