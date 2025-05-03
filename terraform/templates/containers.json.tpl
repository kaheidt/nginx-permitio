[
  {
    "name": "nginx",
    "image": "${ecr_repository_url}:latest",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 8080,
        "hostPort": 8080,
        "protocol": "tcp"
      }
    ],
    "healthCheck": {
      "command": [
        "CMD-SHELL",
        "curl -f http://localhost:8080/pdp-health || exit 1"
      ],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    },
    "environment": [
      {
        "name": "PERMIT_LOCAL_PDP_URL",
        "value": "http://localhost:7766"
      },
      {
        "name": "PERMIT_ENVIRONMENT",
        "value": "${environment}"
      }
    ],
    "secrets": [
      {
        "name": "PERMIT_API_KEY",
        "valueFrom": "${secrets_arn}:PERMIT_API_KEY::"
      },
      {
        "name": "AUTH_SECRET",
        "valueFrom": "${secrets_arn}:AUTH_SECRET::"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${log_group}",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "nginx"
      }
    },
    "dependsOn": [
      {
        "containerName": "pdp-sidecar",
        "condition": "START"
      }
    ]
  },
  {
    "name": "pdp-sidecar",
    "image": "permitio/pdp-v2:latest",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 7766,
        "hostPort": 7766,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "PDP_LISTENER_URL",
        "value": "0.0.0.0:7766"
      },
      {
        "name": "PERMIT_ENVIRONMENT",
        "value": "${environment}"
      }
    ],
    "secrets": [
      {
        "name": "PDP_API_KEY",
        "valueFrom": "${secrets_arn}:PERMIT_API_KEY::"
      }
    ],
    "healthCheck": {
      "command": [
        "CMD-SHELL",
        "curl -f http://localhost:7766/health || exit 1"
      ],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    },
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${log_group}",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "pdp-sidecar"
      }
    }
  },
  {
    "name": "api",
    "image": "${ecr_repository_url}:api",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 3000,
        "hostPort": 3000,
        "protocol": "tcp"
      }
    ],
    "healthCheck": {
      "command": [
        "CMD-SHELL",
        "curl -f http://localhost:3000/health || exit 1"
      ],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    },
    "environment": [
      {
        "name": "PORT",
        "value": "3000"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${log_group}",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "api"
      }
    }
  },
  {
    "name": "auth",
    "image": "${ecr_repository_url}:auth",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 4000,
        "hostPort": 4000,
        "protocol": "tcp"
      }
    ],
    "healthCheck": {
      "command": [
        "CMD-SHELL",
        "curl -f http://localhost:4000/health || exit 1"
      ],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    },
    "environment": [
      {
        "name": "PORT",
        "value": "4000"
      },
      {
        "name": "PERMIT_LOCAL_PDP_URL",
        "value": "http://localhost:7766"
      },
      {
        "name": "PERMIT_ENVIRONMENT",
        "value": "${environment}"
      }
    ],
    "secrets": [
      {
        "name": "AUTH_SECRET",
        "valueFrom": "${secrets_arn}:AUTH_SECRET::"
      },
      {
        "name": "PERMIT_API_KEY",
        "valueFrom": "${secrets_arn}:PERMIT_API_KEY::"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${log_group}",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "auth"
      }
    },
    "dependsOn": [
      {
        "containerName": "pdp-sidecar",
        "condition": "START"
      }
    ]
  }
]