const fs = require("fs");
const process = require("process");

const express = require("express");
const ws = require("express-ws");
const pty = require("node-pty");

const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OpenBB Terminal</title>
    <style>
      .xterm {
          font-feature-settings: "liga" 0;
          position: relative;
          user-select: none;
          -ms-user-select: none;
          -webkit-user-select: none;
      }

      .xterm.focus,
      .xterm:focus {
          outline: none;
      }

      .xterm .xterm-helpers {
          position: absolute;
          top: 0;
          /**
           * The z-index of the helpers must be higher than the canvases in order for
           * IMEs to appear on top.
           */
          z-index: 5;
      }

      .xterm .xterm-helper-textarea {
          padding: 0;
          border: 0;
          margin: 0;
          /* Move textarea out of the screen to the far left, so that the cursor is not visible */
          position: absolute;
          opacity: 0;
          left: -9999em;
          top: 0;
          width: 0;
          height: 0;
          z-index: -5;
          /** Prevent wrapping so the IME appears against the textarea at the correct position */
          white-space: nowrap;
          overflow: hidden;
          resize: none;
      }

      .xterm .composition-view {
          /* TODO: Composition position got messed up somewhere */
          background: #000;
          color: #FFF;
          display: none;
          position: absolute;
          white-space: nowrap;
          z-index: 1;
      }

      .xterm .composition-view.active {
          display: block;
      }

      .xterm .xterm-viewport {
          /* On OS X this is required in order for the scroll bar to appear fully opaque */
          background-color: #000;
          overflow-y: scroll;
          cursor: default;
          position: absolute;
          right: 0;
          left: 0;
          top: 0;
          bottom: 0;
      }

      .xterm .xterm-screen {
          position: relative;
      }

      .xterm .xterm-screen canvas {
          position: absolute;
          left: 0;
          top: 0;
      }

      .xterm .xterm-scroll-area {
          visibility: hidden;
      }

      .xterm-char-measure-element {
          display: inline-block;
          visibility: hidden;
          position: absolute;
          top: 0;
          left: -9999em;
          line-height: normal;
      }

      .xterm {
          cursor: text;
      }

      .xterm.enable-mouse-events {
          /* When mouse events are enabled (eg. tmux), revert to the standard pointer cursor */
          cursor: default;
      }

      .xterm.xterm-cursor-pointer {
          cursor: pointer;
      }

      .xterm.column-select.focus {
          /* Column selection mode */
          cursor: crosshair;
      }

      .xterm .xterm-accessibility,
      .xterm .xterm-message {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          right: 0;
          z-index: 10;
          color: transparent;
      }

      .xterm .live-region {
          position: absolute;
          left: -9999px;
          width: 1px;
          height: 1px;
          overflow: hidden;
      }

      .xterm-dim {
          opacity: 0.5;
      }

      .xterm-underline {
          text-decoration: underline;
      }
    </style>
    <style>
      #terminal {
        height: 100vh;
        width: 100vw;
        position:absolute;
        top:0px;
        right:0px;
        background-color: black;
      }
    </style>
  </head>
  <body>
    <div id="terminal"></div>
    <script src="https://unpkg.com/xterm@4.11.0/lib/xterm.js"></script>
    <script src="https://unpkg.com/xterm-addon-attach@0.6.0/lib/xterm-addon-attach.js"></script>
    <script src="https://unpkg.com/xterm-addon-fit@0.5.0/lib/xterm-addon-fit.js"></script>
    <script src="https://unpkg.com/xterm-addon-web-links@0.6.0/lib/xterm-addon-web-links.js"></script>
    <script>
      const term = new Terminal();
      const socket = new WebSocket("ws://localhost:80/ws");
      // const weblinks = new WebLinksAddon();

      const websocketAddon = new AttachAddon.AttachAddon(socket);
      const resizeAddon = new FitAddon.FitAddon();

      term.loadAddon(websocketAddon);
      term.loadAddon(resizeAddon);
      // terminal.loadAddon(weblinks);

      term.open(document.getElementById("terminal"));

      resizeAddon.fit();
      window.addEventListener("resize", () => {
        resizeAddon.fit()
        console.log(JSON.stringify({ cols: term.cols, rows: term.rows }));
      });
    </script>
  </body>
</html>

`

const app = express();

const expressWs = ws(app);

console.log("Listening on port 80");

app.get("/", (req, res) => {
  console.log("GET /");
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});
app.ws("/ws", (ws) => {
  console.log("WS /ws");
  const term = pty.spawn("zsh", [], { name: "xterm-color", cols: 170, rows: 60 });
  // run command in shell
  term.write("conda activate obb && python /Users/colindelahunty/OpenBBTerminal/terminal.py\r")
  setTimeout(() => term.kill(), 3600 * 1000); // session timeout
  term.on("data", (data) => {
    try {
      console.log("data: ", data);
      ws.send(data);
    } catch (err) {}
  });
  ws.on("message", (data) => {
    console.log("message: ", data);
    term.write(data)
  });
});

// Prevent malformed packets from crashing server.
expressWs.getWss().on("connection", (ws) => ws.on("error", console.error));

app.listen(80, "0.0.0.0");

