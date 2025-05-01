variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
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