// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod main_window;
mod window_ext;
mod panel_ext;
mod widget;
mod screenshot;
mod ffi;


use clippy_app::main_window::position_window_fullscreen;
use tauri::{AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, Wry};
use tauri_plugin_autostart::MacosLauncher;
use tauri_nspanel::ManagerExt;
use block::ConcreteBlock;
use cocoa::appkit::NSEventMask;
use objc::{class, msg_send, sel, sel_impl};
use cocoa::base::{id, nil};
use cocoa::foundation::{NSPoint, NSRect};
use window_vibrancy::NSVisualEffectMaterial;

use std::{process, thread};


fn make_tray() -> SystemTray {
    // <- a function that creates the system tray
    let menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("open".to_string(), "Open Intero"))
        .add_item(CustomMenuItem::new("quit".to_string(), "Quit"));
    return SystemTray::new().with_menu(menu);
}

fn handle_tray_event(app: &AppHandle, event: SystemTrayEvent) {
    if let SystemTrayEvent::MenuItemClick { id, .. } = event {
        if id.as_str() == "quit" {
            process::exit(0);
        }
        if id.as_str() == "open" {
            open_panel(app)
        }
    }
}

fn main() {
    thread::spawn(|| {
        let _output = unsafe { ffi::start() };
    });

    tauri::Builder::default()
        .plugin(tauri_nspanel::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .system_tray(make_tray())
        .on_system_tray_event(handle_tray_event)
        .invoke_handler(tauri::generate_handler![
            show_panel,
            hide_panel,
            close_panel,
            toggle_panel,
            screenshot,
            widget::show_widget_window,
        ])
        .setup(move |app| {
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let window = app.get_window("main").unwrap();
            #[cfg(target_os = "macos")]
            window_vibrancy::apply_vibrancy(&window, NSVisualEffectMaterial::Popover, None, None)
                .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");
            // window.set_transparent_titlebar(true, true);
            panel_ext::init_as_panel(window);
            widget::show_widget_window(app.app_handle());
            track_mouse(&app.app_handle());

            Ok(())
        })
        .plugin(tauri_plugin_persisted_scope::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn screenshot(app: AppHandle<Wry>) -> Vec<String> {
    return screenshot::capture().await;
}

#[tauri::command]
fn show_panel(handle: AppHandle<Wry>) {
  open_panel(&handle);
}

fn open_panel(handle: &AppHandle<Wry>) {
  let window = handle.get_window("main").unwrap();
  position_window_fullscreen(&window, 1.0);
  let panel = handle.get_panel("main").unwrap();
  panel.show();
  panel.set_key_window_able(true);
  panel.make_key_window();
}

#[tauri::command]
fn hide_panel(handle: AppHandle<Wry>) {
  let panel = handle.get_panel("main").unwrap();
  panel.order_out(None);
}

#[tauri::command]
fn close_panel(handle: AppHandle<Wry>) {
  let panel = handle.get_panel("main").unwrap();
  panel.released_when_closed(true);
  panel.close();
}

#[tauri::command]
fn toggle_panel(app_handle: AppHandle<Wry>) {
    let panel = app_handle.get_panel("main").unwrap();
    if panel.is_visible() {
        hide_panel(app_handle);
    } else {
        show_panel(app_handle);
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct MouseMoved {
    x: f64,
    y: f64,
    // TODO: move this to different event, changes less often.
    window_x: f64,
    window_y: f64,
    window_width: f64,
    window_height: f64,
}

fn track_mouse(app: &AppHandle) {
    let widget = app.get_window("widget").unwrap();
    let widget_window = widget.ns_window().unwrap() as id;
    unsafe {
        let block2 = ConcreteBlock::new(move |event: id| {
            let event_location: NSPoint = msg_send![&*event, locationInWindow];
            let window: id = msg_send![&*event, window];
            let screen_location: NSPoint = if window == nil {
                // println!("Mouse moved to {},{}", event_location.x as i32, event_location.y as i32);
                event_location
            } else {
                let location: NSPoint = msg_send![window, convertPointToScreen:event_location];
                // println!("Mouse moved to {},{}", location.x as i32, location.y as i32);
                location
            };
            let frame: NSRect = msg_send![widget_window, frame];

            widget.emit("mouse-moved", MouseMoved { 
                x: screen_location.x, 
                y: screen_location.y,
                window_x: frame.origin.x as f64,
                window_y: frame.origin.y as f64,
                window_width: frame.size.width as f64,
                window_height: frame.size.height as f64,
            }).unwrap();
        });

        let mask = NSEventMask::NSMouseMovedMask;

        let _: () = msg_send![class!(NSEvent), addGlobalMonitorForEventsMatchingMask:mask handler:block2];
    }
}