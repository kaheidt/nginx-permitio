resource "aws_secretsmanager_secret" "permit_api_key" {
  name        = "${var.project_name}-${var.environment}-permit-api-key-${var.name_suffix}"
  description = "Permit.io API key"
  
  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "permit_api_key" {
  secret_id     = aws_secretsmanager_secret.permit_api_key.id
  secret_string = var.permit_api_key
}

resource "aws_secretsmanager_secret" "auth_secret" {
  name        = "${var.project_name}-${var.environment}-auth-secret-${var.name_suffix}"
  description = "Authentication service secret"
  
  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "auth_secret" {
  secret_id     = aws_secretsmanager_secret.auth_secret.id
  secret_string = var.auth_secret
}

# Combined secrets JSON for container environment variables
resource "aws_secretsmanager_secret" "combined_secrets" {
  name        = "${var.project_name}-${var.environment}-combined-secrets-${var.name_suffix}"
  description = "Combined secrets for container environment variables"
  
  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "combined_secrets" {
  secret_id = aws_secretsmanager_secret.combined_secrets.id
  secret_string = jsonencode({
    PERMIT_API_KEY = var.permit_api_key
    AUTH_SECRET    = var.auth_secret
    PERMIT_PDP_URL = "https://cloudpdp.api.permit.io"
  })
}