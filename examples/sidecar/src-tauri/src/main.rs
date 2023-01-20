// Copyright 2019-2022 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::path::PathBuf;
use tauri::api::process::{Command, CommandEvent};
use tauri::Manager;
use tauri::{async_runtime, generate_context, generate_handler, Builder};

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let target_port = get_available_port().map_or_else(
        || {
          println!("All ports from 14733 to 16789 are taken");
          0
        },
        |port| port,
      );
      /*
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
      */
      let resource_path = match app
        .path_resolver()
        .resolve_resource("binaries/app-aarch64-apple-darwin")
      {
        None => {
          println!("Could not get the file path for the OpenBB binary");
          // TODO: not sure the best way to handle this
          return Ok(());
        }
        Some(path) => path,
      };

      async_runtime::spawn(async move {
        if let Err(error) = launch_sdk(resource_path, &target_port.to_string()).await {
          println!("Error launching sdk: {}", error);
        }
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

pub async fn launch_sdk(resource_path: PathBuf, target_port: &str) -> Result<(), String> {
  let path_str = match resource_path.as_path().to_str() {
    None => return Err("Could not convert the given path to a string".to_string()),
    Some(path) => path,
  };
  println!("{}", path_str);
  let (mut rx, _child) = Command::new(
    "/Users/colindelahunty/tauri/examples/sidecar/src-tauri/binaries/app-aarch64-apple-darwin",
  )
  // .args(["--rest", "--port", target_port])
  .spawn()
  .unwrap();

  while let Some(event) = rx.recv().await {
    println!("EVENT: {:?}", event);
    if let CommandEvent::Stdout(line) = event {
      println!("{}", line);
    }
  }
  Ok(())
}

use std::net::TcpListener;

pub fn get_available_port() -> Option<u16> {
  (14733..16789).find(|port| port_is_available(*port))
}

/// Checks whether a port is available given it is not being used on the host localhost, 0.0.0.0,
/// or 127.0.0.1. This could have an issue if the user has the port active on a different host
fn port_is_available(port: u16) -> bool {
  TcpListener::bind(("localhost", port)).is_ok()
    && TcpListener::bind(("0.0.0.0", port)).is_ok()
    && TcpListener::bind(("127.0.0.1", port)).is_ok()
}
