<?php
declare(strict_types=1);

/**
 * Notifications (WhatsApp + Telegram) for the Hostinger/MySQL backend.
 *
 * Safety goals:
 * - No-op by default unless $NOTIFICATIONS_ENABLED is set true in config.php.
 * - Never block core DB writes: all notification errors are swallowed and optionally logged.
 * - Prefer queueing to notification_queue when available; worker can send async.
 */

require_once __DIR__ . '/config.php';

function notifications_enabled(): bool {
    return (bool)($GLOBALS['NOTIFICATIONS_ENABLED'] ?? false);
}

function notifications_worker_token(): string {
    return (string)($GLOBALS['NOTIFICATIONS_WORKER_TOKEN'] ?? '');
}

function notifications_table_exists(mysqli $conn, string $table): bool {
    $table = preg_replace('/[^a-zA-Z0-9_]/', '', $table);
    if ($table === '') return false;
    $result = $conn->query("SHOW TABLES LIKE '{$table}'");
    if (!$result) return false;
    $row = $result->fetch_row();
    $result->free();
    return (bool)$row;
}

function notifications_get_settings(mysqli $conn): array {
    $result = $conn->query("SELECT * FROM app_settings LIMIT 1");
    if (!$result) return [];
    $row = $result->fetch_assoc() ?: [];
    $result->free();
    return $row;
}

function notifications_get_user_mobile(mysqli $conn, string $userName): string {
    $name = trim($userName);
    if ($name === '') return '';
    $stmt = $conn->prepare("SELECT mobile FROM users WHERE name = ? LIMIT 1");
    if (!$stmt) return '';
    $stmt->bind_param('s', $name);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res ? $res->fetch_assoc() : null;
    $stmt->close();
    return trim((string)($row['mobile'] ?? ''));
}

function notifications_get_vendor_mobile(mysqli $conn, string $vendorName): string {
    $name = trim($vendorName);
    if ($name === '') return '';
    $stmt = $conn->prepare("SELECT mobile FROM vendors WHERE name = ? LIMIT 1");
    if (!$stmt) return '';
    $stmt->bind_param('s', $name);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res ? $res->fetch_assoc() : null;
    $stmt->close();
    return trim((string)($row['mobile'] ?? ''));
}

function notifications_get_project_groups(mysqli $conn, string $projectName): array {
    $projectName = trim($projectName);
    if ($projectName === '' || $projectName === '-') return ['whatsappGroupId' => '', 'telegramGroupId' => ''];
    $stmt = $conn->prepare("SELECT whatsappGroupId, telegramGroupId FROM projects WHERE name = ? LIMIT 1");
    if (!$stmt) return ['whatsappGroupId' => '', 'telegramGroupId' => ''];
    $stmt->bind_param('s', $projectName);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res ? ($res->fetch_assoc() ?: []) : [];
    $stmt->close();
    return [
        'whatsappGroupId' => trim((string)($row['whatsappGroupId'] ?? $row['whatsAppGroupID'] ?? '')),
        'telegramGroupId' => trim((string)($row['telegramGroupId'] ?? $row['telegramGroupID'] ?? '')),
    ];
}

function notifications_pick_whatsapp_provider(array $settings): string {
    $metaToken = trim((string)($settings['metaAccessToken'] ?? ''));
    $metaPhoneId = trim((string)($settings['metaPhoneNumberId'] ?? ''));
    if ($metaToken !== '' && $metaPhoneId !== '') return 'meta';

    $masId = trim((string)($settings['masId'] ?? ''));
    $masPass = trim((string)($settings['masPassword'] ?? ''));
    if ($masId !== '' && $masPass !== '') return 'mas';

    return '';
}

function notifications_is_telegram_configured(array $settings): bool {
    $botToken = trim((string)($settings['officeTokenId'] ?? ''));
    $chatId = trim((string)($settings['officeTelegramGroupId'] ?? ''));
    return $botToken !== '' && $chatId !== '';
}

function notifications_format_datetime(): string {
    return date('d/m/Y H:i');
}

function notifications_trim(string $value): string {
    return trim(preg_replace('/\s+/', ' ', $value));
}

function notifications_format_date_dmy(string $value): string {
    $value = trim($value);
    if ($value === '') return '';
    // Already dd/mm/yyyy?
    if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}$/', $value)) {
        [$d, $m, $y] = explode('/', $value);
        return str_pad($d, 2, '0', STR_PAD_LEFT) . '/' . str_pad($m, 2, '0', STR_PAD_LEFT) . '/' . $y;
    }
    // ISO yyyy-mm-dd
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $value)) {
        $date = substr($value, 0, 10);
        [$y, $m, $d] = explode('-', $date);
        return $d . '/' . $m . '/' . $y;
    }
    // Try parse
    $ts = strtotime($value);
    if ($ts !== false) return date('d/m/Y', $ts);
    return $value;
}

function notifications_format_time_hhmm(string $value): string {
    $value = trim($value);
    if ($value === '') return '';
    if (preg_match('/^\d{1,2}:\d{2}$/', $value)) {
        [$h, $m] = explode(':', $value);
        return str_pad($h, 2, '0', STR_PAD_LEFT) . ':' . $m;
    }
    $ts = strtotime($value);
    if ($ts !== false) return date('H:i', $ts);
    return $value;
}

function notifications_add_line(array &$lines, string $label, string $value, bool $optional = false): void {
    $value = notifications_trim($value);
    if ($optional && $value === '') return;
    if ($value === '') return;
    $lines[] = '*' . $label . ':* ' . $value;
}

function notifications_compose_task_created(array $task, bool $isVendor): string {
    $lines = [];
    $lines[] = $isVendor ? "*New Vendor Task*" : "*New Task Assigned*";
    $lines[] = '';

    notifications_add_line($lines, 'Task', (string)($task['title'] ?? ''));
    notifications_add_line($lines, 'Notes', (string)($task['notes'] ?? ''), true);
    notifications_add_line($lines, 'Firm', (string)($task['firm'] ?? ''));
    notifications_add_line($lines, 'Category', (string)($task['category'] ?? ''));
    if (!$isVendor) {
        notifications_add_line($lines, 'Assignees', (string)($task['assignees'] ?? ''));
    }
    notifications_add_line($lines, 'Owner', (string)($task['owner'] ?? ''));
    notifications_add_line($lines, 'Priority', (string)($task['priority'] ?? ''));
    $time = notifications_format_time_hhmm((string)($task['time'] ?? ''));
    notifications_add_line($lines, 'Time', $time, true);
    notifications_add_line($lines, 'Goal', (string)($task['goal'] ?? ''), true);
    $due = notifications_format_date_dmy((string)($task['dueDate'] ?? ''));
    notifications_add_line($lines, 'Due Date', $due);
    $lines[] = '*Created At:* ' . notifications_format_datetime();
    return implode("\n", $lines);
}

function notifications_compose_task_updated(array $task, array $log): string {
    $lines = [];
    $lines[] = "*Task Updated*";
    $lines[] = '';
    notifications_add_line($lines, 'Task', (string)($task['title'] ?? ''));
    notifications_add_line($lines, 'Firm', (string)($task['firm'] ?? ''));
    notifications_add_line($lines, 'Status', (string)($task['status'] ?? ''));
    notifications_add_line($lines, 'Remarks', (string)($log['remarks'] ?? ''));
    notifications_add_line($lines, 'Minutes', (string)($log['minutes'] ?? ''));
    notifications_add_line($lines, 'Achieved', (string)($log['achieved'] ?? ''), true);
    $lines[] = '*Updated At:* ' . notifications_format_datetime();
    return implode("\n", $lines);
}

function notifications_compose_recurring_created(array $task): string {
    $lines = [];
    $lines[] = "*New Recurring Task Created*";
    $lines[] = '';
    notifications_add_line($lines, 'Task', (string)($task['title'] ?? ''));
    notifications_add_line($lines, 'Firm', (string)($task['firm'] ?? ''));
    notifications_add_line($lines, 'Category', (string)($task['category'] ?? ''));
    notifications_add_line($lines, 'Assignee', (string)($task['assignee'] ?? ''));
    notifications_add_line($lines, 'Owner', (string)($task['owner'] ?? ''));
    notifications_add_line($lines, 'Start Date', notifications_format_date_dmy((string)($task['startDate'] ?? '')));
    $rule = trim((string)($task['frequencyType'] ?? ''));
    if ($rule !== '') {
        $ruleText = $rule . (isset($task['frequencyDays']) ? (" / " . (string)$task['frequencyDays']) : '');
        notifications_add_line($lines, 'Rule', $ruleText);
    }
    notifications_add_line($lines, 'Time', notifications_format_time_hhmm((string)($task['time'] ?? '')), true);
    notifications_add_line($lines, 'Goal', (string)($task['goal'] ?? ''), true);
    $lines[] = '*Created At:* ' . notifications_format_datetime();
    return implode("\n", $lines);
}

function notifications_compose_recurring_action(array $action): string {
    $lines = [];
    $lines[] = "*Recurring Task Updated*";
    $lines[] = '';
    notifications_add_line($lines, 'Task', (string)($action['taskTitle'] ?? ''));
    notifications_add_line($lines, 'Firm', (string)($action['firm'] ?? ''));
    notifications_add_line($lines, 'Status', (string)($action['status'] ?? ''));
    notifications_add_line($lines, 'Remarks', (string)($action['remarks'] ?? ''));
    notifications_add_line($lines, 'Achieved', (string)($action['goal'] ?? ''), true);
    $lines[] = '*Updated At:* ' . notifications_format_datetime();
    return implode("\n", $lines);
}

function notifications_split_names(string $names): array {
    $parts = array_map('trim', explode(',', $names));
    $parts = array_filter($parts, static fn($name) => $name !== '');
    return array_values(array_unique($parts));
}

function notifications_pending_reminder_event_key(bool $force): string {
    if ($force) return 'pending_reminder_test';
    $tz = new DateTimeZone('Asia/Kolkata');
    return 'pending_reminder_' . (new DateTimeImmutable('now', $tz))->format('Y-m-d');
}

function notifications_pending_reminder_already_logged(mysqli $conn, string $eventType, string $target): bool {
    if (!notifications_table_exists($conn, 'notification_logs')) return false;
    $stmt = $conn->prepare("SELECT id FROM notification_logs WHERE eventType=? AND target=? AND status='enqueued' LIMIT 1");
    if (!$stmt) return false;
    $stmt->bind_param('ss', $eventType, $target);
    $stmt->execute();
    $res = $stmt->get_result();
    $exists = $res ? (bool)$res->fetch_assoc() : false;
    $stmt->close();
    return $exists;
}

function notifications_compose_pending_reminder(array $simpleTasks, array $recurringTasks): string {
    $lines = [];
    $lines[] = '*Pending Tasks Reminder*';
    $lines[] = '';
    $lines[] = 'Simple Task';
    if (count($simpleTasks) === 0) {
        $lines[] = 'No pending simple tasks';
    } else {
        foreach (array_values($simpleTasks) as $idx => $task) {
            $lines[] = ($idx + 1) . '. ' . notifications_trim((string)$task);
        }
    }
    $lines[] = '';
    $lines[] = 'Recurring Task';
    if (count($recurringTasks) === 0) {
        $lines[] = 'No pending recurring tasks';
    } else {
        foreach (array_values($recurringTasks) as $idx => $task) {
            $lines[] = ($idx + 1) . '. ' . notifications_trim((string)$task);
        }
    }
    return implode("\n", $lines);
}

function notifications_collect_pending_reminders(mysqli $conn): array {
    $byAssignee = [];

    $simpleSql = "SELECT title, assignees FROM main_tasks WHERE TRIM(COALESCE(assignees, '')) <> '' AND LOWER(TRIM(COALESCE(status, ''))) <> 'completed' ORDER BY dueDate ASC, title ASC";
    $simpleResult = $conn->query($simpleSql);
    if ($simpleResult) {
        while ($row = $simpleResult->fetch_assoc()) {
            $title = trim((string)($row['title'] ?? ''));
            if ($title === '') continue;
            foreach (notifications_split_names((string)($row['assignees'] ?? '')) as $assignee) {
                if (!isset($byAssignee[$assignee])) $byAssignee[$assignee] = ['simple' => [], 'recurring' => []];
                $byAssignee[$assignee]['simple'][] = $title;
            }
        }
        $simpleResult->free();
    }

    $recurringSql = "SELECT title, assignee FROM recurring_tasks WHERE TRIM(COALESCE(assignee, '')) <> '' AND LOWER(TRIM(COALESCE(status, ''))) <> 'complete' ORDER BY time ASC, title ASC";
    $recurringResult = $conn->query($recurringSql);
    if ($recurringResult) {
        while ($row = $recurringResult->fetch_assoc()) {
            $title = trim((string)($row['title'] ?? ''));
            if ($title === '') continue;
            foreach (notifications_split_names((string)($row['assignee'] ?? '')) as $assignee) {
                if (!isset($byAssignee[$assignee])) $byAssignee[$assignee] = ['simple' => [], 'recurring' => []];
                $byAssignee[$assignee]['recurring'][] = $title;
            }
        }
        $recurringResult->free();
    }

    return $byAssignee;
}

function notifications_enqueue_pending_reminders(mysqli $conn, bool $force = false): array {
    if (!notifications_enabled()) return ['success' => true, 'enqueued' => 0, 'skipped' => 0, 'message' => 'Notifications disabled'];
    if (!notifications_table_exists($conn, 'notification_queue')) return ['success' => true, 'enqueued' => 0, 'skipped' => 0, 'message' => 'Queue table missing'];

    $settings = notifications_get_settings($conn);
    $waProvider = 'mas';
    if (trim((string)($settings['masId'] ?? '')) === '' || trim((string)($settings['masPassword'] ?? '')) === '') {
        return ['success' => false, 'enqueued' => 0, 'skipped' => 0, 'message' => 'MessageAutoSender not configured'];
    }

    $eventType = notifications_pending_reminder_event_key($force);
    $groups = notifications_collect_pending_reminders($conn);
    $enqueued = 0;
    $skipped = 0;

    foreach ($groups as $assignee => $tasks) {
        if (count($tasks['simple']) === 0 && count($tasks['recurring']) === 0) {
            $skipped++;
            continue;
        }
        $mobile = notifications_get_user_mobile($conn, (string)$assignee);
        if ($mobile === '') {
            $skipped++;
            notifications_log($conn, $eventType, 'whatsapp', $waProvider, (string)$assignee, 'skipped', 'Missing user mobile');
            continue;
        }
        if (!$force && notifications_pending_reminder_already_logged($conn, $eventType, $mobile)) {
            $skipped++;
            continue;
        }
        $message = notifications_compose_pending_reminder($tasks['simple'], $tasks['recurring']);
        notifications_enqueue($conn, 'whatsapp', $waProvider, 'personal', $mobile, $message, ['event' => $eventType, 'assignee' => $assignee]);
        notifications_log($conn, $eventType, 'whatsapp', $waProvider, $mobile, 'enqueued', '');
        $enqueued++;
    }

    return ['success' => true, 'enqueued' => $enqueued, 'skipped' => $skipped, 'message' => 'Pending reminders queued'];
}

function notifications_enqueue_pending_reminders_if_due(mysqli $conn): array {
    $tz = new DateTimeZone('Asia/Kolkata');
    $now = new DateTimeImmutable('now', $tz);
    $settings = notifications_get_settings($conn);
    $reminderTime = trim((string)($settings['reminderTime'] ?? '09:30'));
    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $reminderTime)) $reminderTime = '09:30';
    [$targetHour, $targetMinute] = array_map('intval', explode(':', $reminderTime));
    $hour = (int)$now->format('H');
    $minute = (int)$now->format('i');
    if ($hour < $targetHour || ($hour === $targetHour && $minute < $targetMinute)) {
        return ['success' => true, 'enqueued' => 0, 'skipped' => 0, 'message' => 'Reminder time not reached'];
    }
    return notifications_enqueue_pending_reminders($conn, false);
}

function notifications_parse_date_dmy_to_iso(string $value): string {
    $value = trim($value);
    if ($value === '') return '';
    if (preg_match('/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/', $value, $m)) {
        return $m[3] . '-' . str_pad($m[2], 2, '0', STR_PAD_LEFT) . '-' . str_pad($m[1], 2, '0', STR_PAD_LEFT);
    }
    $ts = strtotime($value);
    return $ts === false ? '' : date('Y-m-d', $ts);
}

function notifications_collect_update_totals(mysqli $conn, string $todayIso): array {
    $simple = [];
    $simpleResult = $conn->query("SELECT assignees, owner, updateDate, updatedOn FROM action_logs ORDER BY id ASC");
    if ($simpleResult) {
        while ($row = $simpleResult->fetch_assoc()) {
            $date = notifications_parse_date_dmy_to_iso((string)($row['updatedOn'] ?? '')) ?: notifications_parse_date_dmy_to_iso((string)($row['updateDate'] ?? ''));
            if ($date !== $todayIso) continue;
            $names = notifications_split_names((string)($row['assignees'] ?? ''));
            if (count($names) === 0) $names = notifications_split_names((string)($row['owner'] ?? ''));
            foreach ($names as $assignee) {
                $simple[$assignee] = ($simple[$assignee] ?? 0) + 1;
            }
        }
        $simpleResult->free();
    }

    $recurring = [];
    $recurringResult = $conn->query("SELECT assignee, updatedOn FROM recurring_actions ORDER BY id ASC");
    if ($recurringResult) {
        while ($row = $recurringResult->fetch_assoc()) {
            $date = notifications_parse_date_dmy_to_iso((string)($row['updatedOn'] ?? ''));
            if ($date !== $todayIso) continue;
            foreach (notifications_split_names((string)($row['assignee'] ?? '')) as $assignee) {
                $recurring[$assignee] = ($recurring[$assignee] ?? 0) + 1;
            }
        }
        $recurringResult->free();
    }

    return ['simple' => $simple, 'recurring' => $recurring];
}

function notifications_format_number($value): string {
    $num = (float)$value;
    return fmod($num, 1.0) === 0.0 ? (string)(int)$num : rtrim(rtrim(number_format($num, 2, '.', ''), '0'), '.');
}

function notifications_compose_update_reminder(array $simpleTotals, array $recurringTotals, string $dateDmy): string {
    $lines = [];
    $lines[] = '*Task Update - ' . $dateDmy . '*';
    $lines[] = '';
    $lines[] = '*Simple Task*';
    $simpleTotals = array_filter($simpleTotals, fn($total) => (float)$total > 0);
    arsort($simpleTotals, SORT_NUMERIC);
    $idx = 1;
    foreach ($simpleTotals as $title => $total) {
        $lines[] = $idx . '.' . $title . ' - ' . notifications_format_number($total);
        $idx++;
    }
    $lines[] = '';
    $lines[] = '*Recurring Tasks*';
    $recurringTotals = array_filter($recurringTotals, fn($total) => (float)$total > 0);
    arsort($recurringTotals, SORT_NUMERIC);
    $idx = 1;
    foreach ($recurringTotals as $title => $total) {
        $lines[] = $idx . '. ' . $title . ' - ' . notifications_format_number($total);
        $idx++;
    }
    return implode("
", $lines);
}

function notifications_update_reminder_due(mysqli $conn, array $overrides = []): array {
    $tz = new DateTimeZone('Asia/Kolkata');
    $now = new DateTimeImmutable('now', $tz);
    $settings = notifications_get_settings($conn);
    $reminderTime = trim((string)($overrides['updateReminderTime'] ?? $settings['updateReminderTime'] ?? '09:30'));
    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $reminderTime)) $reminderTime = '09:30';
    [$targetHour, $targetMinute] = array_map('intval', explode(':', $reminderTime));
    $hour = (int)$now->format('H');
    $minute = (int)$now->format('i');
    return [
        'due' => !($hour < $targetHour || ($hour === $targetHour && $minute < $targetMinute)),
        'todayIso' => $now->format('Y-m-d'),
        'todayDmy' => $now->format('d/m/Y'),
    ];
}

function notifications_enqueue_update_reminder(mysqli $conn, bool $force = false, array $overrides = []): array {
    if (!notifications_enabled()) return ['success' => true, 'enqueued' => 0, 'skipped' => 0, 'message' => 'Notifications disabled'];
    if (!notifications_table_exists($conn, 'notification_queue')) return ['success' => true, 'enqueued' => 0, 'skipped' => 0, 'message' => 'Queue table missing'];

    $settings = notifications_get_settings($conn);
    $waProvider = 'mas';
    if (trim((string)($settings['masId'] ?? '')) === '' || trim((string)($settings['masPassword'] ?? '')) === '') {
        return ['success' => false, 'enqueued' => 0, 'skipped' => 0, 'message' => 'MessageAutoSender not configured'];
    }
    $group = trim((string)($overrides['updateReminderGroup'] ?? $settings['updateReminderGroup'] ?? ''));
    if ($group === '') return ['success' => false, 'enqueued' => 0, 'skipped' => 0, 'message' => 'Group Number not configured'];

    $due = notifications_update_reminder_due($conn, $overrides);
    if (!$force && !($due['due'] ?? false)) return ['success' => true, 'enqueued' => 0, 'skipped' => 0, 'message' => 'Reminder time not reached'];

    $eventType = $force ? 'update_reminder_test' : 'update_reminder_' . (string)$due['todayIso'];
    if (!$force && notifications_pending_reminder_already_logged($conn, $eventType, $group)) {
        return ['success' => true, 'enqueued' => 0, 'skipped' => 1, 'message' => 'Update reminder already queued'];
    }

    $totals = notifications_collect_update_totals($conn, (string)$due['todayIso']);
    $message = notifications_compose_update_reminder($totals['simple'], $totals['recurring'], (string)$due['todayDmy']);

    if ($force) {
        $dispatch = notifications_send_whatsapp_mas_group($settings, $group, $message);
        $ok = (bool)($dispatch['ok'] ?? false);
        $error = (string)($dispatch['error'] ?? '');
        notifications_log($conn, $eventType, 'whatsapp', $waProvider, $group, $ok ? 'sent' : 'failed', $error);
        if (!$ok) {
            return ['success' => false, 'enqueued' => 0, 'skipped' => 0, 'message' => $error ?: 'Update reminder failed'];
        }
        return ['success' => true, 'enqueued' => 0, 'sent' => 1, 'skipped' => 0, 'message' => 'Update reminder sent'];
    }

    notifications_enqueue($conn, 'whatsapp', $waProvider, 'group', $group, $message, ['event' => $eventType]);
    notifications_log($conn, $eventType, 'whatsapp', $waProvider, $group, 'enqueued', '');
    return ['success' => true, 'enqueued' => 1, 'skipped' => 0, 'message' => 'Update reminder queued'];
}

function notifications_enqueue_update_reminder_if_due(mysqli $conn): array {
    return notifications_enqueue_update_reminder($conn, false);
}

function notifications_enqueue(mysqli $conn, string $channel, string $provider, string $targetType, string $target, string $message, array $meta = []): void {
    if (!notifications_enabled()) return;
    if ($channel === '' || $provider === '' || $target === '' || $message === '') return;
    if (!notifications_table_exists($conn, 'notification_queue')) return;

    $stmt = $conn->prepare("INSERT INTO notification_queue (channel, provider, targetType, target, message, meta, status, attempts, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, NOW(), NOW())");
    if (!$stmt) return;
    $metaJson = json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $stmt->bind_param('ssssss', $channel, $provider, $targetType, $target, $message, $metaJson);
    $stmt->execute();
    $stmt->close();
}

function notifications_log(mysqli $conn, string $eventType, string $channel, string $provider, string $target, string $status, string $error = ''): void {
    if (!notifications_enabled()) return;
    if (!notifications_table_exists($conn, 'notification_logs')) return;
    $stmt = $conn->prepare("INSERT INTO notification_logs (eventType, channel, provider, target, status, error, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    if (!$stmt) return;
    $stmt->bind_param('ssssss', $eventType, $channel, $provider, $target, $status, $error);
    $stmt->execute();
    $stmt->close();
}

function notifications_http_post_json(string $url, array $headers, array $body, int $timeoutSeconds = 12): array {
    $ch = curl_init($url);
    if (!$ch) return ['ok' => false, 'error' => 'curl_init failed'];
    $payload = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $merged = array_merge(['Content-Type: application/json'], $headers);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $merged,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => $timeoutSeconds,
    ]);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp === false) return ['ok' => false, 'error' => $err ?: 'curl error'];
    if ($code < 200 || $code >= 300) return ['ok' => false, 'error' => "HTTP {$code}: {$resp}"];
    return ['ok' => true, 'response' => $resp];
}

function notifications_http_post_form(string $url, array $headers, array $body, int $timeoutSeconds = 12): array {
    $ch = curl_init($url);
    if (!$ch) return ['ok' => false, 'error' => 'curl_init failed'];
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => http_build_query($body),
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => $timeoutSeconds,
    ]);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp === false) return ['ok' => false, 'error' => $err ?: 'curl error'];
    if ($code < 200 || $code >= 300) return ['ok' => false, 'error' => "HTTP {$code}: {$resp}"];
    return ['ok' => true, 'response' => $resp];
}

function notifications_send_whatsapp_meta(array $settings, string $toMobile, string $message): array {
    $token = trim((string)($settings['metaAccessToken'] ?? ''));
    $phoneId = trim((string)($settings['metaPhoneNumberId'] ?? ''));
    if ($token === '' || $phoneId === '') return ['ok' => false, 'error' => 'Meta WhatsApp not configured'];
    $toMobile = preg_replace('/[^0-9]/', '', $toMobile);
    if ($toMobile === '') return ['ok' => false, 'error' => 'Invalid mobile'];
    $url = "https://graph.facebook.com/v20.0/{$phoneId}/messages";
    $body = [
        'messaging_product' => 'whatsapp',
        'recipient_type' => 'individual',
        'to' => $toMobile,
        'type' => 'text',
        'text' => ['preview_url' => false, 'body' => $message],
    ];
    return notifications_http_post_json($url, ["Authorization: Bearer {$token}"], $body);
}

function notifications_send_whatsapp_mas_personal(array $settings, string $toMobile, string $message): array {
    $username = trim((string)($settings['masId'] ?? ''));
    $password = trim((string)($settings['masPassword'] ?? ''));
    if ($username === '' || $password === '') return ['ok' => false, 'error' => 'MessageAutoSender not configured'];
    $toMobile = preg_replace('/[^0-9]/', '', $toMobile);
    if ($toMobile === '') return ['ok' => false, 'error' => 'Invalid mobile'];
    $url = "https://app.messageautosender.com/api/v1/message/create";
    $auth = base64_encode($username . ":" . $password);
    return notifications_http_post_json($url, ["Authorization: Basic {$auth}"], [
        'receiverMobileNo' => $toMobile,
        'message' => [$message],
    ]);
}

function notifications_send_whatsapp_mas_group(array $settings, string $groupNumber, string $message): array {
    $username = trim((string)($settings['masId'] ?? ''));
    $password = trim((string)($settings['masPassword'] ?? ''));
    if ($username === '' || $password === '') return ['ok' => false, 'error' => 'MessageAutoSender not configured'];
    $groupNumber = trim($groupNumber);
    if ($groupNumber === '') return ['ok' => false, 'error' => 'Missing group number'];
    $url = "https://app.messageautosender.com/api/v1/message/create";
    $auth = base64_encode($username . ":" . $password);
    return notifications_http_post_json($url, ["Authorization: Basic {$auth}"], [
        'recipientIds' => [$groupNumber],
        'message' => [$message],
    ]);
}

function notifications_send_telegram(array $settings, string $chatId, string $message): array {
    $token = trim((string)($settings['officeTokenId'] ?? ''));
    if ($token === '') return ['ok' => false, 'error' => 'Telegram bot token not configured'];
    $chatId = trim($chatId);
    if ($chatId === '') return ['ok' => false, 'error' => 'Telegram chat id missing'];
    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    // Use plain text to avoid parse issues.
    return notifications_http_post_form($url, [], [
        'chat_id' => $chatId,
        'text' => $message,
        'disable_web_page_preview' => 'true',
    ]);
}

/**
 * Sends one queued message. Returns ['ok'=>bool,'error' => string]
 */
function notifications_dispatch(mysqli $conn, array $queueRow): array {
    if (!notifications_enabled()) return ['ok' => true];
    $settings = notifications_get_settings($conn);

    $channel = (string)($queueRow['channel'] ?? '');
    $provider = (string)($queueRow['provider'] ?? '');
    $targetType = (string)($queueRow['targetType'] ?? '');
    $target = (string)($queueRow['target'] ?? '');
    $message = (string)($queueRow['message'] ?? '');

    if ($channel === 'telegram') {
        return notifications_send_telegram($settings, $target, $message);
    }

    if ($channel === 'whatsapp') {
        if ($provider === 'meta') {
            // Meta supports personal only in this implementation.
            if ($targetType !== 'personal') return ['ok' => false, 'error' => 'Meta group sending not supported'];
            return notifications_send_whatsapp_meta($settings, $target, $message);
        }
        if ($provider === 'mas') {
            if ($targetType === 'group') return notifications_send_whatsapp_mas_group($settings, $target, $message);
            return notifications_send_whatsapp_mas_personal($settings, $target, $message);
        }
        return ['ok' => false, 'error' => 'Unknown WhatsApp provider'];
    }

    return ['ok' => false, 'error' => 'Unknown channel'];
}
