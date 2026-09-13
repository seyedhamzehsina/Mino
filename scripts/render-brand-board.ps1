Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root 'store-assets\mino-brand-board.png'
$screenshotPath = Join-Path $root 'store-assets\screenshots\mino-workspace-light-1280x800.png'

$canvas = New-Object System.Drawing.Bitmap 1800,1900
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$graphics.Clear([System.Drawing.Color]::FromArgb(250,250,249))

function Color([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function Font([single]$size, [bool]$bold = $false) {
  $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  New-Object System.Drawing.Font('Segoe UI', $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
}
function Text([string]$value, [single]$x, [single]$y, [single]$size, [string]$hex = '#1E293B', [bool]$bold = $false) {
  $font = Font $size $bold
  $brush = New-Object System.Drawing.SolidBrush (Color $hex)
  $graphics.DrawString($value, $font, $brush, $x, $y)
  $font.Dispose(); $brush.Dispose()
}
function Rule([single]$x1, [single]$y1, [single]$x2, [single]$y2, [string]$hex = '#E2E8F0', [single]$width = 2) {
  $pen = New-Object System.Drawing.Pen (Color $hex), $width
  $graphics.DrawLine($pen, $x1, $y1, $x2, $y2); $pen.Dispose()
}
function Dot([single]$x, [single]$y, [single]$radius, [string]$hex) {
  $brush = New-Object System.Drawing.SolidBrush (Color $hex)
  $graphics.FillEllipse($brush, $x-$radius, $y-$radius, $radius*2, $radius*2); $brush.Dispose()
}
function Mark([single]$x, [single]$y, [single]$scale, [string]$hex = '#1E293B', [string]$accent = '#FF7A59') {
  $pen = New-Object System.Drawing.Pen (Color $hex), (7*$scale)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round; $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawBezier($pen, $x+(11*$scale),$y+(50*$scale), $x+(11*$scale),$y+(20*$scale), $x+(12*$scale),$y+(12*$scale), $x+(18*$scale),$y+(12*$scale))
  $graphics.DrawBezier($pen, $x+(18*$scale),$y+(12*$scale), $x+(23*$scale),$y+(12*$scale), $x+(25*$scale),$y+(17*$scale), $x+(32*$scale),$y+(29*$scale))
  $graphics.DrawBezier($pen, $x+(32*$scale),$y+(29*$scale), $x+(39*$scale),$y+(17*$scale), $x+(41*$scale),$y+(12*$scale), $x+(46*$scale),$y+(12*$scale))
  $graphics.DrawBezier($pen, $x+(46*$scale),$y+(12*$scale), $x+(52*$scale),$y+(12*$scale), $x+(53*$scale),$y+(20*$scale), $x+(53*$scale),$y+(50*$scale))
  $pen.Dispose(); Dot ($x+(32*$scale)) ($y+(41*$scale)) (3.5*$scale) $accent
}
function Swatch([single]$x, [single]$y, [string]$hex, [string]$label) {
  $brush = New-Object System.Drawing.SolidBrush (Color $hex); $graphics.FillRectangle($brush,$x,$y,72,72); $brush.Dispose()
  $pen = New-Object System.Drawing.Pen (Color '#D7DEE8'),1; $graphics.DrawRectangle($pen,$x,$y,72,72); $pen.Dispose()
  Text $label ($x-2) ($y+82) 15 '#64748B'
}

# Main logo / identity
Mark 126 95 7 '#1E293B' '#FF9F5A'
Text 'Mino' 170 510 88 '#1E293B' $false
Text 'Less to manage. More to focus on.' 126 620 33 '#64748B'
Rule 760 55 760 685 '#E2E8F0' 2

# Concept and explanation
Text 'Concept' 820 70 28 '#1E293B' $true
Text 'Mino is a minimal new-tab extension that' 820 125 22 '#475569'
Text 'brings together the essentials you need' 820 156 22 '#475569'
Text 'every day: shortcuts, calendar, clock,' 820 187 22 '#475569'
Text 'and Todo List - in a calm, focused' 820 218 22 '#475569'
Text 'workspace.' 820 249 22 '#475569'
Text 'Meaning behind the logo' 820 330 26 '#1E293B' $true

Mark 835 405 1.7 '#1E293B' '#FF9F5A'
Text '+' 970 440 30 '#1E293B' $true
Dot 1050 447 11 '#FF9F5A'; Rule 1050 410 1050 390 '#CBD5E1' 5; Rule 1050 484 1050 504 '#CBD5E1' 5; Rule 1013 447 993 447 '#CBD5E1' 5; Rule 1087 447 1107 447 '#CBD5E1' 5
Text '+' 1140 440 30 '#1E293B' $true
for ($r=0; $r -lt 2; $r++) { for ($c=0; $c -lt 2; $c++) { $b=New-Object System.Drawing.SolidBrush (Color '#1E293B'); $graphics.FillRectangle($b,1200+($c*32),420+($r*32),23,23); $b.Dispose() } }
Text '=' 1305 440 30 '#1E293B' $true
Mark 1380 405 1.7 '#1E293B' '#FF9F5A'
Text 'Letter M' 830 540 17 '#1E293B' $true; Text 'A simple, memorable' 830 567 15 '#64748B'; Text 'starting point.' 830 589 15 '#64748B'
Text 'Focus point' 1010 540 17 '#1E293B' $true; Text 'A warm moment of' 1010 567 15 '#64748B'; Text 'attention and time.' 1010 589 15 '#64748B'
Text 'Essential tools' 1195 540 17 '#1E293B' $true; Text 'Shortcuts, calendar,' 1195 567 15 '#64748B'; Text 'and tasks in balance.' 1195 589 15 '#64748B'
Text 'Mino mark' 1380 540 17 '#1E293B' $true; Text 'One calm workspace' 1380 567 15 '#64748B'; Text 'for every new tab.' 1380 589 15 '#64748B'

Rule 70 720 1730 720 '#E2E8F0' 2

# Principles
Text 'Design principles' 75 755 26 '#1E293B' $true
Dot 100 818 13 '#FFFFFF'; $p=New-Object System.Drawing.Pen (Color '#64748B'),3; $graphics.DrawRectangle($p,87,805,26,26); $p.Dispose()
Text 'Minimal & clear' 135 796 18 '#1E293B' $true; Text 'Focus on what matters. Nothing extra.' 135 821 16 '#64748B'
Dot 100 890 13 '#FFFFFF'; $p=New-Object System.Drawing.Pen (Color '#64748B'),3; $graphics.DrawEllipse($p,87,877,26,26); $p.Dispose(); Dot 100 890 5 '#FF9F5A'
Text 'Calm & friendly' 135 868 18 '#1E293B' $true; Text 'Soft forms make daily work feel lighter.' 135 893 16 '#64748B'
Dot 100 962 13 '#FF9F5A'; Text 'Focused' 135 940 18 '#1E293B' $true; Text 'The mark stays balanced, centred and quiet.' 135 965 16 '#64748B'
Text 'Brand personality' 75 1040 20 '#1E293B' $true
foreach ($entry in @(@('Minimal',75),@('Calm',175),@('Focused',255),@('Reliable',360),@('Modern',475))) { $pen=New-Object System.Drawing.Pen (Color '#CBD5E1'),1; $graphics.DrawRectangle($pen,$entry[1],1080,82,30); $pen.Dispose(); Text $entry[0] ($entry[1]+11) 1086 13 '#64748B' }

# Variations
Text 'Logo variations' 700 755 26 '#1E293B' $true
$cards=@(@(700,'#FFFFFF','#1E293B','Primary / Light'),@(940,'#1E293B','#FFFFFF','Inverse / Dark'),@(1180,'#F8FAFC','#1E293B','Icon only'),@(1420,'#FFFFFF','#1E293B','Horizontal'))
foreach ($card in $cards) { $b=New-Object System.Drawing.SolidBrush (Color $card[1]); $graphics.FillRectangle($b,$card[0],800,190,205); $b.Dispose(); $p=New-Object System.Drawing.Pen (Color '#E2E8F0'),1; $graphics.DrawRectangle($p,$card[0],800,190,205); $p.Dispose(); Mark ($card[0]+54) 838 1.8 $card[2] '#FF9F5A'; Text $card[3] ($card[0]+21) 1020 15 '#64748B' }

Rule 70 1155 1730 1155 '#E2E8F0' 2

# Palette/type
Text 'Color palette' 75 1190 22 '#1E293B' $true
Swatch 75 1240 '#1E293B' '#1E293B'; Swatch 175 1240 '#64748B' '#64748B'; Swatch 275 1240 '#E2E8F0' '#E2E8F0'; Swatch 375 1240 '#F8FAFC' '#F8FAFC'; Swatch 475 1240 '#FF9F5A' '#FF9F5A'
Text 'Typography' 75 1380 22 '#1E293B' $true
Text 'Aa' 75 1420 78 '#1E293B' $false
Text 'Segoe UI' 190 1435 23 '#1E293B' $true
Text 'Clean, modern and highly readable.' 190 1470 17 '#64748B'

# Real product mockup
Text 'Mino in use' 700 1190 22 '#1E293B' $true
$shot=[System.Drawing.Image]::FromFile($screenshotPath)
$graphics.DrawImage($shot,700,1235,980,613)
$shot.Dispose()
$p=New-Object System.Drawing.Pen (Color '#CBD5E1'),2; $graphics.DrawRectangle($p,700,1235,980,613); $p.Dispose()
Text 'A calm start for every new tab.' 1070 1860 18 '#64748B'

$canvas.Save($output,[System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose(); $canvas.Dispose()
Write-Output $output
