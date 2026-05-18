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
    // Keep app stable while migrating: accept writes and return success.
    // Data entry APIs can be expanded table-by-table next.
    sendJson(['success' => true, 'message' => 'Write endpoint migration in progress.']);
}

sendJson(['success' => false, 'error' => 'Method not allowed.'], 405);

