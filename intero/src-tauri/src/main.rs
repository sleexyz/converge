// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod main_window;
mod window_ext;
mod panel_ext;

use cocoa::appkit::NSWindowStyleMask;
use tauri::{AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, Window, Wry};
use tauri_plugin_autostart::MacosLauncher;
// use window_ext::WindowExt as _;
use tauri_nspanel::{panel_delegate, ManagerExt, WindowExt };

use std::process;

use panel_ext::PanelExt as _;


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
            toggle_panel
        ])
        // .manage(main_window::State::default())
        .setup(move |app| {
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let window = app.get_window("main").unwrap();
            // window.set_transparent_titlebar(true, true);
            init(window);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[allow(non_upper_case_globals)]
const NSWindowStyleMaskNonActivatingPanel: i32 = 1 << 7;

fn init(window: Window<Wry>) {
    let panel = window.to_panel().unwrap();
  
    let delegate = panel_delegate!(MyPanelDelegate {
      window_did_become_key,
      window_did_resign_key
    });
  
    let handle = window.app_handle();
    delegate.set_listener(Box::new(move |delegate_name: String| {
      match delegate_name.as_str() {
        "window_did_become_key" => {
          let app_name = handle.package_info().name.to_owned();
          println!("[info]: {:?} panel becomes key window!", app_name);
        }
        "window_did_resign_key" => {
          println!("[info]: panel resigned from key window!");
        }
        _ => (),
      }
    }));
  
    panel.set_delegate(delegate);

    panel.set_style_mask(NSWindowStyleMaskNonActivatingPanel | 0);
    panel.set_becomes_key_only_if_needed(true);
  }
  
  #[tauri::command]
  fn show_panel(handle: AppHandle<Wry>) {
    open_panel(&handle);
  }

  fn open_panel(handle: &AppHandle<Wry>) {
    let panel = handle.get_panel("main").unwrap();
    panel.show_without_making_key_window();
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