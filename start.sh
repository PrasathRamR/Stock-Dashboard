#!/bin/sh
# Start the backend server in the background
cd /app/server
npm start &

# Start the frontend React app in the foreground
cd /app/client
npm start