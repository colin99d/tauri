#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::api::process::{Command, CommandEvent};

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let resource_path = match app
        .path_resolver()
        .resolve_resource("binaries/OpenBBTerminal")
      {
        None => {
          println!("Could not get the file path for the OpenBB binary");
          // TODO: not sure the best way to handle this
          return Ok(());
        }
        Some(path) => match path.to_str() {
            None => return Ok(()),
            Some(path_str) => path_str.to_string()
        }
      };
      tauri::async_runtime::spawn(async move {
        let (mut rx, _) = Command::new_sidecar("app")
          .unwrap()
          .args(vec![resource_path, "80".to_string()])
          .spawn()
          .unwrap();

        println!("PART ONE PASSED");
        while let Some(event) = rx.recv().await {
          if let CommandEvent::Stdout(line) = event {
            println!("{}", line);
          }
        }
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
