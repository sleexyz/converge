use std::{sync::Arc, time::{SystemTime, UNIX_EPOCH}};
use tauri::api::path;
use xcap::Monitor;

pub fn capture(config: Arc<tauri::Config>) {
    let start = SystemTime::now();
    let app_cache_dir = path::app_cache_dir(&config)
        .unwrap()
        .to_str()
        .map(|s| s.to_string())
        .unwrap();

    for screen in Monitor::all().unwrap() {
        println!("capturer {screen:?}");
        let image = screen.capture_image().unwrap();
        let file_path = format!(
            "{}/screenshot-{}-{}.png",
            app_cache_dir,
            screen.id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("time error")
                .as_secs()
        );

        println!("file_path: {:?}", file_path);
        image.save(&file_path).unwrap();
    }
    println!("Done: {:?}", start.elapsed().ok());
}
