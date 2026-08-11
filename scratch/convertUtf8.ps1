$content = [System.IO.File]::ReadAllText("frontend\src\components\PortfolioDashboardView.jsx")
[System.IO.File]::WriteAllText("frontend\src\components\PortfolioDashboardView.jsx", $content, [System.Text.Encoding]::UTF8)
