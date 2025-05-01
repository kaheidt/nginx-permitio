#!/bin/bash
set -e

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install it first."
    exit 1
fi

# Variables
AWS_REGION=${AWS_REGION:-"us-east-1"}
PROJECT_NAME=${PROJECT_NAME:-"nginx-permitio"}
ENVIRONMENT=${ENVIRONMENT:-"dev"}

# Get ECR repository URL from Terraform output
echo "Getting ECR repository URL from Terraform output..."
cd $(dirname "$0")/../terraform
ECR_REPO_URL=$(terraform output -raw ecr_repository_url)

if [ -z "$ECR_REPO_URL" ]; then
    echo "Could not get ECR repository URL. Please make sure Terraform has been applied."
    exit 1
fi

echo "ECR Repository URL: $ECR_REPO_URL"

# Authenticate Docker to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO_URL

# Build and push NGINX image
echo "Building and pushing NGINX Docker image..."
cd ../nginx
docker build -t $ECR_REPO_URL:latest .
docker push $ECR_REPO_URL:latest

# Build and push API service image
echo "Building and pushing API service Docker image..."
cd ../src
docker build -t $ECR_REPO_URL:api -f Dockerfile.api .
docker push $ECR_REPO_URL:api

# Build and push Auth service image
echo "Building and pushing Auth service Docker image..."
docker build -t $ECR_REPO_URL:auth -f Dockerfile.auth .
docker push $ECR_REPO_URL:auth

echo "All images have been built and pushed to ECR."
echo "You can now update the ECS service to deploy the new images."

# Update ECS service
read -p "Do you want to update the ECS service now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd ../terraform
    CLUSTER_NAME=$(terraform output -raw cluster_name)
    SERVICE_NAME=$(terraform output -raw service_name)
    
    echo "Updating ECS service: $SERVICE_NAME on cluster: $CLUSTER_NAME..."
    aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --force-new-deployment --region $AWS_REGION
    
    echo "Service update initiated. You can check the deployment status in the AWS Console."
fi

echo "Deployment script completed."