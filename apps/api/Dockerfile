FROM php:8.3-cli-alpine

# Install system dependencies and build libraries
# Note: linux-headers is required for compiling sockets extension on Alpine
RUN apk add --no-cache \
    curl \
    git \
    libpq-dev \
    libzip-dev \
    zip \
    unzip \
    netcat-openbsd \
    linux-headers \
    $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_pgsql pcntl bcmath sockets \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

# Install Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy application files from repository root context
COPY apps/api .

# Copy custom php.ini configuration
COPY docker/php/local.ini /usr/local/etc/php/conf.d/local.ini

# Fix potential Windows CRLF line endings and set permissions
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/var/www/html/docker-entrypoint.sh"]
