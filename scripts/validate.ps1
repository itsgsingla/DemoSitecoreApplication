param([string]$solution)

Add-Type -Path "C:\Program Files (x86)\Reference Assemblies\Microsoft\MSBuild\v14.0\Microsoft.Build.dll"

$count = 0
$slnFile = [Microsoft.Build.Construction.SolutionFile]::Parse($solution)

$slnFile.ProjectsInOrder | Where-Object { $_.ProjectType -eq "KnownToBeMSBuildFormat" } | % {
	$outValue = $null
	$found = $_.ProjectConfigurations.TryGetValue("Debug|Any CPU", [ref]$outValue)

    if($found)
    {
        if($outValue.IncludeInBuild) # This bit is set by the MS code when parsing the project configurations with ...Build.0
        {
          $count++
        }
    }
 } #End collection iterate
 
 Write-Output "Solution $1 validated, found $count projects for build."