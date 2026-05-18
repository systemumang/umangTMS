<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

$setupKey = 'OfficeSetup2026';
$providedKey = isset($_GET['key']) ? (string)$_GET['key'] : '';

if ($providedKey !== $setupKey) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Invalid setup key.']);
    exit;
}

$createUsersSql = "
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'Admin',
  password VARCHAR(255) NOT NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

if (!$conn->query($createUsersSql)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to create users table.']);
    exit;
}

$email = 'bizskill17@gmail.com';
$plainPassword = '!Office1@';
$name = 'Admin';
$role = 'Admin';
$isActive = 1;

$checkStmt = $conn->prepare("SELECT id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1");
if (!$checkStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to prepare user check query.']);
    exit;
}
$checkStmt->bind_param('s', $email);
$checkStmt->execute();
$result = $checkStmt->get_result();
$existing = $result ? $result->fetch_assoc() : null;
$checkStmt->close();

if (!$existing) {
    $insertStmt = $conn->prepare("INSERT INTO users (name, email, role, password, isActive) VALUES (?, ?, ?, ?, ?)");
    if (!$insertStmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to prepare user insert query.']);
        exit;
    }
    $insertStmt->bind_param('ssssi', $name, $email, $role, $plainPassword, $isActive);
    $insertStmt->execute();
    $insertStmt->close();
}

echo json_encode([
    'success' => true,
    'message' => 'Setup complete.',
    'login' => [
        'email' => $email,
        'password' => $plainPassword
    ]
]);

