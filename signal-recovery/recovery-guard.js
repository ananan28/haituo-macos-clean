// Bound recovery-queue pausing while authenticated initial sync is pending.
// Never resume normal attachment or notification queues before their empty event.
function haituoCreateSignalRecoveryGuard({isOpen, resume, warn, schedule = setTimeout, cancel = clearTimeout, timeoutMs = 60000}) {
    let timer = null;
    const stop = () => { if (timer !== null) cancel(timer); timer = null; };
    return {
        arm() {
            if (!isOpen()) { stop(); return; }
            if (timer !== null) return;
            timer = schedule(() => {
                timer = null;
                if (!isOpen()) return;
                warn("Haituo Signal recovery: authenticated sync has not emitted empty after 60s; resuming recovery queues only");
                resume();
            }, timeoutMs);
        },
        stop
    };
}
