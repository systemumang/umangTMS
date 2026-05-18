<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function fetchAllRows(mysqli $conn, string $table): array {
    $safe = preg_replace('/[^a-zA-Z0-9_]/', '', $table);
    $sql = "SELECT * FROM `{$safe}`";
    $result = $conn->query($sql);
    if (!$result) {
        return [];
    }
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    return $rows;
}

function sendJson(array $payload, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = isset($_GET['action']) ? (string)$_GET['action'] : '';
    if ($action !== 'init') {
        sendJson(['success' => false, 'error' => 'Invalid action.'], 400);
    }

    $users = array_map(static function(array $u): array {
        $isActiveRaw = strtolower((string)($u['isActive'] ?? '1'));
        $u['isActive'] = in_array($isActiveRaw, ['1', 'true', 'yes'], true) ? 'TRUE' : 'FALSE';
        return $u;
    }, fetchAllRows($conn, 'users'));

    $settingsRows = fetchAllRows($conn, 'app_settings');
    $settings = $settingsRows[0] ?? [
        'officeTokenId' => '',
        'officeTelegramGroupId' => '',
        'whatsappGroupId' => '',
        'masId' => '',
        'masPassword' => '',
        'metaAccessToken' => '',
        'metaPhoneNumberId' => '',
        'metaWabaId' => '',
        'metaVerifyToken' => ''
    ];

    sendJson([
        'success' => true,
        'data' => [
            'mainTasks' => fetchAllRows($conn, 'main_tasks'),
            'vendorTasks' => fetchAllRows($conn, 'vendor_tasks'),
            'users' => $users,
            'designations' => fetchAllRows($conn, 'designations'),
            'categories' => fetchAllRows($conn, 'categories'),
            'vendorCategories' => fetchAllRows($conn, 'vendor_categories'),
            'projects' => fetchAllRows($conn, 'projects'),
            'clients' => fetchAllRows($conn, 'clients'),
            'vendors' => fetchAllRows($conn, 'vendors'),
            'actionLogs' => fetchAllRows($conn, 'action_logs'),
            'recurringTasks' => fetchAllRows($conn, 'recurring_tasks'),
            'recurringActions' => fetchAllRows($conn, 'recurring_actions'),
            'settings' => $settings
        ]
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput ?: '{}', true);
    if (!is_array($payload)) {
        sendJson(['success' => false, 'error' => 'Invalid JSON payload.'], 400);
    }

    $action = isset($payload['action']) ? (string)$payload['action'] : '';
    $target = strtolower((string)($payload['target'] ?? ''));
    $data = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : [];

    // Map frontend target labels to SQL table names.
    $targetTableMap = [
        'users' => 'users'
    ];
    $table = $targetTableMap[$target] ?? '';

    if ($table === '') {
        sendJson(['success' => false, 'error' => 'Unsupported target for SQL write.'], 400);
    }

    if ($action === 'addMaster' && $table === 'users') {
        $name = trim((string)($data['name'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $mobile = trim((string)($data['mobile'] ?? ''));
        $role = trim((string)($data['role'] ?? 'Employee'));
        $designation = trim((string)($data['designation'] ?? ''));
        $password = (string)($data['password'] ?? '');
        $isActiveRaw = strtolower((string)($data['isActive'] ?? 'true'));
        $isActive = in_array($isActiveRaw, ['1', 'true', 'yes'], true) ? 1 : 0;

        if ($name === '' || $email === '' || $password === '') {
            sendJson(['success' => false, 'error' => 'Name, email and password are required.'], 400);
        }

        $stmt = $conn->prepare(
            "INSERT INTO users (name, email, mobile, role, designation, password, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        if (!$stmt) {
            sendJson(['success' => false, 'error' => 'Failed to prepare insert query.'], 500);
        }
        $stmt->bind_param('ssssssi', $name, $email, $mobile, $role, $designation, $password, $isActive);
        $ok = $stmt->execute();
        $insertId = (int)$stmt->insert_id;
        $stmt->close();

        if (!$ok) {
            sendJson(['success' => false, 'error' => 'Failed to insert user. Email may already exist.'], 400);
        }

        sendJson(['success' => true, 'data' => ['id' => $insertId]]);
    }

    if ($action === 'updateMaster' && $table === 'users') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            sendJson(['success' => false, 'error' => 'Invalid user id.'], 400);
        }

        $name = trim((string)($data['name'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $mobile = trim((string)($data['mobile'] ?? ''));
        $role = trim((string)($data['role'] ?? 'Employee'));
        $designation = trim((string)($data['designation'] ?? ''));
        $password = (string)($data['password'] ?? '');
        $isActiveRaw = strtolower((string)($data['isActive'] ?? 'true'));
        $isActive = in_array($isActiveRaw, ['1', 'true', 'yes'], true) ? 1 : 0;

        if ($password !== '') {
            $stmt = $conn->prepare(
                "UPDATE users SET name=?, email=?, mobile=?, role=?, designation=?, password=?, isActive=? WHERE id=?"
            );
            if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare update query.'], 500);
            $stmt->bind_param('ssssssii', $name, $email, $mobile, $role, $designation, $password, $isActive, $id);
        } else {
            $stmt = $conn->prepare(
                "UPDATE users SET name=?, email=?, mobile=?, role=?, designation=?, isActive=? WHERE id=?"
            );
            if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare update query.'], 500);
            $stmt->bind_param('sssssii', $name, $email, $mobile, $role, $designation, $isActive, $id);
        }

        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) {
            sendJson(['success' => false, 'error' => 'Failed to update user.'], 400);
        }
        sendJson(['success' => true]);
    }

    if ($action === 'deleteRecord' && $table === 'users') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            sendJson(['success' => false, 'error' => 'Invalid user id.'], 400);
        }
        $stmt = $conn->prepare("DELETE FROM users WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare delete query.'], 500);
        $stmt->bind_param('i', $id);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) {
            sendJson(['success' => false, 'error' => 'Failed to delete user.'], 400);
        }
        sendJson(['success' => true]);
    }

    sendJson(['success' => false, 'error' => 'Unsupported action.'], 400);
}

sendJson(['success' => false, 'error' => 'Method not allowed.'], 405);
