import AppKit
import ApplicationServices
import ScreenCaptureKit
import CoreGraphics
import Foundation

@main struct CaptureProbe {
    @MainActor static func main() async {
        _ = NSApplication.shared
        let identifier = "com.haituo.viberpreview.slot5"
        guard CGPreflightScreenCaptureAccess() else {
            fputs("SCREEN_CAPTURE_UNTRUSTED: screen recording permission missing\n", stderr); exit(10)
        }
        guard let process = NSRunningApplication.runningApplications(withBundleIdentifier: identifier).first else {
            fputs("VIBER_PROCESS_MISSING\n", stderr); exit(11)
        }
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            guard let window = content.windows.first(where: { $0.owningApplication?.processID == process.processIdentifier && $0.frame.width > 100 && $0.frame.height > 100 }) else {
                fputs("VIBER_WINDOW_UNAVAILABLE\n", stderr); exit(12)
            }
            let config = SCStreamConfiguration()
            config.width = max(1, Int(window.frame.width))
            config.height = max(1, Int(window.frame.height))
            config.showsCursor = false
            let filter = SCContentFilter(desktopIndependentWindow: window)
            let image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config)
            guard image.width > 100 && image.height > 100 else { fputs("EMPTY_IMAGE_DIMENSIONS\n", stderr); exit(13) }
            print("CAPTURE_OK width=\(image.width) height=\(image.height) window=\(window.windowID)")
            if AXIsProcessTrusted() {
                var stack = [AXUIElementCreateApplication(process.processIdentifier)]
                var count = 0, pressable = 0
                var roles: [String: Int] = [:]
                while let element = stack.popLast(), count < 1000 {
                    count += 1
                    var role: CFTypeRef?
                    if AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &role) == .success, let name = role as? String { roles[name, default: 0] += 1 }
                    var actions: CFArray?
                    if AXUIElementCopyActionNames(element, &actions) == .success, let names = actions as? [String], names.contains(kAXPressAction as String) { pressable += 1 }
                    var children: CFTypeRef?
                    if AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &children) == .success, let found = children as? [AXUIElement] { stack.append(contentsOf: found) }
                }
                print("ACCESSIBILITY_COUNTS total=\(count) pressable=\(pressable) roles=\(roles)")
            } else { print("ACCESSIBILITY_UNTESTED") }
            print("UNTESTED: live embedding, mouse, keyboard, focus, account login and privacy isolation")
        } catch {
            fputs("CAPTURE_FAILURE \(error.localizedDescription)\n", stderr); exit(14)
        }
    }
}
