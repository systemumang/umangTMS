<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$DB_HOST = 'srv735.hstgr.io';
$DB_NAME = 'u299994438_tmsumang';
$DB_USER = 'u299994438_tmsumang';
$DB_PASS = '!Office1@';

mysqli_report(MYSQLI_REPORT_OFF);
$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed.'
    ]);
    exit;
}

$conn->set_charset('utf8mb4');

