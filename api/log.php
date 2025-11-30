<?php
header("Content-Type: application/json");
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["status" => "error", "msg" => "Invalid JSON"]);
    exit;
}

// Simpan ke file log
file_put_contents("weather_log.txt", json_encode($data) . PHP_EOL, FILE_APPEND);

echo json_encode(["status" => "success"]);
