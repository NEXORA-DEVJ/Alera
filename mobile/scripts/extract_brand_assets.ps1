# ==============================================================================
# ALERA - Script de Extracción y Generación de Activos de Marca en Alta Definición
# ==============================================================================

Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\LENOVO\.gemini\antigravity\brain\220f219c-06ba-4c1b-a86b-c1262c8379bc\.user_uploaded"
$assetsDir = "C:\Users\LENOVO\OneDrive\Escritorio\Alera\mobile\assets"

if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

$imgIconsPath   = Join-Path $brainDir "media_1792093049850_f9d82f73.jpg" # Icons & Favicon
$imgLogosPath   = Join-Path $brainDir "media_1792093049854_b06d9256.jpg" # Main Logos
$imgNotifsPath  = Join-Path $brainDir "media_1792093049863_1ab8d1e9.jpg" # Notifications & Rich Badges

Write-Host ">>> Iniciando procesamiento de imagenes oficiales de ALERA..." -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. PROCESAR HOJA DE ICONOS (media_1792093049850_f9d82f73.jpg)
# ------------------------------------------------------------------------------
if (Test-Path $imgIconsPath) {
    Write-Host "`n>> Procesando iconos de lanzador (App Launcher)..." -ForegroundColor Yellow
    $bmp = [System.Drawing.Bitmap]::FromFile($imgIconsPath)
    $w = $bmp.Width
    $h = $bmp.Height

    # 1.1 Detectar límites del icono MODO CLARO (cuadro blanco a la derecha)
    $minX_light = $w; $maxX_light = 0; $minY_light = $h; $maxY_light = 0
    for ($y = [int]($h * 0.12); $y -lt [int]($h * 0.75); $y += 2) {
        for ($x = [int]($w * 0.55); $x -lt [int]($w * 0.95); $x += 2) {
            $pixel = $bmp.GetPixel($x, $y)
            if ($pixel.R -gt 240 -and $pixel.G -gt 240 -and $pixel.B -gt 240) {
                if ($x -lt $minX_light) { $minX_light = $x }
                if ($x -gt $maxX_light) { $maxX_light = $x }
                if ($y -lt $minY_light) { $minY_light = $y }
                if ($y -gt $maxY_light) { $maxY_light = $y }
            }
        }
    }

    $iconW = $maxX_light - $minX_light
    $iconH = $maxY_light - $minY_light
    $side = [Math]::Min($iconW, $iconH) - 10 # Margen interno limpio
    Write-Host "   Dimension exacta del icono: $side x $side px" -ForegroundColor Gray

    # 1.2 Detectar centro del icono MODO OSCURO a la izquierda (buscando el isotipo naranja)
    $sumX = 0; $sumY = 0; $count = 0
    for ($y = [int]($h * 0.15); $y -lt [int]($h * 0.70); $y += 2) {
        for ($x = [int]($w * 0.08); $x -lt [int]($w * 0.42); $x += 2) {
            $pixel = $bmp.GetPixel($x, $y)
            if ($pixel.R -gt 200 -and $pixel.G -gt 70 -and $pixel.G -lt 140 -and $pixel.B -lt 60) {
                $sumX += $x
                $sumY += $y
                $count++
            }
        }
    }

    if ($count -gt 0) {
        $centerX_dark = [int]($sumX / $count)
        $centerY_dark = [int]($sumY / $count)
    } else {
        $centerX_dark = [int]($w * 0.25)
        $centerY_dark = [int]($minY_light + $side / 2)
    }

    # Ajuste milimétrico para centrar perfectamente el squircle y evitar texto lateral
    $startX_dark = [int]($centerX_dark - $side / 2 - 20)
    $startY_dark = [int]($centerY_dark - $side / 2)
    if ($startX_dark -lt 0) { $startX_dark = 0 }

    # Generar Icono Oscuro Oficial (1024x1024 estándar para iOS / Android)
    $targetSize = 1024
    $darkIconBmp = New-Object System.Drawing.Bitmap $targetSize, $targetSize
    $g = [System.Drawing.Graphics]::FromImage($darkIconBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $srcRect = [System.Drawing.Rectangle]::new($startX_dark, $startY_dark, $side, $side)
    $dstRect = [System.Drawing.Rectangle]::new(0, 0, $targetSize, $targetSize)
    $g.DrawImage($bmp, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $iconPath = Join-Path $assetsDir "icon.png"
    $darkIconBmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "   [OK] Guardado icono oficial centrado y limpio: icon.png (1024x1024)" -ForegroundColor Green

    # Android foreground
    $fgPath = Join-Path $assetsDir "android-icon-foreground.png"
    $darkIconBmp.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # 1.3 Detectar FAVICON & SPLASH ICON (Círculo blanco central inferior)
    $minX_fav = $w; $maxX_fav = 0; $minY_fav = $h; $maxY_fav = 0
    for ($y = [int]($h * 0.65); $y -lt [int]($h * 0.95); $y += 2) {
        for ($x = [int]($w * 0.38); $x -lt [int]($w * 0.62); $x += 2) {
            $pixel = $bmp.GetPixel($x, $y)
            if ($pixel.R -gt 240 -and $pixel.G -gt 240 -and $pixel.B -gt 240) {
                if ($x -lt $minX_fav) { $minX_fav = $x }
                if ($x -gt $maxX_fav) { $maxX_fav = $x }
                if ($y -lt $minY_fav) { $minY_fav = $y }
                if ($y -gt $maxY_fav) { $maxY_fav = $y }
            }
        }
    }

    if ($maxX_fav -gt $minX_fav) {
        $favW = $maxX_fav - $minX_fav
        $favH = $maxY_fav - $minY_fav
        $favSide = [Math]::Min($favW, $favH)
        $favCenterX = [int](($minX_fav + $maxX_fav) / 2)
        $favCenterY = [int](($minY_fav + $maxY_fav) / 2)
        $favStartX = [int]($favCenterX - $favSide / 2)
        $favStartY = [int]($favCenterY - $favSide / 2)

        $favBmp = New-Object System.Drawing.Bitmap 512, 512
        $gFav = [System.Drawing.Graphics]::FromImage($favBmp)
        $gFav.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gFav.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gFav.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $gFav.DrawImage($bmp, [System.Drawing.Rectangle]::new(0, 0, 512, 512), [System.Drawing.Rectangle]::new($favStartX, $favStartY, $favSide, $favSide), [System.Drawing.GraphicsUnit]::Pixel)
        $gFav.Dispose()

        $faviconPath = Join-Path $assetsDir "favicon.png"
        $favBmp.Save($faviconPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $splashBadgePath = Join-Path $assetsDir "splash-badge.png"
        $favBmp.Save($splashBadgePath, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "   [OK] Guardado favicon y splash badge: favicon.png & splash-badge.png" -ForegroundColor Green
    }

    $bmp.Dispose()
}

# ------------------------------------------------------------------------------
# 2. PROCESAR NOTIFICACIONES & ALERTAS (media_1792093049863_1ab8d1e9.jpg)
# ------------------------------------------------------------------------------
if (Test-Path $imgNotifsPath) {
    Write-Host "`n>> Procesando iconos de notificacion..." -ForegroundColor Yellow
    $bmpNotif = [System.Drawing.Bitmap]::FromFile($imgNotifsPath)
    $nw = $bmpNotif.Width
    $nh = $bmpNotif.Height

    # 2.1 Extraer icono monocromatico (White on Transparent)
    $minX_mono = $nw; $maxX_mono = 0; $minY_mono = $nh; $maxY_mono = 0
    for ($y = [int]($nh * 0.28); $y -lt [int]($nh * 0.58); $y += 2) {
        for ($x = [int]($nw * 0.08); $x -lt [int]($nw * 0.32); $x += 2) {
            $pixel = $bmpNotif.GetPixel($x, $y)
            if ($pixel.R -gt 220 -and $pixel.G -gt 220 -and $pixel.B -gt 220) {
                if ($x -lt $minX_mono) { $minX_mono = $x }
                if ($x -gt $maxX_mono) { $maxX_mono = $x }
                if ($y -lt $minY_mono) { $minY_mono = $y }
                if ($y -gt $maxY_mono) { $maxY_mono = $y }
            }
        }
    }

    if ($maxX_mono -gt $minX_mono) {
        $monoW = $maxX_mono - $minX_mono
        $monoH = $maxY_mono - $minY_mono
        $monoSide = [Math]::Max($monoW, $monoH)
        $monoCenterX = [int](($minX_mono + $maxX_mono) / 2)
        $monoCenterY = [int](($minY_mono + $maxY_mono) / 2)
        $monoStartX = [int]($monoCenterX - $monoSide / 2)
        $monoStartY = [int]($monoCenterY - $monoSide / 2)

        $monoBmp = New-Object System.Drawing.Bitmap $monoSide, $monoSide, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        for ($py = 0; $py -lt $monoSide; $py++) {
            for ($px = 0; $px -lt $monoSide; $px++) {
                $srcX = $monoStartX + $px
                $srcY = $monoStartY + $py
                if ($srcX -ge 0 -and $srcX -lt $nw -and $srcY -ge 0 -and $srcY -lt $nh) {
                    $srcPixel = $bmpNotif.GetPixel($srcX, $srcY)
                    $lum = [int](($srcPixel.R + $srcPixel.G + $srcPixel.B) / 3)
                    if ($lum -gt 80) {
                        $alpha = [Math]::Min(255, [int](($lum - 80) * 1.5))
                        $monoBmp.SetPixel($px, $py, [System.Drawing.Color]::FromArgb($alpha, 255, 255, 255))
                    } else {
                        $monoBmp.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                    }
                }
            }
        }

        $finalNotifBmp = New-Object System.Drawing.Bitmap 96, 96, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $gMono = [System.Drawing.Graphics]::FromImage($finalNotifBmp)
        $gMono.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gMono.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gMono.DrawImage($monoBmp, 0, 0, 96, 96)
        $gMono.Dispose()
        $monoBmp.Dispose()

        $notifIconPath = Join-Path $assetsDir "notification-icon.png"
        $finalNotifBmp.Save($notifIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $finalNotifBmp.Dispose()
        Write-Host "   [OK] Guardado icono monocromatico transparente: notification-icon.png (96x96)" -ForegroundColor Green
    }

    # 2.2 Extraer Rich Push Badge (Dark Mode y Light Mode en el centro, sin texto inferior)
    $darkBadgeCenterX = [int]($nw * 0.50)
    $darkBadgeCenterY = [int]($nh * 0.405) # Centrado estricto sobre el círculo
    $badgeSide = [int]($nw * 0.130)        # Ajustado para recortar solo el círculo con su aro

    $darkX = [int]($darkBadgeCenterX - $badgeSide / 2)
    $darkY = [int]($darkBadgeCenterY - $badgeSide / 2)
    $srcRectDark = [System.Drawing.Rectangle]::new($darkX, $darkY, $badgeSide, $badgeSide)
    $dstRect512 = [System.Drawing.Rectangle]::new(0, 0, 512, 512)

    $badgeDarkBmp = New-Object System.Drawing.Bitmap 512, 512
    $gBD = [System.Drawing.Graphics]::FromImage($badgeDarkBmp)
    $gBD.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gBD.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gBD.DrawImage($bmpNotif, $dstRect512, $srcRectDark, [System.Drawing.GraphicsUnit]::Pixel)
    $gBD.Dispose()
    $badgeDarkPath = Join-Path $assetsDir "notification-badge-dark.png"
    $badgeDarkBmp.Save($badgeDarkPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $badgeDarkBmp.Dispose()
    Write-Host "   [OK] Guardado badge oscuro sin texto: notification-badge-dark.png (512x512)" -ForegroundColor Green

    # Badge Claro (abajo en el centro, sin texto inferior)
    $lightBadgeCenterY = [int]($nh * 0.725)
    $lightX = [int]($darkBadgeCenterX - $badgeSide / 2)
    $lightY = [int]($lightBadgeCenterY - $badgeSide / 2)
    $srcRectLight = [System.Drawing.Rectangle]::new($lightX, $lightY, $badgeSide, $badgeSide)

    $badgeLightBmp = New-Object System.Drawing.Bitmap 512, 512
    $gBL = [System.Drawing.Graphics]::FromImage($badgeLightBmp)
    $gBL.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gBL.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gBL.DrawImage($bmpNotif, $dstRect512, $srcRectLight, [System.Drawing.GraphicsUnit]::Pixel)
    $gBL.Dispose()
    $badgeLightPath = Join-Path $assetsDir "notification-badge-light.png"
    $badgeLightBmp.Save($badgeLightPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $badgeLightBmp.Dispose()
    Write-Host "   [OK] Guardado badge claro sin texto: notification-badge-light.png (512x512)" -ForegroundColor Green

    $bmpNotif.Dispose()
}

# ------------------------------------------------------------------------------
# 3. GENERAR PANTALLA SPLASH OFICIAL DE ALERA (splash.png) CON EL LOGO REAL
# ------------------------------------------------------------------------------
Write-Host "`n>> Construyendo pantalla de inicio oficial (Splash Screen) con logo vectorial original..." -ForegroundColor Yellow

$splashW = 1242
$splashH = 2688
$splashBmp = New-Object System.Drawing.Bitmap $splashW, $splashH
$gSplash = [System.Drawing.Graphics]::FromImage($splashBmp)
$gSplash.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gSplash.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# Fondo Carbon Oscuro oficial de ALERA #0D0F12
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 13, 15, 18))
$gSplash.FillRectangle($bgBrush, 0, 0, $splashW, $splashH)
$bgBrush.Dispose()

# Extraer el logo horizontal completo de la lamina oficial (media_1792093049854_b06d9256.jpg)
if (Test-Path $imgLogosPath) {
    $bmpLogos = [System.Drawing.Bitmap]::FromFile($imgLogosPath)
    $lw = $bmpLogos.Width
    $lh = $bmpLogos.Height

    # Delimitar el logo horizontal de Modo Oscuro en la mitad superior
    $minLx = $lw; $maxLx = 0; $minLy = $lh; $maxLy = 0
    for ($y = [int]($lh * 0.10); $y -lt [int]($lh * 0.48); $y += 2) {
        for ($x = [int]($lw * 0.08); $x -lt [int]($lw * 0.92); $x += 2) {
            $px = $bmpLogos.GetPixel($x, $y)
            if ($px.R -gt 80 -or $px.G -gt 80 -or $px.B -gt 80) {
                if ($x -lt $minLx) { $minLx = $x }
                if ($x -gt $maxLx) { $maxLx = $x }
                if ($y -lt $minLy) { $minLy = $y }
                if ($y -gt $maxLy) { $maxLy = $y }
            }
        }
    }

    if ($maxLx -gt $minLx) {
        $logoCropW = $maxLx - $minLx
        $logoCropH = $maxLy - $minLy
        $srcLogoRect = [System.Drawing.Rectangle]::new($minLx, $minLy, $logoCropW, $logoCropH)

        # Dibujar en el centro del Splash
        $targetLogoW = [int]($splashW * 0.85)
        $targetLogoH = [int]($targetLogoW * ($logoCropH / $logoCropW))
        $targetLogoX = [int](($splashW - $targetLogoW) / 2)
        $targetLogoY = [int](($splashH - $targetLogoH) / 2 - 80)

        $dstLogoRect = [System.Drawing.Rectangle]::new($targetLogoX, $targetLogoY, $targetLogoW, $targetLogoH)
        $gSplash.DrawImage($bmpLogos, $dstLogoRect, $srcLogoRect, [System.Drawing.GraphicsUnit]::Pixel)
        Write-Host "   [OK] Logo oficial de la marca insertado fielmente en el Splash." -ForegroundColor Gray
    }
    $bmpLogos.Dispose()
}

$gSplash.Dispose()

$splashPath = Join-Path $assetsDir "splash.png"
$splashBmp.Save($splashPath, [System.Drawing.Imaging.ImageFormat]::Png)
$splashBmp.Dispose()
Write-Host "   [OK] Guardada pantalla splash oficial: splash.png (1242x2688)" -ForegroundColor Green

Write-Host "`n=== EXTRACCION COMPLETADA CON EXITO ===" -ForegroundColor Cyan
Get-ChildItem -Path $assetsDir -Filter "*.png" | Select-Object Name, Length
