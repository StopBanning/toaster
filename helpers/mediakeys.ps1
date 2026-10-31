# The player bar's media keys on Windows: play/pause, next or previous (helpers/player.cjs runs this with -File, as
# main.js runs the other helpers), each pressed and let go with SendInput as a keyboard's media keys are (the
# extended-key flag): VK_MEDIA_PLAY_PAUSE, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PREV_TRACK. The INPUT struct has to be as big
# as its biggest member, the mouse's, or SendInput refuses it: hence the union.
param([Parameter(Mandatory)][ValidateSet('playpause', 'next', 'previous')][string]$Key)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class ToasterKeys {
  [StructLayout(LayoutKind.Sequential)]
  struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)]
  struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)]
  struct INPUTUNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)]
  struct INPUT { public uint type; public INPUTUNION u; }
  [DllImport("user32.dll", SetLastError = true)]
  static extern uint SendInput(uint count, INPUT[] inputs, int size);
  public static void Press(ushort vk) {
    INPUT[] keys = new INPUT[2];
    keys[0].type = 1; keys[0].u.ki.wVk = vk; keys[0].u.ki.dwFlags = 1;
    keys[1].type = 1; keys[1].u.ki.wVk = vk; keys[1].u.ki.dwFlags = 3;
    if (SendInput(2, keys, Marshal.SizeOf(typeof(INPUT))) != 2) throw new Win32Exception(Marshal.GetLastWin32Error());
  }
}
'@
$vk = @{ playpause = 0xB3; next = 0xB0; previous = 0xB1 }[$Key]
[ToasterKeys]::Press([uint16]$vk)
