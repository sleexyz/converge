use objc::{msg_send, sel, sel_impl};
use tauri::{Window, Manager, Wry};
use tauri_nspanel::{panel_delegate, WindowExt };

#[allow(non_upper_case_globals)]
const NSWindowStyleMaskNonActivatingPanel: i32 = 1 << 7;

pub fn init_as_panel(window: Window<Wry>) {
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
}