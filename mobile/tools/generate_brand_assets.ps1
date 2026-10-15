# ========================================================
# ALERA - Generador de Recursos Visuales y Audio de Marca
# ========================================================
Add-Type -AssemblyName System.Drawing

$brandImageSrc = "C:\Users\LENOVO\.gemini\antigravity\brain\220f219c-06ba-4c1b-a86b-c1262c8379bc\.user_uploaded\media_1792085831605_14357f95.png"
$assetsDir = "C:\Users\LENOVO\OneDrive\Escritorio\Alera\mobile\assets"

if (-not (Test-Path $brandImageSrc)) {
    Write-Host "Error: No se encontró la imagen de marca en $brandImageSrc" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

$soundsDir = Join-Path $assetsDir "sounds"
if (-not (Test-Path $soundsDir)) {
    New-Item -ItemType Directory -Path $soundsDir -Force | Out-Null
}

$bmp = [System.Drawing.Bitmap]::FromFile($brandImageSrc)
$w = $bmp.Width
$h = $bmp.Height
Write-Host "Imagen fuente cargada: $w x $h pixeles" -ForegroundColor Cyan

# Función para recortar y redimensionar con alta calidad
function CropAndResize([System.Drawing.Bitmap]$source, [int]$x, [int]$y, [int]$cropW, [int]$cropH, [int]$targetW, [int]$targetH) {
    $rect = New-Object System.Drawing.Rectangle($x, $y, $cropW, $cropH)
    $cropped = $source.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $destBmp = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($cropped, 0, 0, $targetW, $targetH)
    $g.Dispose()
    $cropped.Dispose()
    return $destBmp
}

# 1. Launcher Icon (Modo Oscuro) - 1024x1024
Write-Host "Generando icon.png (1024x1024)..." -ForegroundColor Yellow
$iconX = [int]($w * 0.518)
$iconY = [int]($h * 0.170)
$iconSize = [int]($w * 0.125)
$appIcon = CropAndResize $bmp $iconX $iconY $iconSize $iconSize 1024 1024
$appIcon.Save((Join-Path $assetsDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$appIcon.Dispose()

# 2. Android Adaptive Foreground - 512x512
Write-Host "Generando android-icon-foreground.png (512x512)..." -ForegroundColor Yellow
$fgIcon = CropAndResize $bmp $iconX $iconY $iconSize $iconSize 512 512
$fgIcon.Save((Join-Path $assetsDir "android-icon-foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$fgIcon.Dispose()

# 3. Android Adaptive Background (#0B0D10) - 512x512
Write-Host "Generando android-icon-background.png (512x512)..." -ForegroundColor Yellow
$bgBmp = New-Object System.Drawing.Bitmap(512, 512)
$bgGraphics = [System.Drawing.Graphics]::FromImage($bgBmp)
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0B0D10")
$bgGraphics.Clear($bgColor)
$bgGraphics.Dispose()
$bgBmp.Save((Join-Path $assetsDir "android-icon-background.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bgBmp.Dispose()

# 4. Favicon - 192x192
Write-Host "Generando favicon.png (192x192)..." -ForegroundColor Yellow
$favX = [int]($w * 0.795)
$favY = [int]($h * 0.180)
$favSize = [int]($w * 0.080)
$favIcon = CropAndResize $bmp $favX $favY $favSize $favSize 192 192
$favIcon.Save((Join-Path $assetsDir "favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$favIcon.Dispose()

# 5. Icono de Notificación (Status Bar Monocromático Blanco sobre Transparente) - 96x96
Write-Host "Generando notification-icon.png (96x96 monocromo)..." -ForegroundColor Yellow
$notifX = [int]($w * 0.885)
$notifY = [int]($h * 0.180)
$notifSize = [int]($w * 0.085)
$rawNotif = CropAndResize $bmp $notifX $notifY $notifSize $notifSize 96 96

# Convertir pixeles a blanco puro preservando canal alfa (requerimiento estricto de Android Push)
$finalNotif = New-Object System.Drawing.Bitmap(96, 96, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($px = 0; $px -lt 96; $px++) {
    for ($py = 0; $py -lt 96; $py++) {
        $c = $rawNotif.GetPixel($px, $py)
        # Si el pixel tiene brillo suficiente y no es negro de fondo
        $brightness = ($c.R * 0.299 + $c.G * 0.587 + $c.B * 0.114)
        if ($c.A -gt 40 -and $brightness -gt 50) {
            $whiteColor = [System.Drawing.Color]::FromArgb($c.A, 255, 255, 255)
            $finalNotif.SetPixel($px, $py, $whiteColor)
        } else {
            $finalNotif.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}
$rawNotif.Dispose()
$finalNotif.Save((Join-Path $assetsDir "notification-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$finalNotif.Dispose()

# 6. Splash Screen (1284x2778)
Write-Host "Generando splash.png (1284x2778)..." -ForegroundColor Yellow
$splashBmp = New-Object System.Drawing.Bitmap(1284, 2778, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$splashG = [System.Drawing.Graphics]::FromImage($splashBmp)
$splashG.Clear([System.Drawing.ColorTranslator]::FromHtml("#0B0D10"))

# Extraer el logo principal completo (modo oscuro)
$logoX = [int]($w * 0.040)
$logoY = [int]($h * 0.140)
$logoW = [int]($w * 0.420)
$logoH = [int]($h * 0.190)
$logoBmp = CropAndResize $bmp $logoX $logoY $logoW $logoH 800 360

# Centrar el logo en el splash
$targetX = [int]((1284 - 800) / 2)
$targetY = [int]((2778 - 360) / 2)
$splashG.DrawImage($logoBmp, $targetX, $targetY)
$splashG.Dispose()
$logoBmp.Dispose()
$splashBmp.Save((Join-Path $assetsDir "splash.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$splashBmp.Dispose()

$bmp.Dispose()
Write-Host "Todos los recursos graficos han sido generados exitosamente en mobile/assets/" -ForegroundColor Green

# 7. Ejecutar recorte de audio a 4 segundos
Write-Host "`nRecortando sirena de emergencia a 4 segundos..." -ForegroundColor Cyan
Set-Location "C:\Users\LENOVO\OneDrive\Escritorio\Alera\mobile"
node ".\tools\trim_siren.js"
