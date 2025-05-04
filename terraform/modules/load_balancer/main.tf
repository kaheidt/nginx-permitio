resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb-${var.name_suffix}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.public_subnets
  
  enable_deletion_protection = false
  
  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-alb-${var.name_suffix}"
    }
  )
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

# Target group for the NGINX authorization gateway service
resource "aws_lb_target_group" "main" {
  name        = "${var.project_name}-${var.environment}-tg-${var.name_suffix}"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  
  health_check {
    enabled             = true
    interval            = 30
    path                = "/pdp-health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    matcher             = "200"
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-tg-${var.name_suffix}"
    }
  )
}