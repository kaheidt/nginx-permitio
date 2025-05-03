# PowerShell script to deploy NGINX-Permit.io to AWS
# Check if AWS CLI is installed
try {
    $awsVersion = aws --version
    Write-Host "AWS CLI is installed: $awsVersion"
} catch {
    Write-Host "AWS CLI is not installed. Please install it first."
    exit 1
}

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "Docker is installed: $dockerVersion"
} catch {
    Write-Host "Docker is not installed. Please install it first."
    exit 1
}

# Variables
$AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$PROJECT_NAME = if ($env:PROJECT_NAME) { $env:PROJECT_NAME } else { "nginx-permitio" }
$ENVIRONMENT = if ($env:ENVIRONMENT) { $env:ENVIRONMENT } else { "dev" }

# Get ECR repository URL from Terraform output
Write-Host "Getting ECR repository URL from Terraform output..."
$currentDir = $PSScriptRoot
Set-Location -Path "$currentDir\..\terraform"

try {
    $ECR_REPO_URL = terraform output -raw ecr_repository_url
} catch {
    Write-Host "Could not get ECR repository URL. Please make sure Terraform has been applied."
    exit 1
}

if (-not $ECR_REPO_URL) {
    Write-Host "Could not get ECR repository URL. Please make sure Terraform has been applied."
    exit 1
}

Write-Host "ECR Repository URL: $ECR_REPO_URL"

# Authenticate Docker to ECR
Write-Host "Logging in to ECR..."
$ecrLoginCmd = aws ecr get-login-password --region $AWS_REGION
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to get ECR login password."
    exit 1
}
docker login --username AWS --password $ecrLoginCmd $ECR_REPO_URL

# Build and push NGINX image
Write-Host "Building and pushing NGINX Docker image..."
Set-Location -Path "$currentDir\..\nginx"
docker build -t "$ECR_REPO_URL`:latest" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build NGINX Docker image."
    exit 1
}
docker push "$ECR_REPO_URL`:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push NGINX Docker image to ECR."
    exit 1
}

# Build and push API service image
Write-Host "Building and pushing API service Docker image..."
Set-Location -Path "$currentDir\.."  # Move to project root
# Build from the root directory with correct context
docker build -t "$ECR_REPO_URL`:api" -f src/Dockerfile.api .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build API Docker image."
    exit 1
}
docker push "$ECR_REPO_URL`:api"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push API Docker image to ECR."
    exit 1
}

# Build and push Auth service image
Write-Host "Building and pushing Auth service Docker image..."
# Still in the project root directory
docker build -t "$ECR_REPO_URL`:auth" -f src/Dockerfile.auth .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build Auth Docker image."
    exit 1
}
docker push "$ECR_REPO_URL`:auth"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push Auth Docker image to ECR."
    exit 1
}

Write-Host "All images have been built and pushed to ECR."
Write-Host "You can now update the ECS service to deploy the new images."

# Update ECS service
$confirmation = Read-Host "Do you want to update the ECS service now? (y/n)"
if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
    Set-Location -Path "$currentDir\..\terraform"
    $CLUSTER_NAME = terraform output -raw cluster_name
    $SERVICE_NAME = terraform output -raw service_name
    
    Write-Host "Updating ECS service: $SERVICE_NAME on cluster: $CLUSTER_NAME..."
    aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --force-new-deployment --region $AWS_REGION
    
    Write-Host "Service update initiated. You can check the deployment status in the AWS Console."
}

Write-Host "Deployment script completed."