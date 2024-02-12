use std::{sync::Arc, time::{SystemTime, UNIX_EPOCH}};
use tauri::api::path;
use xcap::Monitor;
use base64::prelude::*;
use image::ImageOutputFormat; // This assumes you're using the `image` crate for image manipulation
use std::io::Cursor;

use crate::ffi; // Add this import




pub async fn capture() -> Vec<String> {
    let data = unsafe { ffi::get_last_frame() };
    if let Some(data) = data {
        let base64_string = BASE64_STANDARD.encode(data);
        return vec![base64_string];
    } else {
        println!("No data");
        // Handle the None case or return an empty Vec or error
        return vec![];
    }
}

pub async fn capture_old(config: Arc<tauri::Config>) -> Vec<String> {
    let start = SystemTime::now();
    let app_cache_dir = path::app_cache_dir(&config)
        .unwrap()
        .to_str()
        .map(|s| s.to_string())
        .unwrap();

    let mut base64_images = Vec::new();

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

        let mut buf = Vec::new();
        let mut cursor = Cursor::new(&mut buf);
        image.write_to(&mut cursor, ImageOutputFormat::Png).unwrap();
        
        // Encode the PNG bytes to a base64 string
        let base64_string = BASE64_STANDARD.encode(buf);
        base64_images.push(base64_string);
    }
    println!("Done: {:?}", start.elapsed().ok());
    base64_images
}
