[
  {
    "name": "nginx",
    "image": "${ecr_repository_url}:latest",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 80,
        "hostPort": 80,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "LOCAL_PERMIT_PDP_URL",
        "value": "http://127.0.0.1:7000"
      },
      {
        "name": "LOCAL_VEHICLE_TELEMETRY_SERVICE_URL",
        "value": "http://127.0.0.1:3001"
      },
      {
        "name": "LOCAL_MAINTENANCE_SERVICE_URL",
        "value": "http://127.0.0.1:3002"
      },
      {
        "name": "LOCAL_FLEET_MANAGEMENT_SERVICE_URL",
        "value": "http://127.0.0.1:3003"
      },
      {
        "name": "LOCAL_DRIVER_ANALYTICS_SERVICE_URL",
        "value": "http://127.0.0.1:3004"
      },
      {
        "name": "LOCAL_AUTH_SERVICE_URL",
        "value": "http://127.0.0.1:3000"
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
        "containerPort": 7000,
        "hostPort": 7000,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "PDP_LISTENER_URL",
        "value": "0.0.0.0:7000"
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
    "name": "vehicle-telemetry",
    "image": "${ecr_repository_url}:api",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 3000,
        "hostPort": 3000,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "PORT",
        "value": "3000"
      },
      {
        "name": "SERVICE_NAME",
        "value": "vehicle-telemetry"
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
    "name": "vehicle-telemetry",
    "image": "${ecr_repository_url}:api",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 3001,
        "hostPort": 3001,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "PORT",
        "value": "3001"
      },
      {
        "name": "SERVICE_NAME",
        "value": "vehicle-telemetry"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${log_group}",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "vehicle-telemetry"
      }
    }
  },
  {
    "name": "maintenance-service",
    "image": "${ecr_repository_url}:api",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 3002,
        "hostPort": 3002,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "PORT",
        "value": "3002"
      },
      {
        "name": "SERVICE_NAME",
        "value": "maintenance-service"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${log_group}",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "maintenance-service"
      }
    }
  },
  {
    "name": "fleet-management",
    "image": "${ecr_repository_url}:api",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 3003,
        "hostPort": 3003,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "PORT",
        "value": "3003"
      },
      {
        "name": "SERVICE_NAME",
        "value": "fleet-management"
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
    "name": "driver-analytics",
    "image": "${ecr_repository_url}:api",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 3004,
        "hostPort": 3004,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "PORT",
        "value": "3004"
      },
      {
        "name": "SERVICE_NAME",
        "value": "driver-analytics"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${log_group}",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "driver-analytics"
      }
    }
  }, 
  {
    "name": "auth",
    "image": "${ecr_repository_url}:auth",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 3000,
        "hostPort": 3000,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "PORT",
        "value": "3000"
      },
      {
        "name": "LOCAL_PERMIT_PDP_URL",
        "value": "http://127.0.0.1:7000"
      },
      {
        "name": "PERMIT_ENVIRONMENT",
        "value": "${environment}"
      },
      {
        "name": "AUTH_ISSUER",
        "value": "auto-secure-api-gateway"
      },
      {
        "name": "AUTH_AUDIENCE",
        "value": "auto-secure-services"
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