#!/bin/bash

# Navigate to the supabase directory
cd "$(dirname "$0")"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found. Please install it first."
    echo "npm install -g supabase"
    exit 1
fi

echo "Resetting database and creating super admin account..."

# Reset the database (this will remove all data)
supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/postgres

# Run migrations to recreate the schema
echo "Running migrations to recreate schema..."
supabase migration up

# Now run our custom reset script to create the admin user
echo "Creating super admin account..."
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f reset_db.sql

echo "Database reset complete!"
echo "Super admin account created with:"
echo "Email: david@uconnect.com.au"
echo "Password: 123456"
echo ""
echo "You can now log in with these credentials." 