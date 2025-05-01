variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnets" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "security_group_id" {
  description = "ID of the ECS task security group"
  type        = string
}

variable "alb_security_group_id" {
  description = "ID of the ALB security group"
  type        = string
}

variable "target_group_arn" {
  description = "ARN of the target group"
  type        = string
}

variable "ecr_repository_url" {
  description = "URL of the ECR repository"
  type        = string
}

variable "secrets_arn" {
  description = "ARN of the secrets in Secrets Manager"
  type        = string
}

variable "name_suffix" {
  description = "Suffix to be appended to names of the resources"
  type        = string
}

variable "common_tags" {
  description = "Tags to be applied to all resources"
  type        = map(string)
}

variable "container_definitions" {
  description = "Container definitions for the ECS task"
  type        = string
}