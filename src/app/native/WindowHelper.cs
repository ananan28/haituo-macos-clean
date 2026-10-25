using System;
using System.Runtime.InteropServices;
using System.Threading;
public static class HaituoWindowFollower {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr hWnd, ref POINT point);
  [DllImport("user32.dll")] static extern bool IsWindow(IntPtr hWnd);
  [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW")] static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int index, IntPtr value);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("dwmapi.dll")] static extern int DwmFlush();
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] static extern IntPtr SetWinEventHook(uint eventMin, uint eventMax, IntPtr hmodWinEventProc, WinEventProc proc, uint idProcess, uint idThread, uint flags);
  [DllImport("user32.dll")] static extern bool UnhookWinEvent(IntPtr hook);
  [DllImport("user32.dll")] static extern int GetMessage(out MSG msg, IntPtr hWnd, uint min, uint max);
  [DllImport("user32.dll")] static extern bool TranslateMessage(ref MSG msg);
  [DllImport("user32.dll")] static extern long DispatchMessage(ref MSG msg);
  [StructLayout(LayoutKind.Sequential)] public struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam; public IntPtr lParam; public uint time; public POINT pt; }
  public delegate void WinEventProc(IntPtr hWinEventHook, uint eventType, IntPtr hwnd, int idObject, int idChild, uint dwEventThread, uint dwmsEventTime);

  const uint EVENT_OBJECT_LOCATIONCHANGE = 0x800B;
  const uint WINEVENT_OUTOFCONTEXT = 0x0000;
  const uint positionFlags = 0x0010u | 0x0004u | 0x0100u; // SWP_NOACTIVATE|SWP_NOZORDER|SWP_NOOWNERZORDER

  static void Reposition(IntPtr child, IntPtr parent, int left, int top, int right, int bottom) {
    RECT clientRect, childRect; POINT origin = new POINT();
    if (GetClientRect(parent, out clientRect) && ClientToScreen(parent, ref origin) && GetWindowRect(child, out childRect)) {
      int clientWidth = clientRect.Right - clientRect.Left, clientHeight = clientRect.Bottom - clientRect.Top;
      int x = origin.X + left, y = origin.Y + top;
      int width = Math.Max(1, clientWidth - left - right), height = Math.Max(1, clientHeight - top - bottom);
      if (childRect.Left != x || childRect.Top != y || childRect.Right - childRect.Left != width || childRect.Bottom - childRect.Top != height) {
        SetWindowPos(child, IntPtr.Zero, x, y, width, height, positionFlags);
        DwmFlush();
      }
    }
  }

  public static void Run(long childValue, long parentValue, int left, int top, int right, int bottom) {
    var child = new IntPtr(childValue); var parent = new IntPtr(parentValue);
    SetWindowLongPtr(child, -8, parent); // GWLP_HWNDPARENT: owner so it hides/focuses with the parent
    uint parentPid = 0;
    GetWindowThreadProcessId(parent, out parentPid);
    Reposition(child, parent, left, top, right, bottom);
    WinEventProc hookProc = null;
    hookProc = (h, ev, hwnd, idObject, idChild, dwThread, dwms) => {
      if (hwnd == parent && idObject == 0) Reposition(child, parent, left, top, right, bottom);
    };
    IntPtr hook = IntPtr.Zero;
    try {
      hook = SetWinEventHook(EVENT_OBJECT_LOCATIONCHANGE, EVENT_OBJECT_LOCATIONCHANGE, IntPtr.Zero, hookProc, parentPid, 0, WINEVENT_OUTOFCONTEXT);
      // The hook repositions the child synchronously with the parent's window
      // message cycle (no polling lag). A slow safety-net pass covers resize
      // edges the hook may coalesce.
      MSG msg;
      int lastRepos = Environment.TickCount;
      while (IsWindow(child) && IsWindow(parent)) {
        bool got = GetMessage(out msg, IntPtr.Zero, 0, 0) != 0;
        if (!got) { Thread.Sleep(16); }
        else { TranslateMessage(ref msg); DispatchMessage(ref msg); }
        if (Environment.TickCount - lastRepos >= 100) { Reposition(child, parent, left, top, right, bottom); lastRepos = Environment.TickCount; }
      }
    } finally {
      if (hook != IntPtr.Zero) { UnhookWinEvent(hook); }
      GC.KeepAlive(hookProc);
    }
  }

  public static int Main(string[] args) {
    try {
      if(args.Length == 1 && args[0] == "--self-test") return IntPtr.Size == 8 ? 0 : 2;
      if(args.Length == 3 && args[0] == "owner") {
        SetWindowLongPtr(new IntPtr(long.Parse(args[1])), -8, new IntPtr(long.Parse(args[2]))); return 0;
      }
      if(args.Length != 7 || args[0] != "follow") return 2;
      Run(long.Parse(args[1]),long.Parse(args[2]),int.Parse(args[3]),int.Parse(args[4]),int.Parse(args[5]),int.Parse(args[6])); return 0;
    } catch { return 1; }
  }
}
