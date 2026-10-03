import Foundation
import CoreGraphics
let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly,.excludeDesktopElements],kCGNullWindowID) as? [[String:Any]] ?? []
let result = windows.map { window -> [String:Any] in
    ["id":window[kCGWindowNumber as String] ?? 0,"pid":window[kCGWindowOwnerPID as String] ?? 0,"layer":window[kCGWindowLayer as String] ?? 0,"bounds":window[kCGWindowBounds as String] ?? [:]]
}
let data = try JSONSerialization.data(withJSONObject:result)
print(String(data:data,encoding:.utf8)!)
