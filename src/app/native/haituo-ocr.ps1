param([Parameter(Mandatory=$true)][string]$ImagePath)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.SoftwareBitmap,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrResult,Windows.Foundation,ContentType=WindowsRuntime]
function Await($Operation,[Type]$ResultType) {
 $method=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
 $task=$method.MakeGenericMethod($ResultType).Invoke($null,@($Operation))
 $task.GetAwaiter().GetResult()
}
$file=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath)) ([Windows.Storage.StorageFile])
$stream=Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
try {
 $decoder=Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
 $bitmap=Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
 try {
  $engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if($null -eq $engine){throw 'No OCR language pack installed. Install a language OCR pack in Windows Settings.'}
  $result=Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $blocks=@(foreach($line in $result.Lines){
   $left=[double]::PositiveInfinity;$top=[double]::PositiveInfinity;$right=0.0;$bottom=0.0
   foreach($word in $line.Words){$r=$word.BoundingRect;$left=[Math]::Min($left,$r.X);$top=[Math]::Min($top,$r.Y);$right=[Math]::Max($right,$r.X+$r.Width);$bottom=[Math]::Max($bottom,$r.Y+$r.Height)}
   if($right -gt $left -and $bottom -gt $top){@{original=$line.Text;x=$left*1000/$bitmap.PixelWidth;y=$top*1000/$bitmap.PixelHeight;width=($right-$left)*1000/$bitmap.PixelWidth;height=($bottom-$top)*1000/$bitmap.PixelHeight}}
  })
  @{blocks=$blocks}|ConvertTo-Json -Depth 5 -Compress
 } finally {$bitmap.Dispose()}
} finally {$stream.Dispose()}
