<?php

require_once __DIR__ . '/config.php';

// ─── CORS ───────────────────────────────────────────────────────────────────

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '') {
    $originHost = parse_url($origin, PHP_URL_SCHEME) . '://' . parse_url($origin, PHP_URL_HOST);
    if (in_array($originHost, ALLOWED_ORIGINS, true)) {
        header('Access-Control-Allow-Origin: ' . $originHost);
        header('Vary: Origin');
    } else {
        http_response_code(403);
        exit;
    }
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── DB connection ───────────────────────────────────────────────────────────

function getDb(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function ipHash(): string {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    $ip = trim(explode(',', $ip)[0]);
    return hash('sha256', $ip . IP_HASH_SALT);
}

function verifyRecaptcha(string $token): bool {
    // If no secret configured yet, skip verification (development mode)
    if (RECAPTCHA_SECRET === 'TWOJ_RECAPTCHA_SECRET_KEY') {
        return true;
    }
    $response = file_get_contents('https://www.google.com/recaptcha/api/siteverify', false,
        stream_context_create(['http' => [
            'method'  => 'POST',
            'header'  => 'Content-Type: application/x-www-form-urlencoded',
            'content' => http_build_query([
                'secret'   => RECAPTCHA_SECRET,
                'response' => $token,
                'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]),
            'timeout' => 5,
        ]])
    );
    if ($response === false) {
        return false;
    }
    $data = json_decode($response, true);
    return isset($data['success'], $data['score'])
        && $data['success'] === true
        && $data['score'] >= RECAPTCHA_MIN_SCORE;
}

function checkRateLimit(PDO $pdo, string $ipHash): bool {
    $windowStart = date('Y-m-d H:i:s', time() - RATE_LIMIT_WINDOW);
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM scores WHERE ip_hash = ? AND date > ?'
    );
    $stmt->execute([$ipHash, $windowStart]);
    return (int) $stmt->fetchColumn() < RATE_LIMIT_MAX;
}

// ─── GET — top scores ────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = getDb()->query(
            'SELECT nickname, DATE_FORMAT(date, "%Y-%m-%d") AS date,
                    score, max_score, percent_score
             FROM scores
             ORDER BY percent_score DESC, score DESC
             LIMIT 20'
        );
        jsonResponse(200, ['scores' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        jsonResponse(500, ['error' => 'Błąd serwera.']);
    }
}

// ─── POST — save score ───────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);

    if (!is_array($body)) {
        jsonResponse(400, ['error' => 'Nieprawidłowe dane wejściowe.']);
    }

    // reCAPTCHA
    $token = isset($body['recaptchaToken']) ? trim((string) $body['recaptchaToken']) : '';
    if ($token === '' || !verifyRecaptcha($token)) {
        jsonResponse(403, ['error' => 'Weryfikacja reCAPTCHA nie powiodła się.']);
    }

    // Validate nickname
    $nickname = isset($body['nickname']) ? trim((string) $body['nickname']) : '';
    if ($nickname === '' || mb_strlen($nickname) > 30) {
        jsonResponse(400, ['error' => 'Nick musi mieć od 1 do 30 znaków.']);
    }

    // Validate score
    $score    = isset($body['score'])     ? filter_var($body['score'],     FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]) : false;
    $maxScore = isset($body['max_score']) ? filter_var($body['max_score'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) : false;

    if ($score === false || $maxScore === false) {
        jsonResponse(400, ['error' => 'Nieprawidłowe wartości punktów.']);
    }

    if ($score > $maxScore) {
        jsonResponse(400, ['error' => 'Wynik nie może przekraczać maksymalnego wyniku.']);
    }

    $percentScore = (int) round(($score / $maxScore) * 100);

    // Rate limiting
    $hash = ipHash();
    try {
        $pdo = getDb();
        if (!checkRateLimit($pdo, $hash)) {
            jsonResponse(429, ['error' => 'Zbyt wiele zapisów. Spróbuj ponownie za jakiś czas.']);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO scores (nickname, date, score, max_score, percent_score, ip_hash)
             VALUES (?, NOW(), ?, ?, ?, ?)'
        );
        $stmt->execute([$nickname, $score, $maxScore, $percentScore, $hash]);

        jsonResponse(200, ['message' => 'Wynik zapisany pomyślnie.']);
    } catch (PDOException $e) {
        jsonResponse(500, ['error' => 'Błąd serwera.']);
    }
}

http_response_code(405);
echo json_encode(['error' => 'Metoda niedozwolona.']);
