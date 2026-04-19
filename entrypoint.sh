#!/bin/sh
set -e

# Define database path in the volume
DB_PATH="/data/db.sqlite"
INIT_DB_PATH="/usr/src/app/drizzle/db/db.sqlite"

# Check if the database file exists in the volume
if [ ! -f "$DB_PATH" ]; then
    echo "Database file not found in volume at $DB_PATH"
    
    # Check if we have an initial database to copy
    if [ -f "$INIT_DB_PATH" ]; then
        echo "Initializing database from $INIT_DB_PATH..."
        mkdir -p /data
        cp "$INIT_DB_PATH" "$DB_PATH"
        echo "Database initialized successfully."
    else
        echo "Warning: Initial database not found at $INIT_DB_PATH. Starting with empty/new database if application supports it."
    fi
else
    echo "Database exists at $DB_PATH."
fi

# Run migrations/push schema
echo "Running database schema sync..."
# We use push for development/demo speed, but it ensures the tables exist.
# We ignore errors to prevent boot loops if there are no changes or minor conflicts.
yarn drizzle:push || echo "Warning: Schema sync failed or no changes needed."

# Execute the CMD
exec "$@"
