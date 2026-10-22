import Foundation
import Vision
import ImageIO
// The image is a temporary local crop; recognition never uploads it.
do {
 guard CommandLine.arguments.count == 2 else { throw NSError(domain:"HaituoOCR",code:1,userInfo:[NSLocalizedDescriptionKey:"Missing image"]) }
 let url = URL(fileURLWithPath:CommandLine.arguments[1])
 let request = VNRecognizeTextRequest()
 request.recognitionLevel = .accurate
 request.usesLanguageCorrection = true
 if #available(macOS 13.0, *) { request.automaticallyDetectsLanguage = true }
 try VNImageRequestHandler(url:url,options:[:]).perform([request])
 let blocks:[[String:Any]] = (request.results ?? []).compactMap { observation in
  guard let candidate = observation.topCandidates(1).first else { return nil }
  let b=observation.boundingBox
  return ["original":candidate.string,"x":b.minX*1000,"y":(1-b.maxY)*1000,"width":b.width*1000,"height":b.height*1000]
 }
 let data = try JSONSerialization.data(withJSONObject:["blocks":blocks])
 FileHandle.standardOutput.write(data)
} catch { FileHandle.standardError.write(Data(error.localizedDescription.utf8));exit(1) }
