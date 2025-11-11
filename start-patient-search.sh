#!/bin/bash
# ============================================================================
# PATIENT SEARCH SYSTEM - STARTUP SCRIPT (Linux/Mac)
# Volta Regional Hospital, Hohoe
# ============================================================================

echo ""
echo "========================================================================================================"
echo "  PATIENT SEARCH SYSTEM"
echo "  Volta Regional Hospital, Hohoe"
echo "========================================================================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "[1/3] Checking Node.js installation..."
node --version
echo ""

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "[2/3] Installing dependencies (this may take a few minutes)..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies"
        exit 1
    fi
    echo ""
else
    echo "[2/3] Dependencies already installed"
    echo ""
fi

# Check if database exists
if [ ! -f "data/database/patient-care-system.db" ]; then
    echo "[WARNING] Database not found at data/database/patient-care-system.db"
    echo ""
    echo "Please run the following commands first:"
    echo "  1. node scripts/init-database.js"
    echo "  2. node scripts/import-excel-data.js"
    echo ""
    exit 1
fi

echo "[3/3] Starting Patient Search Server..."
echo ""
echo "========================================================================================================"
echo "  Server will start on http://localhost:3000"
echo "  Press Ctrl+C to stop the server"
echo "========================================================================================================"
echo ""

# Start the server
node server/api.js
