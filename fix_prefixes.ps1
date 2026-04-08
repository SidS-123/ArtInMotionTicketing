$json_file = 'c:\Users\uomsw\Desktop\VSCODE\ArtInMotionTicketing\user_page\final-seatmap.json'
$content = [System.IO.File]::ReadAllText($json_file)

# Replace all two-letter prefixes with single letters
$replacements = @(
    ('"RT-', '"T-'),
    ('"LT-', '"T-'),
    ('"RS-', '"S-'),
    ('"LS-', '"S-'),
    ('"RR-', '"R-'),
    ('"LR-', '"R-'),
    ('"RQ-', '"Q-'),
    ('"LQ-', '"Q-'),
    ('"RP-', '"P-'),
    ('"LP-', '"P-'),
    ('"RO-', '"O-'),
    ('"LO-', '"O-'),
    ('"RN-', '"N-'),
    ('"LN-', '"N-'),
    ('"RM-', '"M-'),
    ('"LM-', '"M-'),
    ('"RL-', '"L-'),
    ('"RB-', '"B-'),
    ('"LB-', '"B-'),
    ('"RC-', '"C-'),
    ('"LC-', '"C-'),
    ('"RA-', '"A-'),
    ('"LA-', '"A-')
)

foreach ($pair in $replacements) {
    $content = $content -replace [regex]::Escape($pair[0]), $pair[1]
}

[System.IO.File]::WriteAllText($json_file, $content)
Write-Host "Prefix replacement completed successfully"
