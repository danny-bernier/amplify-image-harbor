#!/bin/bash

# Amplify Local Sandbox Startup Script
# This script handles AWS SSO authentication and starts the Amplify sandbox

set -e  # Exit on any error

# Configuration
SSO_SESSION="amplify-admin-sso"
AWS_PROFILE="AmplifyFullAdministrator-788222620986"
AWS_PROFILE_TEMP="$AWS_PROFILE"  # Store for later use

echo "Starting Amplify Local Sandbox..."
echo "───────────────────────────────────────"

# Check if already authenticated
echo "Checking AWS credentials..."
if aws sts get-caller-identity --profile "$AWS_PROFILE" > /dev/null 2>&1; then
    echo "Already authenticated with AWS"
else
    echo "Credentials expired or not found, logging in..."
    echo "Authenticating with AWS SSO..."
    aws sso login --sso-session "$SSO_SESSION"
    
    if [ $? -ne 0 ]; then
        echo "SSO login failed. Please check your configuration."
        exit 1
    fi
    
    echo "SSO authentication successful"
    
    # Verify credentials work after login
    echo "Verifying AWS credentials..."
    aws sts get-caller-identity --profile "$AWS_PROFILE" > /dev/null
    
    if [ $? -ne 0 ]; then
        echo "Credential verification failed"
        exit 1
    fi
    
    echo "AWS credentials verified"
fi

echo "Environment variables will be set when starting sandbox..."
echo "Using AWS Account: $(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text)"

# Start Amplify sandbox
echo "Starting Amplify sandbox..."
echo "───────────────────────────────────────"

# Clear AWS_PROFILE to avoid conflicts and export credentials as env vars
unset AWS_PROFILE
eval $(aws configure export-credentials --profile "$AWS_PROFILE_TEMP" --format env) && npx ampx sandbox

# If sandbox exits, show helpful message
echo ""
echo "Amplify sandbox stopped"
echo "To restart, run: ./start-local-sandbox.sh"