use cocoa::base::{BOOL, NO};
use tauri_nspanel::raw_nspanel::RawNSPanel;
use objc::{msg_send, sel, sel_impl,
    runtime::{Object, Sel},
};
use tauri::{Window, Manager, Wry};
use tauri_nspanel::{panel_delegate, WindowExt };


pub trait PanelExt {
    fn set_becomes_key_only_if_needed(&self, flag: bool);
    fn show_without_making_key_window(&self);
    // extern "C" fn can_become_key_window(_: &Object, _: Sel) -> BOOL;
}

impl PanelExt for RawNSPanel {
    // extern "C" fn can_become_key_window(_: &Object, _: Sel) -> BOOL {
    //     NO
    // }

    fn show_without_making_key_window(&self) {
        self.make_first_responder(Some(self.content_view()));
        self.order_front_regardless();
    }

    fn set_becomes_key_only_if_needed(&self, flag: bool) {
        unsafe {
        let _: () = msg_send![self, setBecomesKeyOnlyIfNeeded: flag];
        }
    }
}


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
  // panel.set_becomes_key_only_if_needed(true);
}