use swift_rs::swift;
use swift_rs::SRData;

swift!(pub fn start());
swift!(pub fn get_last_frame() -> Option<SRData>);