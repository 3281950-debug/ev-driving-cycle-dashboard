Option Explicit
Dim fso, shell, root, script, powershell, command, argument, result
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
script = fso.BuildPath(root, "launcher\launch.ps1")
powershell = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
If Not fso.FileExists(script) Then
  MsgBox "启动文件缺失，请完整解压交付包后重试。", 16, "电动车仪表盘"
  WScript.Quit 1
End If
argument = ""
If InStr(WScript.ScriptName, "关闭") > 0 Then argument = " -Stop"
command = Chr(34) & powershell & Chr(34) & " -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & script & Chr(34) & argument
On Error Resume Next
result = shell.Run(command, 0, False)
If Err.Number <> 0 Then
  MsgBox "无法启动 Windows PowerShell：" & Err.Description & "。可尝试备用启动.cmd。", 16, "电动车仪表盘"
  WScript.Quit 1
End If
