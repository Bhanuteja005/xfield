$captureRoot = Split-Path -Parent $PSScriptRoot
$nodePath = (Get-Command node).Source
Start-Process -FilePath $nodePath -ArgumentList @('"' + (Join-Path $PSScriptRoot 'capture.mjs') + '"') -WorkingDirectory $captureRoot -WindowStyle Hidden
