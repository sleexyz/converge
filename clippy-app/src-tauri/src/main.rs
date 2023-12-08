// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod main_window;
mod window_ext;

use tauri::{AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};
use tauri_plugin_autostart::MacosLauncher;
use window_ext::WindowExt;
use std::process;


fn make_tray() -> SystemTray {
    // <- a function that creates the system tray
    let menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("open".to_string(), "Open Emojinie"))
        .add_item(CustomMenuItem::new("settings", "Settings"))
        .add_item(CustomMenuItem::new("quit".to_string(), "Quit"));
    return SystemTray::new().with_menu(menu);
}

fn handle_tray_event(app: &AppHandle, event: SystemTrayEvent) {
    if let SystemTrayEvent::MenuItemClick { id, .. } = event {
        if id.as_str() == "quit" {
            process::exit(0);
        }
        if id.as_str() == "open" {
            main_window::open_main_window(app)
        }
        if id.as_str() == "settings" {
            // settings::open_settings_window(app);
        }
    }
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}


fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .system_tray(make_tray())
        .on_system_tray_event(handle_tray_event)
        .invoke_handler(tauri::generate_handler![
            // command::paste::paste,
            main_window::init_main_window,
            main_window::show_main_window,
            main_window::hide_main_window,
            main_window::toggle_main_window,
            // settings::show_settings_window,
            greet
        ])
        .manage(main_window::State::default())
        .setup(move |app| {
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let window = app.get_window("main").unwrap();
            window.set_transparent_titlebar(true, true);
            // let _panel = window.to_panel().unwrap();
            // let panel = app.get_panel("main").unwrap();
            // // NSWindowStyleMaskNonactivatingPanel
            // panel.set_style_mask(NSWindowStyleMaskNonActivatingPanel);

            // match window.raw_window_handle() {
            //     #[cfg(target_os = "macos")]
            //     raw_window_handle::RawWindowHandle::AppKit(handle) => {
            //         let window: id  = handle.ns_window as _;
            //         unsafe {
            //             let _: () = msg_send![window, setOpaque: NO];
            //             let _: () = msg_send![window, setHasShadow: NO];
            //             let _: () = msg_send![window, setMovableByWindowBackground: YES];
            //             let _: () = msg_send![window, setLevel: 1];
            //             // let _: () = msg_send![window, setCollectionBehavior: 1 << 7];
            //         }
            //         // let ns_view: id = window.contentView();

            //     }
            //     _ => Err("Unsupported platform! 'apply_vibrancy' is only supported on macOS")?,
            // }
    
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}