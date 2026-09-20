<?php
/**
 * WebsFlow → 复用 PayFlow Mailer 发信
 * 用法:echo '{"to":"..","subject":"..","text":".."}' | php payflow-mail.php
 */
declare(strict_types=1);
$root = '/www/wwwroot/payflow';
if (!is_file($root . '/bootstrap.php')) { echo 'NO_PAYFLOW'; exit(1); }
$config = require $root . '/bootstrap.php';
$app = new PayFlow\Application($config);
$payload = json_decode((string) stream_get_contents(STDIN), true) ?: [];
$to = (string) ($payload['to'] ?? '');
$subject = (string) ($payload['subject'] ?? '');
$text = (string) ($payload['text'] ?? '');
if (!$to || !$subject) { echo 'BAD_PAYLOAD'; exit(1); }
$html = nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8'));
try {
    $ok = $app->mailer->send($to, $subject, $html, $text);
    echo $ok ? 'OK' : 'FAIL';
} catch (Throwable $e) {
    echo 'ERR:' . $e->getMessage();
}
