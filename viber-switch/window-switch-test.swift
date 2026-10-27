import AppKit
import CoreGraphics
import Foundation

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let identifiers = (1...5).map { "com.haituo.viberpreview.slot\($0)" }
var applications: [NSRunningApplication] = []
for identifier in identifiers {
    guard let process = NSRunningApplication.runningApplications(withBundleIdentifier: identifier).first else {
        fputs("Missing unlinked Viber process: \(identifier)\n", stderr); exit(1)
    }
    applications.append(process)
}
func visibleCount(_ pid: pid_t) -> Int {
    guard let rows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return -1 }
    return rows.filter { ($0[kCGWindowOwnerPID as String] as? Int32) == pid && ($0[kCGWindowLayer as String] as? Int) == 0 }.count
}
for index in 0..<15 {
    let selected = index % applications.count
    for (i, process) in applications.enumerated() where i != selected {
        if !process.isHidden && !process.hide() { fputs("Failed to hide Viber \(i + 1)\n", stderr); exit(2) }
    }
    let active = applications[selected]
    if active.isHidden && !active.unhide() { fputs("Failed to unhide Viber \(selected + 1)\n", stderr); exit(3) }
    _ = active.activate(options: [.activateAllWindows])
    Thread.sleep(forTimeInterval: 0.8)
    let counts = applications.map { visibleCount($0.processIdentifier) }
    print("SWITCH \(index + 1) selected=\(selected + 1) visible=\(counts)")
    guard counts[selected] > 0 && counts.enumerated().allSatisfy({ $0.offset == selected || $0.element == 0 }) else {
        fputs("Window switch mismatch\n", stderr); exit(4)
    }
}
print("WINDOW_SWITCH_OK 15 unlinked switches; real login, embedding and data isolation untested")
