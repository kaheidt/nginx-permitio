FROM nginx:mainline

# Install required dependencies for NGINX JavaScript
RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    ca-certificates \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install NGINX Plus repository key
RUN curl -sS https://nginx.org/keys/nginx_signing.key | apt-key add -

# Add NGINX JavaScript module repository
RUN echo "deb https://packages.nginx.org/njs/debian $(lsb_release -cs) nginx" \
    | tee /etc/apt/sources.list.d/nginx-njs.list

# Install NGINX JavaScript module
RUN apt-get update && apt-get install -y \
    nginx-module-njs \
    && rm -rf /var/lib/apt/lists/*

# Configure NGINX to use the JavaScript module
RUN echo "load_module modules/ngx_http_js_module.so;" > /etc/nginx/modules-enabled/ngx_http_js_module.conf

# Copy configuration files
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY conf.d/permit.js /etc/nginx/conf.d/permit.js

# Install NodeJS for the frontend demo
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]