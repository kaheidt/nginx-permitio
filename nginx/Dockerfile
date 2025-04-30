FROM nginx:mainline

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy NGINX configuration
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# Copy Permit.io JavaScript file
COPY conf.d/permit.js /etc/nginx/conf.d/permit.js

# Load the JavaScript module in the main NGINX configuration
RUN sed -i '1s/^/load_module modules\/ngx_http_js_module.so;\n/' /etc/nginx/nginx.conf

# Expose ports
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]