#!/bin/bash

# This script adds a health check endpoint to your server.js file
# Run this before building the Docker image

SERVER_FILE="server/server.js"

if [ ! -f "$SERVER_FILE" ]; then
    echo "Error: $SERVER_FILE not found!"
    echo "Make sure you're in the pentest-app directory"
    exit 1
fi

# Check if health endpoint already exists
if grep -q "'/api/health'" "$SERVER_FILE"; then
    echo "Health check endpoint already exists in $SERVER_FILE"
    exit 0
fi

echo "Adding health check endpoint to $SERVER_FILE..."

# Create the health check route
HEALTH_CHECK="
// Health check endpoint for Docker
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
"

# Add before the error handling middleware (usually near the end)
# We'll add it before "// Error handling" or before the app.listen
if grep -q "// Error handling" "$SERVER_FILE"; then
    # Add before error handling
    sed -i "/\/\/ Error handling/i $HEALTH_CHECK" "$SERVER_FILE"
elif grep -q "app.listen" "$SERVER_FILE"; then
    # Add before app.listen
    sed -i "/app.listen/i $HEALTH_CHECK" "$SERVER_FILE"
else
    # Append to end of file
    echo "$HEALTH_CHECK" >> "$SERVER_FILE"
fi

echo "✓ Health check endpoint added successfully!"
echo "The endpoint will be available at: http://localhost:5000/api/health"
