// Panel
use crate::panel_ext::init_as_panel;
use crate::main_window::position_window;
use tauri::{AppHandle, Manager, Wry};
use tauri_nspanel::ManagerExt;
use cocoa::foundation::NSPoint;

#[tauri::command]
pub fn show_widget_window(app: AppHandle) {
    open_widget_window(&app);
}

pub fn open_widget_window(app: &AppHandle) {
    if let Some(window) = app.get_window("widget") {
        window.show().ok();
        window.set_focus().ok();
        return;
    }

    let widget_window = tauri::WindowBuilder::new(
        app,
        "widget",
        tauri::WindowUrl::App("widget.html".into()),
    )
    .title("Emojinie widget")
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .visible(false)
    // .position(0.0, 0.0)
    // .inner_size(700.0, 600.0)
    .inner_size(600.0, 200.0)
    .build()
    .ok();

    if let Some(window) = widget_window {
        // window.with_webview(move |webview| {
        // });
        // {
        //     let window = window.ns_window().unwrap() as id;
        //     unsafe {
        //         window.contentView().setAlphaValue_(1.0);
        //     }
        // }
        let _ = window.set_ignore_cursor_events(true);
        // let _ = window.show().ok();
        position_window(&window, |display_pos, display_size, win_frame_size| {
            NSPoint {
                x: (display_pos.x + (display_size.width)) - (win_frame_size.width),
                // y: (display_pos.y + (display_size.height)) - (win_frame_size.height), // 160 from the top
                y: display_pos.y
            }
        });
        init_as_panel(window);
        open_panel(app);
    }
}

fn open_panel(handle: &AppHandle<Wry>) {
  let panel = handle.get_panel("widget").unwrap();
  panel.show();
  panel.set_key_window_able2(false);
}
