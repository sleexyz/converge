// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod main_window;
mod window_ext;
mod panel_ext;
mod widget;

use main_window::position_window_at_the_center_of_the_monitor_with_cursor;
use tauri::{AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, Wry};
use tauri_plugin_autostart::MacosLauncher;
use tauri_nspanel::ManagerExt;

use std::process;

use panel_ext::PanelExt;


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
            widget::show_widget_window,
        ])
        .setup(move |app| {
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let window = app.get_window("main").unwrap();
            // window.set_transparent_titlebar(true, true);
            panel_ext::init_as_panel(window);
            widget::show_widget_window(app.app_handle());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn show_panel(handle: AppHandle<Wry>) {
  open_panel(&handle);
}

fn open_panel(handle: &AppHandle<Wry>) {
  let window = handle.get_window("main").unwrap();
  position_window_at_the_center_of_the_monitor_with_cursor(&window);
  let panel = handle.get_panel("main").unwrap();
  panel.show_without_making_key_window();
  panel.set_key_window_able2(true);
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