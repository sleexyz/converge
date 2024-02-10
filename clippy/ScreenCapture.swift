
import ScreenCaptureKit
import AVFoundation
import CoreImage
import CoreGraphics

class ScreenCaptureManager: NSObject {
    var captureSession: SCStream?
    
    func startCapture() {
        let configuration = SCStreamConfiguration()
        // Additional configuration as needed
        
        do {
            shareableContent = SC
            captureSession = try SCStream(filter: SCContentFilter(display: SCShareableContent., excludingWindows: <#T##[SCWindow]#>), configuration: configuration, delegate: self, delegateQueue: .main)
            captureSession?.startCapture(completionHandler: { error in
                if let error = error {
                    print("Error starting capture: \(error.localizedDescription)")
                } else {
                    print("Capture started successfully.")
                }
            })
        } catch {
            print("Failed to start capture: \(error.localizedDescription)")
        }
    }
    
    func stopCapture() {
        captureSession?.stopCapture(completionHandler: {
            print("Capture stopped.")
        })
    }
    
    func saveCGImageToDisk(_ cgImage: CGImage, url: URL) {
        let bitmapRep = NSBitmapImageRep(cgImage: cgImage)
        guard let pngData = bitmapRep.representation(using: .png, properties: [:]) else { return }
        try? pngData.write(to: url)
    }
}

extension ScreenCaptureManager: SCStreamDelegate {
    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, sampleBufferType: SCSampleBufferType) {
        guard sampleBufferType == .video else { return }
        
        // Convert CMSampleBuffer to CGImage
        if let cgImage = CMSampleBufferGetImageBuffer(sampleBuffer)?.toCGImage() {
            // Here, you can save the CGImage to disk or process it further as needed
            let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
            let fileName = "screenshot.png"
            let fileURL = documentsDirectory.appendingPathComponent(fileName)
            saveCGImageToDisk(cgImage, url: fileURL)
            print("Screenshot saved to \(fileURL)")
        }
    }
}

extension CVPixelBuffer {
    func toCGImage() -> CGImage? {
        let ciImage = CIImage(cvPixelBuffer: self)
        let context = CIContext(options: nil)
        return context.createCGImage(ciImage, from: ciImage.extent)
    }
}

