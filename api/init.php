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

function normalizeNumericGoal($raw): string {
    if ($raw === null) return '';
    $value = trim((string)$raw);
    if ($value === '') return '';
    if (!is_numeric($value)) return '';
    return (string)(0 + $value);
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
            'firms' => fetchAllRows($conn, 'firms'),
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
        'firms' => 'firms',
        'vendors' => 'vendors',
        'categories' => 'categories',
        'vendorcategories' => 'vendor_categories',
        'designations' => 'designations',
        'maintasks' => 'main_tasks',
        'vendortasks' => 'vendor_tasks',
        'maintaskactionlog' => 'action_logs',
        'vendortaskactionlog' => 'action_logs',
        'recurringtasks' => 'recurring_tasks',
        'recurringactions' => 'recurring_actions'
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

    if ($action === 'addTask' && in_array($table, ['main_tasks', 'vendor_tasks'], true)) {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            $id = (int)round(microtime(true) * 1000);
        }
        $date = (string)($data['date'] ?? '');
        $title = trim((string)($data['title'] ?? $data['task'] ?? ''));
        $description = (string)($data['notes'] ?? $data['description'] ?? '');
        $project = (string)($data['project'] ?? '');
        $firm = (string)($data['firm'] ?? '');
        $category = (string)($data['category'] ?? '');
        $owner = (string)($data['owner'] ?? '');
        $assignees = (string)($data['assignees'] ?? '');
        $client = (string)($data['clientName'] ?? $data['client'] ?? '');
        $priority = (string)($data['priority'] ?? 'Medium');
        $status = (string)($data['status'] ?? 'Not Yet Started');
        $dueDate = (string)($data['due Date'] ?? $data['dueDate'] ?? '');
        $lastUpdateDate = (string)($data['lastUpdateDate'] ?? $data['last Update'] ?? '');
        $lastUpdateRemarks = (string)($data['remark'] ?? $data['lastUpdateRemarks'] ?? '');
        $hours = (float)($data['hours'] ?? 0);
        $time = (string)($data['time'] ?? '');
        $goal = normalizeNumericGoal($data['goal'] ?? '');
        $photos = (string)($data['photos'] ?? '');
        $pdf = (string)($data['pdf'] ?? '');
        $vendor = (string)($data['vendor'] ?? '');
        $vendorCategory = (string)($data['vendorCategory'] ?? '');

        if ($title === '') {
            sendJson(['success' => false, 'error' => 'Task title is required.'], 400);
        }

        if ($table === 'main_tasks') {
            $stmt = $conn->prepare("INSERT INTO main_tasks (id, date, title, description, project, firm, category, owner, assignees, client, priority, status, dueDate, lastUpdateDate, lastUpdateRemarks, hours, time, goal, photos, pdf) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare main task insert.'], 500);
            $stmt->bind_param('issssssssssssssdssss', $id, $date, $title, $description, $project, $firm, $category, $owner, $assignees, $client, $priority, $status, $dueDate, $lastUpdateDate, $lastUpdateRemarks, $hours, $time, $goal, $photos, $pdf);
        } else {
            $stmt = $conn->prepare("INSERT INTO vendor_tasks (id, date, title, description, project, firm, category, owner, assignees, vendor, vendorCategory, priority, status, dueDate, lastUpdateDate, lastUpdateRemarks, hours, time, goal, photos, pdf) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare vendor task insert.'], 500);
            $stmt->bind_param('issssssssssssssssdssss', $id, $date, $title, $description, $project, $firm, $category, $owner, $assignees, $vendor, $vendorCategory, $priority, $status, $dueDate, $lastUpdateDate, $lastUpdateRemarks, $hours, $time, $goal, $photos, $pdf);
        }

        $ok = $stmt->execute();
        $stmtError = $stmt->error;
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to add task: ' . $stmtError], 400);
        sendJson(['success' => true, 'data' => ['id' => $id]]);
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

    if ($action === 'addMaster' && $table === 'firms') {
        $name = trim((string)($data['name'] ?? ''));
        $sortName = trim((string)($data['sortName'] ?? $data['sortname'] ?? ''));
        if ($name === '') sendJson(['success' => false, 'error' => 'Firm name is required.'], 400);
        if ($sortName === '') sendJson(['success' => false, 'error' => 'Sort Name is required.'], 400);
        $stmt = $conn->prepare("INSERT INTO firms (name, sortName) VALUES (?, ?)");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare firm insert.'], 500);
        $stmt->bind_param('ss', $name, $sortName);
        $ok = $stmt->execute();
        $insertId = (int)$stmt->insert_id;
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to add firm.'], 400);
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

    if ($action === 'addMaster' && $table === 'recurring_tasks') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            $id = (int)round(microtime(true) * 1000);
        }

        $title = trim((string)($data['title'] ?? ''));
        $firm = trim((string)($data['firm'] ?? ''));
        $category = trim((string)($data['category'] ?? ''));
        $assignee = trim((string)($data['assignee'] ?? ''));
        $frequencyType = trim((string)($data['frequencyType'] ?? $data['periodicity'] ?? 'Fixed Days'));
        $frequencyDays = (int)($data['frequencyDays'] ?? 0);
        $startDate = trim((string)($data['startDate'] ?? ''));
        $time = trim((string)($data['time'] ?? ''));
        $goal = normalizeNumericGoal($data['goal'] ?? '');
        $status = trim((string)($data['status'] ?? 'Not Yet Started'));

        if ($title === '') sendJson(['success' => false, 'error' => 'Recurring task title is required.'], 400);

        $stmt = $conn->prepare("INSERT INTO recurring_tasks (id, title, firm, category, assignee, frequencyType, frequencyDays, startDate, time, goal, status, lastUpdatedOn, lastUpdateRemarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '')");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare recurring task insert.'], 500);
        $idStr = (string)$id;
        $stmt->bind_param('ssssssissss', $idStr, $title, $firm, $category, $assignee, $frequencyType, $frequencyDays, $startDate, $time, $goal, $status);
        $ok = $stmt->execute();
        $stmtError = $stmt->error;
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to add recurring task: ' . $stmtError], 400);
        sendJson(['success' => true, 'data' => ['id' => $id]]);
    }

    if ($action === 'addMaster' && $table === 'recurring_actions') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            $id = (int)round(microtime(true) * 1000);
        }

        $taskId = (int)($data['taskId'] ?? $data['taskID'] ?? 0);
        $taskTitle = trim((string)($data['taskTitle'] ?? ''));
        $firm = trim((string)($data['firm'] ?? ''));
        $category = trim((string)($data['category'] ?? ''));
        $assignee = trim((string)($data['assignee'] ?? ''));
        $status = trim((string)($data['status'] ?? ''));
        $remarks = trim((string)($data['remarks'] ?? ''));
        $goal = normalizeNumericGoal($data['goal'] ?? '');
        $photos = (string)($data['photos'] ?? '');
        $pdf = (string)($data['pdf'] ?? '');
        $updatedOn = trim((string)($data['updatedOn'] ?? ''));
        $timestamp = trim((string)($data['timestamp'] ?? ''));

        if ($taskId <= 0) sendJson(['success' => false, 'error' => 'Invalid recurring task id.'], 400);

        $stmt = $conn->prepare("INSERT INTO recurring_actions (id, taskId, taskTitle, firm, category, assignee, status, remarks, goal, photos, pdf, updatedOn, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare recurring action insert.'], 500);
        $idStr = (string)$id;
        $taskIdStr = (string)$taskId;
        $stmt->bind_param('sssssssssssss', $idStr, $taskIdStr, $taskTitle, $firm, $category, $assignee, $status, $remarks, $goal, $photos, $pdf, $updatedOn, $timestamp);
        $ok = $stmt->execute();
        $stmtError = $stmt->error;
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to add recurring action: ' . $stmtError], 400);
        sendJson(['success' => true, 'data' => ['id' => $id]]);
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

	    if ($action === 'updateTask' && in_array($table, ['main_tasks', 'vendor_tasks'], true)) {
	        $id = (int)($data['id'] ?? 0);
	        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid task id.'], 400);

	        // Preserve the original (master) attachments on the task record.
	        // Updates to goal/photos/pdf should be stored only in action_logs.
	        $existingStmt = $conn->prepare("SELECT goal, photos, pdf FROM `{$table}` WHERE id=? LIMIT 1");
	        if (!$existingStmt) sendJson(['success' => false, 'error' => 'Failed to prepare task lookup.'], 500);
	        $existingStmt->bind_param('i', $id);
	        $existingStmt->execute();
	        $existingRes = $existingStmt->get_result();
	        $existingRow = $existingRes ? $existingRes->fetch_assoc() : null;
	        $existingStmt->close();
	        if (!$existingRow) sendJson(['success' => false, 'error' => 'Task not found.'], 404);

	        $title = trim((string)($data['title'] ?? $data['task'] ?? ''));
	        $description = (string)($data['notes'] ?? $data['description'] ?? '');
        $project = (string)($data['project'] ?? '');
        $firm = (string)($data['firm'] ?? '');
        $category = (string)($data['category'] ?? '');
	        $owner = (string)($data['owner'] ?? '');
	        $assignees = (string)($data['assignees'] ?? '');
	        $priority = (string)($data['priority'] ?? 'Medium');
	        $status = (string)($data['status'] ?? 'Not Yet Started');
	        $dueDate = (string)($data['due Date'] ?? $data['dueDate'] ?? '');
	        $lastUpdateDate = (string)($data['lastUpdateDate'] ?? $data['last Update'] ?? '');
	        $lastUpdateRemarks = (string)($data['remark'] ?? $data['lastUpdateRemarks'] ?? '');
	        $hours = (float)($data['hours'] ?? 0);
	        $time = (string)($data['time'] ?? '');
	        $logGoal = normalizeNumericGoal($data['goal'] ?? '');
	        $logPhotos = (string)($data['photos'] ?? '');
	        $logPdf = (string)($data['pdf'] ?? '');
	        $goal = normalizeNumericGoal($existingRow['goal'] ?? '');
	        $photos = (string)($existingRow['photos'] ?? '');
	        $pdf = (string)($existingRow['pdf'] ?? '');
	        $taskDate = (string)($data['taskDate'] ?? $data['date'] ?? '');
	        $client = (string)($data['clientName'] ?? $data['client'] ?? '');
	        $vendor = (string)($data['vendor'] ?? '');
	        $vendorCategory = (string)($data['vendorCategory'] ?? '');
	        $skipLogRaw = strtolower((string)($data['skipLog'] ?? 'false'));
	        $skipLog = in_array($skipLogRaw, ['1', 'true', 'yes'], true);

        if ($table === 'main_tasks') {
            $stmt = $conn->prepare("UPDATE main_tasks SET title=?, description=?, project=?, firm=?, category=?, owner=?, assignees=?, client=?, priority=?, status=?, dueDate=?, lastUpdateDate=?, lastUpdateRemarks=?, hours=?, time=?, goal=?, photos=?, pdf=? WHERE id=?");
            if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare main task update.'], 500);
            $stmt->bind_param('sssssssssssssdssssi', $title, $description, $project, $firm, $category, $owner, $assignees, $client, $priority, $status, $dueDate, $lastUpdateDate, $lastUpdateRemarks, $hours, $time, $goal, $photos, $pdf, $id);
        } else {
            $stmt = $conn->prepare("UPDATE vendor_tasks SET title=?, description=?, project=?, firm=?, category=?, owner=?, assignees=?, vendor=?, vendorCategory=?, priority=?, status=?, dueDate=?, lastUpdateDate=?, lastUpdateRemarks=?, hours=?, time=?, goal=?, photos=?, pdf=? WHERE id=?");
            if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare vendor task update.'], 500);
            $stmt->bind_param('ssssssssssssssdssssi', $title, $description, $project, $firm, $category, $owner, $assignees, $vendor, $vendorCategory, $priority, $status, $dueDate, $lastUpdateDate, $lastUpdateRemarks, $hours, $time, $goal, $photos, $pdf, $id);
        }

        $ok = $stmt->execute();
        $stmt->close();
	        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to update task.'], 400);

	        if (!$skipLog && ($lastUpdateRemarks !== '' || $status !== 'Not Yet Started' || $hours > 0 || $logGoal !== '' || $logPhotos !== '' || $logPdf !== '')) {
	            $logId = (int)round(microtime(true) * 1000);
	            $updatedOn = '';
	            $timestamp = '';
	            if ($lastUpdateDate !== '') {
	                $dateTime = explode(' ', $lastUpdateDate, 2);
	                $updatedOn = $dateTime[0] ?? '';
	                $timestamp = $dateTime[1] ?? '';
	            }

            $logStmt = $conn->prepare("INSERT INTO action_logs (id, taskId, taskTitle, taskDate, updateDate, project, firm, client, category, owner, assignees, vendor, status, remarks, hours, time, goal, photos, pdf, updatedOn, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if (!$logStmt) sendJson(['success' => false, 'error' => 'Failed to prepare action log insert.'], 500);
            $logStmt->bind_param('iissssssssssssdssssss', $logId, $id, $title, $taskDate, $lastUpdateDate, $project, $firm, $client, $category, $owner, $assignees, $vendor, $status, $lastUpdateRemarks, $hours, $time, $logGoal, $logPhotos, $logPdf, $updatedOn, $timestamp);
	            $logOk = $logStmt->execute();
	            $logError = $logStmt->error;
	            $logStmt->close();
	            if (!$logOk) sendJson(['success' => false, 'error' => 'Failed to add action log: ' . $logError], 400);
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

    if ($action === 'updateMaster' && $table === 'firms') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid firm id.'], 400);
        $name = trim((string)($data['name'] ?? ''));
        $sortName = trim((string)($data['sortName'] ?? $data['sortname'] ?? ''));
        if ($sortName === '') sendJson(['success' => false, 'error' => 'Sort Name is required.'], 400);
        $stmt = $conn->prepare("UPDATE firms SET name=?, sortName=? WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare firm update.'], 500);
        $stmt->bind_param('ssi', $name, $sortName, $id);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to update firm.'], 400);
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

    if ($action === 'updateMaster' && $table === 'recurring_tasks') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid recurring task id.'], 400);

        $stmt = $conn->prepare("SELECT * FROM recurring_tasks WHERE id=? LIMIT 1");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare recurring task lookup.'], 500);
        $idStr = (string)$id;
        $stmt->bind_param('s', $idStr);
        $stmt->execute();
        $existing = $stmt->get_result();
        $row = $existing ? $existing->fetch_assoc() : null;
        $stmt->close();
        if (!$row) sendJson(['success' => false, 'error' => 'Recurring task not found.'], 404);

        $title = array_key_exists('title', $data) ? trim((string)$data['title']) : (string)($row['title'] ?? '');
        $firm = array_key_exists('firm', $data) ? trim((string)$data['firm']) : (string)($row['firm'] ?? '');
        $category = array_key_exists('category', $data) ? trim((string)$data['category']) : (string)($row['category'] ?? '');
        $assignee = array_key_exists('assignee', $data) ? trim((string)$data['assignee']) : (string)($row['assignee'] ?? '');
        $frequencyType = array_key_exists('frequencyType', $data) || array_key_exists('periodicity', $data)
            ? trim((string)($data['frequencyType'] ?? $data['periodicity'] ?? 'Fixed Days'))
            : (string)($row['frequencyType'] ?? 'Fixed Days');
        $frequencyDays = array_key_exists('frequencyDays', $data) ? (int)$data['frequencyDays'] : (int)($row['frequencyDays'] ?? 0);
        $startDate = array_key_exists('startDate', $data) ? trim((string)$data['startDate']) : (string)($row['startDate'] ?? '');
        $time = array_key_exists('time', $data) ? trim((string)$data['time']) : (string)($row['time'] ?? '');
        $goal = array_key_exists('goal', $data) ? normalizeNumericGoal($data['goal']) : normalizeNumericGoal($row['goal'] ?? '');
        $status = array_key_exists('status', $data) ? trim((string)$data['status']) : (string)($row['status'] ?? 'Not Yet Started');
        $lastUpdatedOn = array_key_exists('lastUpdatedOn', $data) ? trim((string)$data['lastUpdatedOn']) : (string)($row['lastUpdatedOn'] ?? '');
        $lastUpdateRemarks = array_key_exists('lastUpdateRemarks', $data) ? (string)$data['lastUpdateRemarks'] : (string)($row['lastUpdateRemarks'] ?? '');

        if ($title === '') sendJson(['success' => false, 'error' => 'Recurring task title is required.'], 400);

        $stmt = $conn->prepare("UPDATE recurring_tasks SET title=?, firm=?, category=?, assignee=?, frequencyType=?, frequencyDays=?, startDate=?, time=?, goal=?, status=?, lastUpdatedOn=?, lastUpdateRemarks=? WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare recurring task update.'], 500);
        $stmt->bind_param('sssssisssssss', $title, $firm, $category, $assignee, $frequencyType, $frequencyDays, $startDate, $time, $goal, $status, $lastUpdatedOn, $lastUpdateRemarks, $idStr);
        $ok = $stmt->execute();
        $stmtError = $stmt->error;
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to update recurring task: ' . $stmtError], 400);
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

    if ($action === 'deleteRecord' && in_array($table, ['main_tasks', 'vendor_tasks'], true)) {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid task id.'], 400);
        $stmt = $conn->prepare("DELETE FROM `{$table}` WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare task delete.'], 500);
        $stmt->bind_param('i', $id);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to delete task.'], 400);
        sendJson(['success' => true]);
    }

    if ($action === 'deleteRecord' && $table === 'action_logs') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid log id.'], 400);
        $stmt = $conn->prepare("DELETE FROM action_logs WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare log delete.'], 500);
        $stmt->bind_param('i', $id);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to delete log.'], 400);
        sendJson(['success' => true]);
    }

    if ($action === 'deleteRecord' && in_array($table, ['recurring_tasks', 'recurring_actions'], true)) {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) sendJson(['success' => false, 'error' => 'Invalid id.'], 400);
        $stmt = $conn->prepare("DELETE FROM `{$table}` WHERE id=?");
        if (!$stmt) sendJson(['success' => false, 'error' => 'Failed to prepare delete query.'], 500);
        $idStr = (string)$id;
        $stmt->bind_param('s', $idStr);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) sendJson(['success' => false, 'error' => 'Failed to delete record.'], 400);
        sendJson(['success' => true]);
    }

    if ($action === 'deleteRecord' && in_array($table, ['clients', 'projects', 'firms', 'vendors', 'categories', 'vendor_categories', 'designations'], true)) {
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
