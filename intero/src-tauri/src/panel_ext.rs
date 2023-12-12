use cocoa::base::{BOOL, NO};
use tauri_nspanel::raw_nspanel::RawNSPanel;
use objc::{msg_send, sel, sel_impl,
    runtime::{Object, Sel},
};


pub trait PanelExt {
    fn set_becomes_key_only_if_needed(&self, flag: bool);
    fn show_without_making_key_window(&self);
    extern "C" fn can_become_key_window(_: &Object, _: Sel) -> BOOL;
}

impl PanelExt for RawNSPanel {
    extern "C" fn can_become_key_window(_: &Object, _: Sel) -> BOOL {
        NO
    }

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