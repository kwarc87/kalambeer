Add-Type -AssemblyName System.Drawing

$W = 1200; $H = 630
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

$g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,17,14,20))), 0, 0, $W, $H)
$g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,192,52,75))), 0, 0, $W, 4)

$logo  = [System.Drawing.Image]::FromFile("$PSScriptRoot\..\img\kalambeer.png")
$scale = [Math]::Min(700.0/$logo.Width, 160.0/$logo.Height)
$lW = [int]($logo.Width*$scale); $lH = [int]($logo.Height*$scale)
$g.DrawImage($logo, [int](($W-$lW)/2), 140, $lW, $lH)

$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255,192,52,75), 2)
$g.DrawLine($pen, 80, 340, $W-80, 340)

$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center

$f1 = New-Object System.Drawing.Font("Segoe UI", 52, [System.Drawing.FontStyle]::Regular)
$g.DrawString("gra słowna", $f1, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,240,237,245))), ($W/2), 362, $sf)

$f2 = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Regular)
$g.DrawString("autorstwa Jakuba Kwarcińskiego", $f2, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,153,144,168))), ($W/2), 458, $sf)

$g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,192,52,75))), 0, $H-4, $W, 4)

$bmp.Save("$PSScriptRoot\..\img\og-card.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $logo.Dispose()
Write-Host "og-card.png saved"
