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

variable "public_subnets" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "security_group_id" {
  description = "ID of the ALB security group"
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