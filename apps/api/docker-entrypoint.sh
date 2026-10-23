#!/bin/sh
set -e

cd /var/www/html

# Install dependencies if vendor does not exist or is incomplete
if [ ! -f "vendor/autoload.php" ]; then
    echo "Installing Composer dependencies (vendor/autoload.php not found)..."
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

# Ensure storage directories exist and have proper permissions
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chmod -R 777 storage bootstrap/cache

# Wait for PostgreSQL database to be ready
echo "Waiting for PostgreSQL database at ${DB_HOST:-database}:${DB_PORT:-5432}..."
until nc -z -v -w3 "${DB_HOST:-database}" "${DB_PORT:-5432}"; do
  echo "Database is unavailable - sleeping 1s"
  sleep 1
done
echo "PostgreSQL is ready!"

# Wait for Redis
echo "Waiting for Redis at ${REDIS_HOST:-redis}:${REDIS_PORT:-6379}..."
until nc -z -v -w3 "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}"; do
  echo "Redis is unavailable - sleeping 1s"
  sleep 1
done
echo "Redis is ready!"

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force || true

export PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-8}"

echo "Starting Laravel application with ${PHP_CLI_SERVER_WORKERS} workers on port 8000..."
exec php artisan serve --host=0.0.0.0 --port=8000

