# PortalDent Digital - Native Static Web Server
# Servidor web local nativo en PowerShell (no requiere Node.js / NPM)

$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "=========================================================="
    Write-Host "PortalDent Digital - Servidor Web Nativo Iniciado"
    Write-Host "Dirección: http://localhost:$port/"
    Write-Host "Presione Ctrl+C en esta consola para detener el servidor."
    Write-Host "=========================================================="

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Clean request path
        $url = $request.Url.LocalPath
        if ($url -eq "/") { $url = "/index.html" }
        
        # Map file system path relative to this script directory
        $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
        if (!$scriptDir) { $scriptDir = Get-Location }
        $path = Join-Path $scriptDir $url
        
        if (Test-Path $path -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($path)
            
            # Content-Type mapping
            if ($url.EndsWith(".html")) { $response.ContentType = "text/html; charset=utf-8" }
            elseif ($url.EndsWith(".css")) { $response.ContentType = "text/css; charset=utf-8" }
            elseif ($url.EndsWith(".js")) { $response.ContentType = "application/javascript; charset=utf-8" }
            elseif ($url.EndsWith(".png")) { $response.ContentType = "image/png" }
            elseif ($url.EndsWith(".jpg") -or $url.EndsWith(".jpeg")) { $response.ContentType = "image/jpeg" }
            elseif ($url.EndsWith(".svg")) { $response.ContentType = "image/svg+xml" }
            else { $response.ContentType = "application/octet-stream" }
            
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $errContent = [System.Text.Encoding]::UTF8.GetBytes("Error 404: Archivo no encontrado en PortalDent Server.")
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $errContent.Length
            $response.OutputStream.Write($errContent, 0, $errContent.Length)
        }
        $response.Close()
    }
}
catch {
    Write-Error $_
}
finally {
    if ($listener) {
        $listener.Stop()
        $listener.Close()
    }
}