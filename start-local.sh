#!/bin/bash

# Main development environment startup script
# Runs sandbox and frontend in separate terminals

set -e

# Configuration variables
SANDBOX_TIMEOUT_SECONDS=300

echo "Starting development environment..."
echo "Current directory: $(pwd)"

###################################################
#================ AMPLIFY SANDBOX =================
###################################################
echo "Checking if development environment is already running..."

# Check for existing ampx sandbox processes (primary check)
if ps aux 2>/dev/null | grep -q "[a]mpx.*sandbox"; then
    echo "ERROR: Amplify sandbox process appears to be already running"
    echo "If you want to restart, stop the existing processes first"
    exit 1
fi

# Check for node processes that might be ampx (secondary check)
if tasklist //FI "IMAGENAME eq node.exe" 2>/dev/null | grep -q "node.exe"; then
    # Only flag as error if we also have a recent amplify_outputs.json
    if [ -f "amplify_outputs.json" ] && [ $(find amplify_outputs.json -mmin -5 2>/dev/null | wc -l) -gt 0 ]; then
        echo "ERROR: Amplify sandbox appears to be already running (node process + recent amplify_outputs.json)"
        echo "If you want to restart, run ./cleanup-local.sh first"
        exit 1
    fi
fi

# Check for existing npm dev server (frontend)
if ps aux 2>/dev/null | grep -q "[n]pm.*run.*dev" || netstat -an 2>/dev/null | grep -q ":3000"; then
    echo "ERROR: Frontend development server appears to be already running (port 3000 in use)"
    echo "If you want to restart, stop the existing npm process first"
    exit 1
fi

# Start sandbox in new terminal
echo "Starting sandbox in new terminal..."
CURRENT_DIR="$(pwd)"
start "Amplify Sandbox" "C:\Program Files\Git\bin\bash.exe" -c "cd '$CURRENT_DIR' && ./start-local-sandbox.sh; read -p 'Press any key to close...'"

# Wait for sandbox to initialize and check if it's running
echo "Waiting for sandbox to deploy and checking status..."
sandbox_running=false

for i in $(seq 1 $SANDBOX_TIMEOUT_SECONDS); do
    # Method 1: Check if amplify_outputs.json was recently created/modified (best indicator sandbox is working)
    if [ -f "amplify_outputs.json" ] && [ $(find amplify_outputs.json -mmin -1 2>/dev/null | wc -l) -gt 0 ]; then
        sandbox_running=true
        echo "Sandbox detected running (amplify_outputs.json created/updated)"
        break
    fi
    
    # Method 2: Check for ampx process using tasklist (Windows)
    if tasklist //FI "IMAGENAME eq node.exe" 2>/dev/null | grep -q "node.exe"; then
        # Method 3: Check for specific port usage (AppSync typically uses port 20002)
        if netstat -an 2>/dev/null | grep -q "20002"; then
            sandbox_running=true
            echo "Sandbox detected running (AppSync port active)"
            break
        fi
    fi
    
    # Method 4: Simple check for node processes with sandbox-related text
    if ps aux 2>/dev/null | grep -q "[a]mpx.*sandbox"; then
        sandbox_running=true
        echo "Sandbox detected running (process found)"
        break
    fi

    echo "Waiting for sandbox deployment... $i seconds (timeout in ${SANDBOX_TIMEOUT_SECONDS}s or $((SANDBOX_TIMEOUT_SECONDS/60)) minutes)"
    sleep 1
done


###################################################
#==================== FRONTEND ====================
###################################################
if [ "$sandbox_running" = true ]; then
    echo "Sandbox confirmed running, starting frontend..."
else
    echo "Sandbox status unclear, starting frontend anyway..."
fi

# Start frontend in new tab of the sandbox terminal
echo "Starting frontend in new tab of the sandbox terminal..."
# Use Windows Terminal to create a new tab in the existing window
if command -v wt.exe >/dev/null 2>&1; then
    wt.exe --window 0 new-tab --title "Frontend Dev" "C:\Program Files\Git\bin\bash.exe" -l -c "cd '$CURRENT_DIR' && ./start-local-frontend.sh"
else
    # Fallback: try to send command to existing terminal or open new window
    echo "Windows Terminal not available, opening new window..."
    start "Frontend Dev Server" "C:\Program Files\Git\bin\bash.exe" -c "cd '$CURRENT_DIR' && ./start-local-frontend.sh; read -p 'Press any key to close...'"
fi

# Wait a moment for frontend to start up, then open Chrome
echo "Waiting for frontend to start up..."
sleep 5

# Open Chrome to localhost:3000 in a new window, then open AWS AppSync console in a new tab
echo "Opening Chrome with localhost:3000 in new window and AWS AppSync console in new tab..."
if command -v chrome.exe >/dev/null 2>&1; then
    # Open localhost in a new window
    chrome.exe --new-window http://localhost:3000 &
    sleep 2
    # Open AWS AppSync console in a new tab of the same window
    chrome.exe --new-tab https://console.aws.amazon.com/appsync/ &
elif [ -f "/c/Program Files/Google/Chrome/Application/chrome.exe" ]; then
    # Open localhost in a new window
    "/c/Program Files/Google/Chrome/Application/chrome.exe" --new-window http://localhost:3000 &
    sleep 2
    # Open AWS AppSync console in a new tab of the same window
    "/c/Program Files/Google/Chrome/Application/chrome.exe" --new-tab https://console.aws.amazon.com/appsync/ &
elif [ -f "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" ]; then
    # Open localhost in a new window
    "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --new-window http://localhost:3000 &
    sleep 2
    # Open AWS AppSync console in a new tab of the same window
    "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --new-tab https://console.aws.amazon.com/appsync/ &
else
    # Fallback: use Windows start command to open default browser
    echo "Chrome not found, opening in default browser..."
    cmd.exe /c start http://localhost:3000
    sleep 2
    cmd.exe /c start https://console.aws.amazon.com/appsync/
fi

echo "Done. Both Sandbox and React services should be running."