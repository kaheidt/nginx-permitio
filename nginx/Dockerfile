FROM nginx:mainline

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# Copy Permit.io JavaScript file
COPY conf.d/permit.js /etc/nginx/conf.d/permit.js

# Expose ports
EXPOSE 80

# Start NGINX with environment variables available
CMD ["nginx", "-g", "daemon off;"]