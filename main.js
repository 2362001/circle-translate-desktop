/**
 * Circle Translate Desktop App
 * Main Process - Electron
 */

const {
  app,
  BrowserWindow,
  globalShortcut,
  Tray,
  Menu,
  screen,
  ipcMain,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { execSync, exec } = require("child_process");
const { desktopCapturer, nativeImage } = require("electron");
// Gỡ bỏ Tesseract để dùng Windows OCR chuẩn hơn

let overlayWindow = null;
let tray = null;

// Tạo cửa sổ overlay trong suốt
function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  overlayWindow = new BrowserWindow({
    width: width,
    height: height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  overlayWindow.loadFile("overlay.html");
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.setAlwaysOnTop(true, "screen-saver");

  // Ẩn khi tạo
  overlayWindow.hide();

  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });
}

// Tạo system tray
function createTray() {
  try {
    // Tạo icon đơn giản (16x16 transparent)
    const { nativeImage } = require("electron");
    const icon = nativeImage.createEmpty();

    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Circle Translate",
        enabled: false,
      },
      {
        type: "separator",
      },
      {
        label: "🎯 Kích hoạt (Alt+Shift+C)",
        click: () => {
          showOverlay();
        },
      },
      {
        type: "separator",
      },
      {
        label: "Thoát",
        click: () => {
          app.quit();
        },
      },
    ]);

    tray.setToolTip("Circle Translate - Nhấn Alt+Shift+C để dịch");
    tray.setContextMenu(contextMenu);
    console.log("✅ System tray created");
  } catch (error) {
    console.log("⚠️ Tray creation skipped (app still works with Ctrl+Shift+D)");
  }
}

// Hiển thị overlay
function showOverlay() {
  if (overlayWindow) {
    overlayWindow.show();
    overlayWindow.focus();
  }
}

// Ẩn overlay
function hideOverlay() {
  if (overlayWindow) {
    overlayWindow.hide();
  }
}

// Đăng ký global hotkey
function registerGlobalShortcut() {
  const ret = globalShortcut.register("Alt+Shift+C", () => {
    console.log("Alt+Shift+C pressed");
    showOverlay();
  });

  if (!ret) {
    console.log("Registration failed - trying alternative key");
    const ret2 = globalShortcut.register("CommandOrControl+Shift+T", () => {
      console.log("Ctrl+Shift+T pressed");
      showOverlay();
    });

    if (ret2) {
      console.log("✅ Global shortcut registered: Ctrl+Shift+T");
    } else {
      console.log("❌ All shortcuts failed");
    }
  } else {
    console.log("✅ Global shortcut registered: Ctrl+Alt+T");
  }
}

// IPC handlers
ipcMain.on("hide-overlay", () => {
  hideOverlay();
});

ipcMain.on("ocr-request", async (event, data) => {
  const { x, y, width, height, popupX, popupY } = data;

  try {
    const display = screen.getPrimaryDisplay();
    const scaleFactor = display.scaleFactor || 1;

    // 1. Chụp ảnh màn hình
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: {
        width: Math.floor(display.size.width * scaleFactor),
        height: Math.floor(display.size.height * scaleFactor),
      },
    });

    const primarySource = sources[0];
    const fullScreenshot = primarySource.thumbnail;

    // 2. Cắt ảnh
    const cropArea = {
      x: Math.max(0, Math.floor(x * scaleFactor)),
      y: Math.max(0, Math.floor(y * scaleFactor)),
      width: Math.max(1, Math.floor(width * scaleFactor)),
      height: Math.max(1, Math.floor(height * scaleFactor)),
    };

    const croppedImage = fullScreenshot.crop(cropArea);
    const base64Image = croppedImage.toDataURL(); // Chuyển sang Base64 để gửi API

    // 3. Gọi OCR.space API (Miễn phí & Chính xác cao)
    console.log("Processing OCR with OCR.space API...");

    const axios = require("axios");
    const FormData = require("form-data");
    const form = new FormData();

    // OCR.space parameter
    form.append("base64image", base64Image);
    form.append("language", "auto"); // Dùng 'vie' cho Tiếng Việt
    form.append("apikey", "K83673750788957"); // API Key mới của bạn
    form.append("isOverlayRequired", "false");
    form.append("OCREngine", "2"); // Engine 2 nhận diện Tiếng Việt rất chuẩn

    const response = await axios.post(
      "https://api.ocr.space/parse/image",
      form,
      {
        headers: form.getHeaders(),
        timeout: 10000, // Thêm timeout 10s cho chắc chắn
      }
    );

    if (
      response.data &&
      response.data.ParsedResults &&
      response.data.ParsedResults.length > 0
    ) {
      const detectedText = response.data.ParsedResults[0].ParsedText.trim();
      console.log("OCR Result:", detectedText);

      event.reply("ocr-result", {
        text: detectedText,
        popupX,
        popupY,
      });
    } else {
      throw new Error(
        response.data.ErrorMessage || "Không thể nhận diện văn bản"
      );
    }
  } catch (error) {
    console.error("OCR.space Error:", error.message);
    event.reply("ocr-result", {
      error: "Lỗi kết nối OCR.space: " + error.message,
      popupX,
      popupY,
    });
  }
});

ipcMain.on("copy-text", () => {
  // Use PowerShell to send Ctrl+C
  const { exec } = require("child_process");
  const command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')"`;

  exec(command, (error) => {
    if (error) {
      console.error("❌ Failed to send Ctrl+C:", error);
    } else {
      console.log("✅ Sent Ctrl+C via PowerShell");
    }
  });
});

ipcMain.on("translate-text", async (event, text) => {
  try {
    // Gọi API dịch
    const axios = require("axios");
    const hasVietnamese =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
        text
      );
    const sourceLang = hasVietnamese ? "vi" : "en";
    const targetLang = hasVietnamese ? "en" : "vi";

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${sourceLang}|${targetLang}`;
    const response = await axios.get(url);

    if (response.data && response.data.responseData) {
      event.reply("translation-result", {
        original: text,
        translation: response.data.responseData.translatedText,
        language: sourceLang,
      });
    }
  } catch (error) {
    console.error("Translation error:", error);
    event.reply("translation-result", {
      original: text,
      translation: "Lỗi: Không thể dịch",
      language: "unknown",
    });
  }
});

// App ready
app.whenReady().then(() => {
  createOverlayWindow();
  createTray();
  registerGlobalShortcut();

  console.log("✅ Circle Translate Desktop started");
  console.log("📌 Press Alt+Shift+C to activate");
});

// Cleanup
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", (e) => {
  e.preventDefault();
});
