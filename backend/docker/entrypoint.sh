#!/bin/sh
set -e

cd /var/www/html

# 1. Pastikan file .env ada
if [ ! -f ".env" ]; then
    if [ -f ".env.docker" ]; then
        echo "--> [Docker Entrypoint] Menggunakan .env.docker sebagai .env..."
        cp .env.docker .env
    elif [ -f ".env.example" ]; then
        echo "--> [Docker Entrypoint] Menggunakan .env.example sebagai .env..."
        cp .env.example .env
    fi
fi

# 2. Pastikan dependencies composer terpasang jika vendor kosong
if [ ! -f "vendor/autoload.php" ]; then
    echo "--> [Docker Entrypoint] Direktori vendor kosong, menjalankan composer install..."
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

# 3. Generate APP_KEY jika belum diset
if [ -f ".env" ]; then
    if ! grep -q "^APP_KEY=base64:" .env; then
        echo "--> [Docker Entrypoint] Mengenerate APP_KEY baru..."
        php artisan key:generate --force || true
    fi
fi

# 4. Menunggu database MySQL siap menerima koneksi
if [ -n "$DB_HOST" ]; then
    echo "--> [Docker Entrypoint] Menunggu database ($DB_HOST:${DB_PORT:-3306}) siap..."
    max_tries=35
    counter=0
    until php -r "
        \$host = getenv('DB_HOST');
        \$port = getenv('DB_PORT') ?: '3306';
        \$user = getenv('DB_USERNAME');
        \$pass = getenv('DB_PASSWORD');
        \$dbname = getenv('DB_DATABASE');
        try {
            new PDO(\"mysql:host=\$host;port=\$port;dbname=\$dbname\", \$user, \$pass);
            exit(0);
        } catch (Exception \$e) {
            exit(1);
        }
    " 2>/dev/null; do
        counter=$((counter + 1))
        if [ $counter -gt $max_tries ]; then
            echo "--> [Docker Entrypoint] PERINGATAN: Koneksi database timeout. Melewati migrasi otomatis."
            break
        fi
        echo "--> [Docker Entrypoint] Database belum siap, mencoba lagi ($counter/$max_tries)..."
        sleep 2
    done

    if [ $counter -le $max_tries ]; then
        echo "--> [Docker Entrypoint] Database berhasil terhubung!"
        
        # Jalankan migrasi tabel
        echo "--> [Docker Entrypoint] Menjalankan migrasi database..."
        php artisan migrate --force || true

        # Jalankan database seeder jika diset RUN_SEEDER=true
        if [ "$RUN_SEEDER" = "true" ]; then
            echo "--> [Docker Entrypoint] RUN_SEEDER=true: Menjalankan database seeder..."
            php artisan db:seed --force || true
        fi
    fi
fi

# 5. Symlink storage dan bersihkan cache
echo "--> [Docker Entrypoint] Menghubungkan storage dan membersihkan cache..."
php artisan storage:link || true
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

# 6. Set permission direktori storage dan bootstrap/cache
echo "--> [Docker Entrypoint] Menyesuaikan hak akses direktori storage dan cache..."
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache || true
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache || true

echo "--> [Docker Entrypoint] Backend SIM RS siap! Menjalankan layanan web server..."
exec "$@"