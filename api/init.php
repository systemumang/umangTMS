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
        'users' => 'users',
        'clients' => 'clients',
        'projects' => 'projects',
        'vendors' => 'vendors',
        'categories' => 'categories',
        'vendorcategories' => 'vendor_categories',
        'designations' => 'designations'
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

    if ($action === 'addMaster' && $table === 'clients') {
        $name = trim((string)($data['name'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $mobile = trim((string)($data['mobile'] ?? ''));
        $address = trim((string)($data['address'] ?? ''));
        $gstNumber = trim((string)($data['gSTNumber'] ?? $data['gstNumber'] ?? ''));
        if ($name === '') sendJson(['success' => false, 'error' => 'Client name is required.'], 400);

        $stmt = $conn->prepare("INSERT INTO clients (name, email, mobile, address, gstNumber) VALUES (?, ?, ?, ?, ?)");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare client insert.'], 500);
        $stmt->bind_param('sssss', $name, $email, $mobile, $address, $gstNumber);
        $ok = $stmt->execute();
        $insertId = (int)$stmt->insert_id;
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to add client.'], 400);
        sendJson(['success' => true, 'data' => ['id' => $insertId]]);
    }

    if ($action === 'addMaster' && $table === 'vendors') {
        $name = trim((string)($data['name'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $mobile = trim((string)($data['mobile'] ?? ''));
        $address = trim((string)($data['address'] ?? ''));
        $gstNumber = trim((string)($data['gSTNumber'] ?? $data['gstNumber'] ?? ''));
        if ($name === '') sendJson(['success' => false, 'error' => 'Vendor name is required.'], 400);

        $stmt = $conn->prepare("INSERT INTO vendors (name, email, mobile, address, gstNumber) VALUES (?, ?, ?, ?, ?)");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare vendor insert.'], 500);
        $stmt->bind_param('sssss', $name, $email, $mobile, $address, $gstNumber);
        $ok = $stmt->execute();
        $insertId = (int)$stmt->insert_id;
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to add vendor.'], 400);
        sendJson(['success' => true, 'data' => ['id' => $insertId]]);
    }

    if ($action === 'addMaster' && $table === 'projects') {
        $name = trim((string)($data['name'] ?? ''));
        $client = trim((string)($data['client'] ?? ''));
        $projectType = trim((string)($data['projectType'] ?? ''));
        $status = trim((string)($data['status'] ?? 'Active'));
        if ($name === '') sendJson(['success' => false, 'error' => 'Project name is required.'], 400);

        $stmt = $conn->prepare("INSERT INTO projects (name, client, projectType, status) VALUES (?, ?, ?, ?)");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare project insert.'], 500);
        $stmt->bind_param('ssss', $name, $client, $projectType, $status);
        $ok = $stmt->execute();
        $insertId = (int)$stmt->insert_id;
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to add project.'], 400);
        sendJson(['success' => true, 'data' => ['id' => $insertId]]);
    }

    if ($action === 'addMaster' && $table === 'categories') {
        $name = trim((string)($data['name'] ?? ''));
        $type = trim((string)($data['type'] ?? ''));
        if ($name === '') sendJson(['success' => false, 'error' => 'Category name is required.'], 400);
        $stmt = $conn->prepare("INSERT INTO categories (name, type) VALUES (?, ?)");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare category insert.'], 500);
        $stmt->bind_param('ss', $name, $type);
        $ok = $stmt->execute();
        $insertId = (int)$stmt->insert_id;
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to add category.'], 400);
        sendJson(['success' => true, 'data' => ['id' => $insertId]]);
    }

    if ($action === 'addMaster' && $table === 'vendor_categories') {
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') sendJson(['success' => false, 'error' => 'Vendor category name is required.'], 400);
        $stmt = $conn->prepare("INSERT INTO vendor_categories (name) VALUES (?)");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare vendor category insert.'], 500);
        $stmt->bind_param('s', $name);
        $ok = $stmt->execute();
        $insertId = (int)$stmt->insert_id;
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to add vendor category.'], 400);
        sendJson(['success' => true, 'data' => ['id' => $insertId]]);
    }

    if ($action === 'addMaster' && $table === 'designations') {
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') sendJson(['success' => false, 'error' => 'Designation name is required.'], 400);
        $stmt = $conn->prepare("INSERT INTO designations (name) VALUES (?)");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare designation insert.'], 500);
        $stmt->bind_param('s', $name);
        $ok = $stmt->execute();
        $insertId = (int)$stmt->insert_id;
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to add designation.'], 400);
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

    if ($action === 'updateMaster' && $table === 'clients') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid client id.'], 400);
        $name = trim((string)($data['name'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $mobile = trim((string)($data['mobile'] ?? ''));
        $address = trim((string)($data['address'] ?? ''));
        $gstNumber = trim((string)($data['gSTNumber'] ?? $data['gstNumber'] ?? ''));
        $stmt = $conn->prepare("UPDATE clients SET name=?, email=?, mobile=?, address=?, gstNumber=? WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare client update.'], 500);
        $stmt->bind_param('sssssi', $name, $email, $mobile, $address, $gstNumber, $id);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to update client.'], 400);
        sendJson(['success' => true]);
    }

    if ($action === 'updateMaster' && $table === 'vendors') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid vendor id.'], 400);
        $name = trim((string)($data['name'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $mobile = trim((string)($data['mobile'] ?? ''));
        $address = trim((string)($data['address'] ?? ''));
        $gstNumber = trim((string)($data['gSTNumber'] ?? $data['gstNumber'] ?? ''));
        $stmt = $conn->prepare("UPDATE vendors SET name=?, email=?, mobile=?, address=?, gstNumber=? WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare vendor update.'], 500);
        $stmt->bind_param('sssssi', $name, $email, $mobile, $address, $gstNumber, $id);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to update vendor.'], 400);
        sendJson(['success' => true]);
    }

    if ($action === 'updateMaster' && $table === 'projects') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid project id.'], 400);
        $name = trim((string)($data['name'] ?? ''));
        $client = trim((string)($data['client'] ?? ''));
        $projectType = trim((string)($data['projectType'] ?? ''));
        $status = trim((string)($data['status'] ?? 'Active'));
        $stmt = $conn->prepare("UPDATE projects SET name=?, client=?, projectType=?, status=? WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare project update.'], 500);
        $stmt->bind_param('ssssi', $name, $client, $projectType, $status, $id);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to update project.'], 400);
        sendJson(['success' => true]);
    }

    if ($action === 'updateMaster' && $table === 'categories') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid category id.'], 400);
        $name = trim((string)($data['name'] ?? ''));
        $type = trim((string)($data['type'] ?? ''));
        $stmt = $conn->prepare("UPDATE categories SET name=?, type=? WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare category update.'], 500);
        $stmt->bind_param('ssi', $name, $type, $id);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to update category.'], 400);
        sendJson(['success' => true]);
    }

    if ($action === 'updateMaster' && $table === 'vendor_categories') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid vendor category id.'], 400);
        $name = trim((string)($data['name'] ?? ''));
        $stmt = $conn->prepare("UPDATE vendor_categories SET name=? WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare vendor category update.'], 500);
        $stmt->bind_param('si', $name, $id);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to update vendor category.'], 400);
        sendJson(['success' => true]);
    }

    if ($action === 'updateMaster' && $table === 'designations') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid designation id.'], 400);
        $name = trim((string)($data['name'] ?? ''));
        $stmt = $conn->prepare("UPDATE designations SET name=? WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare designation update.'], 500);
        $stmt->bind_param('si', $name, $id);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to update designation.'], 400);
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

    if ($action === 'deleteRecord' && in_array($table, ['clients', 'projects', 'vendors', 'categories', 'vendor_categories', 'designations'], true)) {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid id.'], 400);
        $stmt = $conn->prepare("DELETE FROM `{$table}` WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare delete query.'], 500);
        $stmt->bind_param('i', $id);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to delete record.'], 400);
        sendJson(['success' => true]);
    }

    sendJson(['success' => false, 'error' => 'Unsupported action.'], 400);
}

sendJson(['success' => false, 'error' => 'Method not allowed.'], 405);
