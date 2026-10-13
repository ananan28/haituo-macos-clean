# Haituo 1.2.3 account environment changes

WhatsApp sessions retain their existing independent partitions. Each account UUID now derives a stable SHA-256 Canvas text-readback seed. The seed is identical across reloads, restarts, and supported-platform builds, and differs across accounts. Readback uses deterministic RGB changes on opaque pixels only; actual rendering and non-text media canvases remain unchanged. The seed is installed synchronously in the main page world before page scripts.

This is Canvas fingerprint partitioning, NOT a complete anti-detect browser. User-Agent, fonts, GPU, audio hardware, IP, worker contexts and other device properties are not made independently different. No promise of undetectability or account unlinkability is made. The installed browser still reports the baseline UA configuration; no incompatible mobile identity is introduced.

Windows runtime PowerShell invocations are removed. Native owner/follower operations use a bundled C# executable compiled at build time. The market fallback uses the existing Node HTTP implementation. The helper performs only the original user32 window owner/position operations and exits when the windows disappear. An unsigned helper can still receive antivirus scrutiny; this removes the specific PowerShell invocation, not all possible security-product alerts.

Signal CAPTCHA responses now route from the main process to the single waiting account's own handler. Ambiguous simultaneous challenges are rejected visibly, rather than broadcast. Manual CAPTCHA completion and clicking Open Signal remain necessary. Protocol registration, external browser policies and server CAPTCHA rejection remain outside this routing repair.

No deleted-message archive is implemented by this version. No login/session data migration or deletion is performed.
