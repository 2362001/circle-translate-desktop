# Hướng dẫn lấy Google Cloud Vision API Key

## Bước 1: Tạo Google Cloud Project

1. Truy cập: https://console.cloud.google.com/
2. Đăng nhập bằng Gmail
3. Click "Select a project" → "New Project"
4. Đặt tên: `circle-translate`
5. Click "Create"

## Bước 2: Enable Vision API

1. Vào https://console.cloud.google.com/apis/library
2. Tìm "Cloud Vision API"
3. Click "Enable"

## Bước 3: Tạo API Key

1. Vào https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "API Key"
3. Copy API Key (dạng: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

## Bước 4: Cấu hình App

Tạo file `.env` trong folder `circle-translate-desktop`:

```
GOOGLE_VISION_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Thay `AIzaSy...` bằng API key của bạn.

## Giới hạn miễn phí

- **1,000 requests/tháng** - MIỄN PHÍ
- Sau đó: $1.50 / 1000 requests

## Bảo mật

- ⚠️ **KHÔNG** commit file `.env` lên Git
- ⚠️ **KHÔNG** share API key công khai
- ✅ Chỉ dùng cho app cá nhân

## Kiểm tra

Sau khi tạo `.env`, chạy:
```bash
npm install
npm start
```

App sẽ tự động dùng Google Vision OCR!
