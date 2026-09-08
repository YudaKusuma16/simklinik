#!/bin/sh
set -e

cd /var/www/html

if [ ! -d "vendor" ]; then
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

if [ -f ".env" ]; then
    php artisan key:generate --force || true
    php artisan config:clear || true
    php artisan cache:clear || true
    php artisan route:clear || true
    php artisan view:clear || true
    php artisan storage:link || true
fi

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache || true

exec apache2-foreground