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
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int index);
  [DllImport("user32.dll", SetLastError=true)] static extern IntPtr SetParent(IntPtr child, IntPtr parent);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("dwmapi.dll")] static extern int DwmFlush();
  [DllImport("winmm.dll")] static extern uint timeBeginPeriod(uint uPeriod);
  [DllImport("winmm.dll")] static extern uint timeEndPeriod(uint uPeriod);

  const long WS_CHILD = 0x40000000L, WS_VISIBLE = 0x10000000L, WS_CLIPSIBLINGS = 0x04000000L;
  const long WS_POPUP = 0x80000000L, WS_CAPTION = 0x00C00000L, WS_THICKFRAME = 0x00040000L;
  const long WS_SYSMENU = 0x00080000L, WS_MINIMIZEBOX = 0x00020000L, WS_MAXIMIZEBOX = 0x00010000L;
  const int GWL_STYLE = -16;
  const uint SWP_NOSIZE = 0x0001u, SWP_NOMOVE = 0x0002u, SWP_NOZORDER = 0x0004u;
  const uint SWP_NOACTIVATE = 0x0010u, SWP_FRAMECHANGED = 0x0020u, SWP_SHOWWINDOW = 0x0040u;

  public static void Run(long childValue, long parentValue, int left, int top, int right, int bottom) {
    var child = new IntPtr(childValue); var parent = new IntPtr(parentValue);
    const uint positionFlags = SWP_NOACTIVATE | SWP_NOZORDER | 0x0100u; // + SWP_NOOWNERZORDER
    // No process/thread priority boost: the follower must not starve other
    // programs. Responsiveness comes from the adaptive poll below.
    SetWindowLongPtr(child, -8, parent);
    int stable = 0;
    bool timerArmed = false;
    try {
      while (IsWindow(child) && IsWindow(parent)) {
        RECT clientRect, childRect; POINT origin = new POINT();
        bool moved = false;
        if (GetClientRect(parent, out clientRect) && ClientToScreen(parent, ref origin) && GetWindowRect(child, out childRect)) {
          int clientWidth = clientRect.Right - clientRect.Left, clientHeight = clientRect.Bottom - clientRect.Top;
          int x = origin.X + left, y = origin.Y + top;
          int width = Math.Max(1, clientWidth - left - right), height = Math.Max(1, clientHeight - top - bottom);
          if (childRect.Left != x || childRect.Top != y || childRect.Right - childRect.Left != width || childRect.Bottom - childRect.Top != height) {
            SetWindowPos(child, IntPtr.Zero, x, y, width, height, positionFlags);
            DwmFlush();
            moved = true;
          }
        }
        // Adaptive polling: 1ms only while the parent actually moves (with the
        // 1ms scheduler resolution armed for that period), easing to 8ms once
        // it settles and to 16ms once it stays parked long enough, at which
        // point the raised timer resolution is released again so an idle
        // window costs almost no wakeups and no system-wide timer pressure.
        stable = moved ? 0 : stable + 1;
        if (stable == 0) {
          if (!timerArmed) { try { timeBeginPeriod(1); } catch {} timerArmed = true; }
          Thread.Sleep(1);
        } else if (stable < 32) {
          Thread.Sleep(stable >= 8 ? 8 : 1);
        } else {
          if (timerArmed) { try { timeEndPeriod(1); } catch {} timerArmed = false; }
          Thread.Sleep(16);
        }
      }
    } finally {
      if (timerArmed) { try { timeEndPeriod(1); } catch {} }
    }
  }

  // True embedding: the child becomes a WS_CHILD of the parent, so the OS moves
  // it atomically with the parent (zero drag jitter) and clips it to the client
  // area (zero detachment). Only the size is re-applied here, because a child
  // window does not auto-stretch on parent resize; move needs no polling at all.
  public static void Dock(long childValue, long parentValue, int left, int top, int right, int bottom) {
    var child = new IntPtr(childValue); var parent = new IntPtr(parentValue);
    SetParent(child, parent);
    try {
      long style = GetWindowLongPtr(child, GWL_STYLE).ToInt64();
      style = (style | WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS) & ~(WS_POPUP | WS_CAPTION | WS_THICKFRAME | WS_SYSMENU | WS_MINIMIZEBOX | WS_MAXIMIZEBOX);
      SetWindowLongPtr(child, GWL_STYLE, new IntPtr(style));
      SetWindowPos(child, IntPtr.Zero, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED | SWP_NOACTIVATE);
    } catch {}
    const uint positionFlags = SWP_NOACTIVATE | SWP_NOZORDER | SWP_SHOWWINDOW;
    while (IsWindow(child) && IsWindow(parent)) {
      RECT clientRect, childRect;
      if (GetClientRect(parent, out clientRect)) {
        int width = Math.Max(1, clientRect.Right - clientRect.Left - left - right);
        int height = Math.Max(1, clientRect.Bottom - clientRect.Top - top - bottom);
        if (GetWindowRect(child, out childRect) && (childRect.Right - childRect.Left != width || childRect.Bottom - childRect.Top != height)) {
          SetWindowPos(child, IntPtr.Zero, left, top, width, height, positionFlags);
        }
      }
      Thread.Sleep(16);
    }
  }

  public static int Main(string[] args) {
    try {
      if(args.Length == 1 && args[0] == "--self-test") return IntPtr.Size == 8 ? 0 : 2;
      if(args.Length == 3 && args[0] == "owner") {
        SetWindowLongPtr(new IntPtr(long.Parse(args[1])), -8, new IntPtr(long.Parse(args[2]))); return 0;
      }
      if(args.Length != 7 || (args[0] != "follow" && args[0] != "dock")) return 2;
      if(args[0] == "dock") {
        Dock(long.Parse(args[1]),long.Parse(args[2]),int.Parse(args[3]),int.Parse(args[4]),int.Parse(args[5]),int.Parse(args[6]));
      } else {
        Run(long.Parse(args[1]),long.Parse(args[2]),int.Parse(args[3]),int.Parse(args[4]),int.Parse(args[5]),int.Parse(args[6]));
      }
      return 0;
    } catch { return 1; }
  }
}
