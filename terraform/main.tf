terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Random string for unique naming
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  name_suffix = random_string.suffix.result
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Create VPC only if use_existing_vpc is false
module "vpc" {
  count = var.use_existing_vpc ? 0 : 1
  
  source = "./modules/vpc"
  
  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  public_subnets     = var.public_subnets
  private_subnets    = var.private_subnets
  name_suffix        = local.name_suffix
  common_tags        = local.common_tags
}

# Use local variables to reference either the new or existing VPC resources
locals {
  vpc_id            = var.use_existing_vpc ? var.existing_vpc_id : module.vpc[0].vpc_id
  public_subnet_ids = var.use_existing_vpc ? var.existing_public_subnet_ids : module.vpc[0].public_subnet_ids
  private_subnet_ids = var.use_existing_vpc ? var.existing_private_subnet_ids : module.vpc[0].private_subnet_ids
}

module "security" {
  source = "./modules/security"
  
  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = local.vpc_id
  name_suffix        = local.name_suffix
  common_tags        = local.common_tags
}

module "secrets" {
  source = "./modules/secrets"
  
  project_name       = var.project_name
  environment        = var.environment
  name_suffix        = local.name_suffix
  common_tags        = local.common_tags
  permit_api_key     = var.permit_api_key
  auth_secret        = var.auth_secret
}

module "load_balancer" {
  source = "./modules/load_balancer"
  
  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = local.vpc_id
  public_subnets     = local.public_subnet_ids
  security_group_id  = module.security.alb_security_group_id
  name_suffix        = local.name_suffix
  common_tags        = local.common_tags
}

module "ecs" {
  source = "./modules/ecs"
  
  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = local.vpc_id
  private_subnets       = local.private_subnet_ids
  security_group_id     = module.security.ecs_security_group_id
  alb_security_group_id = module.security.alb_security_group_id
  target_group_arn      = module.load_balancer.target_group_arn
  ecr_repository_url    = module.ecr.repository_url
  secrets_arn           = module.secrets.secrets_arn
  name_suffix           = local.name_suffix
  common_tags           = local.common_tags
  container_definitions = templatefile("${path.module}/templates/containers.json.tpl", {
    ecr_repository_url = module.ecr.repository_url
    region             = var.aws_region
    secrets_arn        = module.secrets.secrets_arn
    log_group          = module.ecs.log_group_name
    environment        = var.environment
  })
}

module "ecr" {
  source = "./modules/ecr"
  
  project_name       = var.project_name
  environment        = var.environment
  name_suffix        = local.name_suffix
  common_tags        = local.common_tags
}

output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = module.load_balancer.alb_dns_name
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = module.ecr.repository_url
}