resource "aws_ecr_repository" "nginx_permitio" {
  name                 = "${var.project_name}-${var.environment}-${var.name_suffix}"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  tags = var.common_tags
}

# Lifecycle policy to keep only latest 5 images
resource "aws_ecr_lifecycle_policy" "main" {
  repository = aws_ecr_repository.nginx_permitio.name
  
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1,
        description  = "Keep last 5 images",
        selection = {
          tagStatus     = "any",
          countType     = "imageCountMoreThan",
          countNumber   = 5
        },
        action = {
          type = "expire"
        }
      }
    ]
  })
}