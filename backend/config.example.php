<?php

// Database credentials
define('DB_HOST', 'localhost');
define('DB_NAME', 'YOUR_DB_NAME');
define('DB_USER', 'YOUR_DB_USER');
define('DB_PASS', 'YOUR_DB_PASSWORD');
define('DB_CHARSET', 'utf8mb4');

// Google reCAPTCHA v3 secret key (server-side only)
// Register at: https://www.google.com/recaptcha/admin
// Choose reCAPTCHA v3, add domains: jakubkwarcinski.pl and kwarc87.github.io
define('RECAPTCHA_SECRET', 'YOUR_RECAPTCHA_SECRET_KEY');
define('RECAPTCHA_MIN_SCORE', 0.5);

// Allowed origins (CORS)
define('ALLOWED_ORIGINS', [
    'https://jakubkwarcinski.pl',
    'https://kwarc87.github.io',
]);

// Rate limiting
define('RATE_LIMIT_MAX', 30);        // max submissions per window
define('RATE_LIMIT_WINDOW', 3600);   // window in seconds (1 hour)

// IP hashing salt (keep secret — prevents reverse-lookup of stored ip_hash values)
define('IP_HASH_SALT', 'YOUR_IP_HASH_SALT');
