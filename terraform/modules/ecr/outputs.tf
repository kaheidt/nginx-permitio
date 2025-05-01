output "repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.nginx_permitio.repository_url
}

output "repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.nginx_permitio.name
}