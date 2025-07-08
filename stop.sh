#!/bin/bash

# Kill backend (Uvicorn) processes
echo "Stopping backend (Uvicorn)..."
kill $(ps aux | grep 'uvicorn' | grep -v grep | awk '{print $2}') 2>/dev/null

# Kill frontend (Next.js) processes
echo "Stopping frontend (Next.js)..."
kill $(ps aux | grep 'next' | grep -v grep | awk '{print $2}') 2>/dev/null

# Optionally, kill node transform.js if any
kill $(ps aux | grep 'transform.js' | grep -v grep | awk '{print $2}') 2>/dev/null

# Remove PID log
echo "Cleaning up..."
rm -f start.log

echo "All servers stopped." 