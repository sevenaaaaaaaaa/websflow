/* ============================================================
 * WebsFlow · OpenFlow 协同 (openflow.js)
 * 把需要人工跟进的事项写进 OpenFlow 待办(data/tasks.json)
 * ============================================================ */
const path = require('path');
const { spawn } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'bin', 'openflow-task.php');

function createTask(title, description, priority, sourceId) {
  return new Promise((resolve) => {
    let out = '';
    const child = spawn('/usr/bin/php', [SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', () => {});
    child.on('error', (e) => resolve({ ok: false, error: e.message }));
    child.on('close', () => resolve({ ok: out.trim() === 'OK', detail: out.trim().slice(0, 120) }));
    child.stdin.write(JSON.stringify({ title, description, priority: priority || 'medium', source_id: sourceId || '' }));
    child.stdin.end();
  });
}

module.exports = { createTask };
