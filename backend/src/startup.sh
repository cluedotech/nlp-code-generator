#!/bin/sh

echo "Starting NLP Code Generator Backend..."

# Wait for database to be ready
echo "Waiting for database..."
until node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT 1').then(() => { pool.end(); process.exit(0); }).catch(() => process.exit(1));" 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

# Run initialization (migrations + default admin user)
echo "Running database initialization..."
npm run init:prod

# Start the application
echo "Starting application..."
npm start
