Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$icons = Join-Path $root 'assets\icons'

function RenderIcon([int]$size) {
  $bitmap = New-Object System.Drawing.Bitmap $size,$size
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $scale = $size / 128
  $background = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(30,41,59))
  $g.FillRectangle($background,0,0,$size,$size); $background.Dispose()
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(248,250,252)),(13*$scale)
  $pen.StartCap=[System.Drawing.Drawing2D.LineCap]::Round; $pen.EndCap=[System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($pen,20*$scale,96*$scale,20*$scale,38*$scale)
  $g.DrawBezier($pen,20*$scale,38*$scale,20*$scale,30*$scale,26*$scale,24*$scale,34*$scale,24*$scale)
  $g.DrawBezier($pen,34*$scale,24*$scale,42*$scale,24*$scale,47*$scale,28*$scale,51*$scale,36*$scale)
  $g.DrawLine($pen,51*$scale,36*$scale,64*$scale,56*$scale)
  $g.DrawLine($pen,64*$scale,56*$scale,77*$scale,36*$scale)
  $g.DrawBezier($pen,77*$scale,36*$scale,81*$scale,28*$scale,86*$scale,24*$scale,94*$scale,24*$scale)
  $g.DrawBezier($pen,94*$scale,24*$scale,102*$scale,24*$scale,108*$scale,30*$scale,108*$scale,38*$scale)
  $g.DrawLine($pen,108*$scale,38*$scale,108*$scale,96*$scale); $pen.Dispose()
  $accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,122,89))
  $g.FillEllipse($accent,57*$scale,75*$scale,14*$scale,14*$scale); $accent.Dispose()
  $bitmap.Save((Join-Path $icons ("icon-{0}.png" -f $size)),[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bitmap.Dispose()
}

16,48,128 | ForEach-Object { RenderIcon $_ }
