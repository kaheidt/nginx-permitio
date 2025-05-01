output "permit_api_key_arn" {
  description = "ARN of the Permit.io API key secret"
  value       = aws_secretsmanager_secret.permit_api_key.arn
}

output "auth_secret_arn" {
  description = "ARN of the authentication service secret"
  value       = aws_secretsmanager_secret.auth_secret.arn
}

output "secrets_arn" {
  description = "ARN of the combined secrets"
  value       = aws_secretsmanager_secret.combined_secrets.arn
}