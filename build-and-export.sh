#!/bin/bash

# Repotr Generator - Docker Image Build & Export Script
# This script builds the Docker image and exports it for sharing

set -e  # Exit on error

echo "=========================================="
echo "Report Generator - Docker Image Builder"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="report-generator"
IMAGE_TAG="v1.0"
EXPORT_FILE="report-generator-image.tar.gz"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ]; then
    echo -e "${RED}Error: This script must be run from the pentest-app root directory${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Cleaning up old builds...${NC}"
docker rmi ${IMAGE_NAME}:${IMAGE_TAG} 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo -e "${BLUE}Step 2: Building production Docker image...${NC}"
echo "This may take 5-10 minutes..."
echo ""

if docker build --no-cache -f Dockerfile.production -t ${IMAGE_NAME}:${IMAGE_TAG} . ; then
    echo ""
    echo -e "${GREEN}✓ Docker image built successfully!${NC}"
else
    echo -e "${RED}✗ Failed to build Docker image${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}Step 3: Checking image size...${NC}"
IMAGE_SIZE=$(docker images ${IMAGE_NAME}:${IMAGE_TAG} --format "{{.Size}}")
echo -e "${GREEN}Image size: ${IMAGE_SIZE}${NC}"
echo ""

echo -e "${BLUE}Step 4: Exporting image to tar.gz file...${NC}"
echo "Exporting to: ${EXPORT_FILE}"
echo "This may take a few minutes..."
echo ""

if docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > ${EXPORT_FILE}; then
    echo -e "${GREEN}✓ Image exported successfully!${NC}"
else
    echo -e "${RED}✗ Failed to export image${NC}"
    exit 1
fi
echo ""

# Get file size
EXPORT_SIZE=$(ls -lh ${EXPORT_FILE} | awk '{print $5}')
echo -e "${BLUE}Step 5: Verifying export...${NC}"
echo -e "${GREEN}Export file: ${EXPORT_FILE}${NC}"
echo -e "${GREEN}File size: ${EXPORT_SIZE}${NC}"
echo ""

# Test the image
echo -e "${BLUE}Step 6: Testing the image...${NC}"
echo "Starting a test container..."

# Stop any existing test container
docker rm -f report-generator-test 2>/dev/null || true

# Start test container
if docker run -d --name report-generator-test \
    -e MONGODB_URI=mongodb://host.docker.internal:27017/pentest-reports \
    -e JWT_SECRET=test_secret \
    -p 5001:5000 \
    ${IMAGE_NAME}:${IMAGE_TAG}; then
    
    echo "Waiting for container to start..."
    sleep 5
    
    # Check if container is running
    if docker ps | grep -q report-generator-test; then
        echo -e "${GREEN}✓ Container started successfully!${NC}"
        
        # Try to access health endpoint
        if curl -f http://localhost:5001/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Health check passed!${NC}"
        else
            echo -e "${YELLOW}⚠ Health check not responding (this might be normal if MongoDB isn't running)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Container stopped (this might be normal without MongoDB)${NC}"
    fi
    
    # Stop and remove test container
    docker stop report-generator-test > /dev/null 2>&1
    docker rm report-generator-test > /dev/null 2>&1
    echo -e "${GREEN}✓ Test complete, container removed${NC}"
else
    echo -e "${YELLOW}⚠ Could not start test container (this might be okay)${NC}"
fi
echo ""

echo -e "${GREEN}=========================================="
echo "Build Complete!"
echo "==========================================${NC}"
echo ""
echo "📦 Files created:"
echo "   1. Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "   2. Export file: ${EXPORT_FILE} (${EXPORT_SIZE})"
echo ""
echo "📋 Next steps:"
echo "   1. Test locally (optional):"
echo "      docker-compose -f docker-compose-image.yml up -d"
echo ""
echo "   2. Share with friends:"
echo "      - ${EXPORT_FILE}"
echo "      - docker-compose-image.yml"
echo "      - DEPLOYMENT_GUIDE_FOR_FRIENDS_IMAGE.md"
echo ""
echo "🎯 Friends will run:"
echo "   docker load -i ${EXPORT_FILE}"
echo "   docker-compose -f docker-compose-image.yml up -d"
echo ""
echo "✨ No source code exposed, just the Docker image!"
echo ""
