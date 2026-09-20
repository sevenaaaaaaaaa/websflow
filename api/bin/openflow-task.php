<?php
/**
 * WebsFlow → OpenFlow 待办桥
 * 以兼容 schema + flock 原子写入 OpenFlow 的 data/tasks.json
 * 用法:echo '{"title":"..","description":"..","priority":"high"}' | php openflow-task.php
 */
declare(strict_types=1);
$file = '/www/wwwroot/nownexts_com/data/tasks.json';
$payload = json_decode((string) stream_get_contents(STDIN), true) ?: [];
$title = trim((string) ($payload['title'] ?? ''));
if ($title === '') { echo 'BAD_PAYLOAD'; exit(1); }
$priority = in_array($payload['priority'] ?? '', ['low', 'medium', 'high'], true) ? $payload['priority'] : 'medium';
$lock = $file . '.lock';
$fp = fopen($lock, 'c');
if (!$fp) { echo 'NO_LOCK'; exit(1); }
flock($fp, LOCK_EX);
$tasks = [];
if (is_file($file)) {
    $raw = (string) file_get_contents($file);
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) $tasks = $decoded;
}
$tasks[] = [
    'id' => 'task_' . date('Ymd_His') . '_' . substr(bin2hex(random_bytes(4)), 0, 6),
    'title' => mb_substr($title, 0, 120),
    'description' => mb_substr((string) ($payload['description'] ?? ''), 0, 800),
    'assignee' => (string) ($payload['assignee'] ?? 'Seven'),
    'assigner' => 'websflow',
    'priority' => $priority,
    'status' => 'pending',
    'progress' => 0,
    'due_date' => '',
    'comments' => [],
    'source' => 'websflow',
    'source_id' => (string) ($payload['source_id'] ?? ''),
    'created_at' => date('Y-m-d H:i:s'),
    'completed_at' => '',
];
$ok = file_put_contents($file, json_encode($tasks, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX) !== false;
flock($fp, LOCK_UN);
fclose($fp);
echo $ok ? 'OK' : 'WRITE_FAIL';
