<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput ?: '{}', true);

$email = isset($input['email']) ? trim((string)$input['email']) : '';
$password = isset($input['password']) ? (string)$input['password'] : '';

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
    exit;
}

$sql = "SELECT id, name, email, role, password, isActive FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server query error.']);
    exit;
}

$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();
$user = $result ? $result->fetch_assoc() : null;
$stmt->close();

if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Incorrect Email or Password.']);
    exit;
}

$isPasswordMatch = $user['password'] === $password || password_verify($password, (string)$user['password']);
if (!$isPasswordMatch) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Incorrect Email or Password.']);
    exit;
}

$isActiveRaw = strtolower((string)($user['isActive'] ?? 'true'));
$isActive = in_array($isActiveRaw, ['1', 'true', 'yes'], true);
if (!$isActive) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'User is inactive.']);
    exit;
}

unset($user['password']);

echo json_encode([
    'success' => true,
    'user' => [
        'id' => (int)$user['id'],
        'name' => (string)($user['name'] ?? ''),
        'email' => (string)$user['email'],
        'role' => (string)($user['role'] ?? 'Employee'),
        'isActive' => true
    ]
]);

