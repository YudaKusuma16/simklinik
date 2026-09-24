# syntax=docker/dockerfile:1

FROM php:8.4-apache

# Set metadata
LABEL maintainer="SIM RS Team"
LABEL description="Backend SIM RS (Laravel 13 + PHP 8.4 Apache)"

# Install package dependencies sistem Linux
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    unzip \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libwebp-dev \
    libicu-dev \
    default-mysql-client \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-configure intl \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Aktifkan Apache mod_rewrite dan headers untuk routing Laravel
RUN a2enmod rewrite headers

# Pasang Composer v2 dari image resmi
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory di Apache DocumentRoot
WORKDIR /var/www/html

# Salin konfigurasi Apache VirtualHost dan PHP custom
COPY docker/apache/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php/custom.ini /usr/local/etc/php/conf.d/custom.ini

# Salin file composer terlebih dahulu untuk memanfaatkan Docker layer cache
COPY composer.json composer.lock ./

# Install dependensi PHP jika composer.lock ada
RUN composer install --no-interaction --no-scripts --no-autoloader --prefer-dist || true

# Salin seluruh source code backend
COPY . .

# Generate autoload teroptimasi
RUN composer dump-autoload --optimize || true

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

RUN mkdir -p storage/framework/cache/data \
             storage/framework/sessions \
             storage/framework/views \
             storage/logs \
             bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["apache2-foreground"]
