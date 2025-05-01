resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg-${var.name_suffix}"
  description = "Security group for the ALB"
  vpc_id      = var.vpc_id
  
  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-alb-sg-${var.name_suffix}"
    }
  )
}

resource "aws_security_group" "ecs" {
  name        = "${var.project_name}-${var.environment}-ecs-sg-${var.name_suffix}"
  description = "Security group for ECS services"
  vpc_id      = var.vpc_id
  
  ingress {
    description     = "Traffic from ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-ecs-sg-${var.name_suffix}"
    }
  )
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-${var.environment}-ecs-execution-role-${var.name_suffix}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Task - Modified to avoid conflicts
resource "aws_iam_role" "ecs_task_role" {
  # Adding a unique timestamp suffix to avoid name conflicts
  name = "${var.project_name}-${var.environment}-ecs-task-role-${var.name_suffix}-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  # Force replacement if role already exists
  lifecycle {
    create_before_destroy = true
  }
  
  tags = var.common_tags
}

# Enhanced policy for network access and permit.io local PDP sidecar
resource "aws_iam_policy" "pdp_sidecar_policy" {
  name        = "${var.project_name}-${var.environment}-pdp-sidecar-policy-${var.name_suffix}"
  description = "Policy for local PDP sidecar operations"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:CreateLogGroup"
        ],
        Effect   = "Allow",
        Resource = "*"
      }
    ]
  })
}

# Attach PDP sidecar policy to the task role
resource "aws_iam_role_policy_attachment" "ecs_task_role_pdp_sidecar" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.pdp_sidecar_policy.arn
}

# Policy for accessing AWS Secrets Manager
resource "aws_iam_policy" "secrets_access" {
  name        = "${var.project_name}-${var.environment}-secrets-access-${var.name_suffix}"
  description = "Policy for accessing secrets in AWS Secrets Manager"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
        ],
        Effect   = "Allow",
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_role_secrets" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.secrets_access.arn
}