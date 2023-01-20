// Copyright 2019-2022 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::api::process::{Command, CommandEvent};
use tauri::Manager;

fn main() {
  tauri::Builder::default()
    .setup(|app| {
        let window = app.get_window("main").unwrap();
        tauri::async_runtime::spawn(async move {
          let (mut rx, _) = Command::new_sidecar("app")
            .unwrap()
            .spawn()
            .unwrap();

          println!("PART ONE PASSED");
          while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
              window
                .emit("message", Some(format!("'{}'", line)))
                .unwrap();
            }
          }
        });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
