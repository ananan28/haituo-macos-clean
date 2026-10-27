import AppKit
import CoreGraphics
import Foundation
_ = NSApplication.shared
guard CommandLine.arguments.count == 3, let host=Int32(CommandLine.arguments[1]), let target=Int32(CommandLine.arguments[2]) else { exit(2) }
guard let rows=CGWindowListCopyWindowInfo([.optionOnScreenOnly,.excludeDesktopElements],kCGNullWindowID) as? [[String:Any]] else { exit(3) }
func index(_ pid:Int32)->Int? { rows.firstIndex { ($0[kCGWindowOwnerPID as String] as? Int32)==pid && ($0[kCGWindowLayer as String] as? Int)==0 } }
func rect(_ row:[String:Any])->CGRect? {
    guard let b=row[kCGWindowBounds as String] as? [String:Any],let x=(b["X"] as? NSNumber)?.doubleValue,let y=(b["Y"] as? NSNumber)?.doubleValue,let w=(b["Width"] as? NSNumber)?.doubleValue,let h=(b["Height"] as? NSNumber)?.doubleValue else {return nil}
    return CGRect(x:x,y:y,width:w,height:h)
}
guard let hi=index(host),let ti=index(target),let h=rect(rows[hi]),let t=rect(rows[ti]) else { fputs("STACK_WINDOW_UNAVAILABLE\n",stderr);exit(4) }
let above=hi<ti
let covered=h.insetBy(dx:-1,dy:-1).contains(t)
print("STACK hostAbove=\(above) targetCovered=\(covered) host=\(h) target=\(t)")
guard above && covered else { exit(5) }
