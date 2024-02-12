use base64::prelude::*;
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