#!/bin/bash

# Amplify Local Development Environment Cleanup Script
# This script handles AWS SSO authentication and cleans up sandbox resources

set -e  # Exit on any error

# Configuration
SSO_SESSION="amplify-admin-sso"
AWS_PROFILE="AmplifyFullAdministrator-788222620986"
AWS_PROFILE_TEMP="$AWS_PROFILE"  # Store for later use

echo "Starting Amplify sandbox cleanup..."
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

echo "Environment variables will be set when deleting sandbox..."
echo "Using AWS Account: $(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text)"

# Delete Amplify sandbox
echo "Deleting Amplify sandbox resources..."
echo "───────────────────────────────────────"

# Clear AWS_PROFILE to avoid conflicts and export credentials as env vars
unset AWS_PROFILE
eval $(aws configure export-credentials --profile "$AWS_PROFILE_TEMP" --format env) && npx ampx sandbox delete

# Clean up local files
echo ""
echo "Cleaning up local files..."
if [ -f "amplify_outputs.json" ]; then
    rm amplify_outputs.json
    echo "Removed amplify_outputs.json"
fi

echo ""
echo "Cleanup completed!"
echo "- Sandbox resources deleted from AWS"
echo "- Local configuration files removed"