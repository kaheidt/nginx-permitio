# AWS Deployment Guide for NGINX-Permit.io Authorization Gateway

This guide provides detailed instructions for deploying the NGINX-Permit.io authorization gateway to AWS using Terraform.

## Architecture Overview

Our AWS deployment architecture consists of:

![AWS Architecture Diagram](images/aws-architecture.png)

- **VPC** with public and private subnets across multiple availability zones
- **ECS Fargate** to run containerized services (NGINX, API, Auth)
- **Application Load Balancer** to distribute incoming traffic
- **Secrets Manager** to store sensitive information
- **ECR** to store Docker images
- **CloudWatch** for logs and monitoring

## Prerequisites

Before deploying, ensure you have the following installed:

- [AWS CLI](https://aws.amazon.com/cli/) (configured with appropriate credentials)
- [Terraform](https://www.terraform.io/downloads.html) v1.0+
- [Docker](https://www.docker.com/get-started) for building images

## Deployment Steps

### 1. Prepare Deployment Variables

Create a `terraform.tfvars` file with your configuration values:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` to include your specific configuration values:

```hcl
aws_region = "us-east-1"
project_name = "nginx-permitio"
environment = "dev"

# VPC Configuration - Choose one option:

# Option 1: Create a new VPC (default)
vpc_cidr = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]
public_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnets = ["10.0.3.0/24", "10.0.4.0/24"]

# Option 2: Use an existing VPC
# use_existing_vpc = true
# existing_vpc_id = "vpc-01234567890abcdef"
# existing_public_subnet_ids = ["subnet-01234567890abcdef", "subnet-01234567890abcdeg"]
# existing_private_subnet_ids = ["subnet-01234567890abcdeh", "subnet-01234567890abcdei"]

# Required secrets
permit_api_key = "your_permit_io_api_key_here"
auth_secret = "your_auth_service_secret_here"
```

### 2. Initialize Terraform

Initialize the Terraform workspace:

```bash
terraform init
```

If you're using a remote state backend (recommended for production), configure it in `main.tf` or via the command line.

### 3. Plan and Apply Infrastructure

Review the deployment plan:

```bash
terraform plan
```

Apply the infrastructure:

```bash
terraform apply
```

When prompted, type `yes` to proceed with the deployment.

### 4. Build and Push Docker Images

After Terraform successfully deploys the infrastructure, build and push the Docker images using the provided script:

For Linux/macOS:
```bash
cd ../scripts
chmod +x deploy.sh
./deploy.sh
```

For Windows:
```powershell
cd ..\scripts
.\deploy.ps1
```

The script will:
1. Obtain the ECR repository URL from Terraform output
2. Log in to ECR
3. Build the Docker images for NGINX, API, and Auth services
4. Push the images to ECR
5. Update the ECS service to use the new images

### 5. Access Your Deployed Application

After the images are deployed and the ECS service is updated, get the Application Load Balancer URL:

```bash
cd ../terraform
terraform output load_balancer_dns
```

You can now access your authorization gateway using this URL.

### 6. Verify Deployment

Test your deployment:

```bash
# Get a JWT token
curl -X POST http://<load_balancer_dns>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "2025DEVChallenge"}'

# Use the token to access a protected resource
curl -X GET http://<load_balancer_dns>/api/v1/vehicles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 7. Clean Up Resources

When you no longer need the infrastructure, you can destroy it:

```bash
cd terraform
terraform destroy
```

When prompted, type `yes` to confirm.

## Infrastructure Components

### Networking

- **VPC**: Either a newly created VPC or an existing one, based on configuration
- **Subnets**: Public subnets for ALB, private subnets for containers
- **NAT Gateway**: Allows outbound internet access from private subnets (created only when using a new VPC)
- **Internet Gateway**: Enables inbound/outbound internet access for public subnets (created only when using a new VPC)
- **Route Tables**: Control traffic routing within the VPC (created only when using a new VPC)

### Security

- **Security Groups**: Firewall rules for ALB and ECS tasks
- **IAM Roles**: Permissions for ECS tasks to access AWS services
- **Secrets Manager**: Securely stores sensitive information like API keys

### Containers

- **ECS Cluster**: Manages the container instances
- **Task Definition**: Defines the containers to run together
- **Service**: Ensures the desired number of tasks are running
- **ECR Repository**: Stores the Docker images

### Load Balancing

- **Application Load Balancer**: Distributes incoming traffic to containers
- **Target Groups**: Routes requests to registered containers
- **Health Checks**: Verifies container health

## Customization

### Scaling

To adjust the capacity of your deployment:

1. Update the `desired_count` in the ECS service (default: 2)
2. Update CPU and memory in the ECS task definition

### Custom Domain Name

To use a custom domain:

1. Register a domain in Route 53 or use an existing domain
2. Create a certificate in ACM
3. Add a HTTPS listener to the ALB
4. Create a Route 53 record pointing to the ALB

### Enhanced Security

For production deployments, consider:

- Enabling AWS WAF for additional protection
- Configuring CloudTrail for audit logging
- Setting up CloudWatch alarms for monitoring
- Implementing a bastion host for secure SSH access

## Troubleshooting

### Common Issues

1. **ECS service fails to start**:
   - Check CloudWatch logs for container startup errors
   - Verify security group and subnet configurations
   - Ensure IAM permissions are correct

2. **Failed image deployment**:
   - Check Docker build errors
   - Verify AWS CLI authentication
   - Ensure ECR repository exists and is accessible

3. **Application is unreachable**:
   - Verify ALB security group allows inbound traffic
   - Check health check settings
   - Ensure ECS tasks are running in private subnets with NAT gateway

4. **Authorization not working**:
   - Verify Permit.io API key is correct
   - Check NGINX configuration
   - Review CloudWatch logs for authorization errors

## Advanced Configuration

### Multiple Environments

For managing multiple environments (dev, staging, prod):

1. Create separate Terraform workspaces:
   ```bash
   terraform workspace new prod
   ```

2. Use workspace-specific variable files:
   ```bash
   terraform apply -var-file=prod.tfvars
   ```

### High Availability

The default configuration deploys across multiple availability zones for high availability. For enhanced reliability:

1. Increase the desired count of ECS tasks
2. Deploy to additional availability zones
3. Implement database replication if using a database

### Continuous Deployment

Integrate with CI/CD pipelines:

1. Store Terraform state in S3 with state locking in DynamoDB
2. Use AWS CodeBuild/CodePipeline or GitHub Actions
3. Implement automated testing before deployment

### Using an Existing VPC

When working in enterprise environments, you often need to deploy into an existing network infrastructure. Our Terraform configuration supports this use case:

1. Set `use_existing_vpc = true` in your terraform.tfvars file
2. Provide the existing VPC ID via `existing_vpc_id`
3. Specify the subnet IDs:
   - `existing_public_subnet_ids`: List of public subnet IDs for the ALB (must be in different availability zones)
   - `existing_private_subnet_ids`: List of private subnet IDs for the ECS tasks (must be in different availability zones)

Requirements for the existing VPC:
- The VPC must have DNS support and DNS hostnames enabled
- Public subnets should have routes to an Internet Gateway
- Private subnets should have routes to a NAT Gateway
- Security groups should allow necessary traffic between subnets

Example configuration:
```hcl
use_existing_vpc = true
existing_vpc_id = "vpc-01234567890abcdef"
existing_public_subnet_ids = ["subnet-01234567890abcdef", "subnet-01234567890abcdeg"]
existing_private_subnet_ids = ["subnet-01234567890abcdeh", "subnet-01234567890abcdei"]
```

## Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [NGINX Configuration Guide](https://docs.nginx.com/nginx/admin-guide/basic-functionality/managing-configuration-files/)
- [Permit.io Documentation](https://docs.permit.io)