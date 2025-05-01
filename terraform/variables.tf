variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "nginx-permitio"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.3.0/24", "10.0.4.0/24"]
}

# Variables for using existing VPC
variable "use_existing_vpc" {
  description = "Whether to use an existing VPC instead of creating a new one"
  type        = bool
  default     = false
}

variable "existing_vpc_id" {
  description = "ID of the existing VPC to use if use_existing_vpc is true"
  type        = string
  default     = ""
}

variable "existing_public_subnet_ids" {
  description = "IDs of the existing public subnets to use if use_existing_vpc is true"
  type        = list(string)
  default     = []
}

variable "existing_private_subnet_ids" {
  description = "IDs of the existing private subnets to use if use_existing_vpc is true"
  type        = list(string)
  default     = []
}

variable "permit_api_key" {
  description = "Permit.io API key"
  type        = string
  sensitive   = true
}

variable "auth_secret" {
  description = "Secret for the authentication service"
  type        = string
  sensitive   = true
}