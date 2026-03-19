#!/usr/bin/env python3
"""
Geekbobo Marketing Telegram Bot - Send messages to Martin
"""
import sys
import requests
import json

BOT_TOKEN = "8639191076:AAECpJYC0yL8o1ab1H72jlIZCqTKMpvqSjU"
CHAT_ID = "6852857739"
BASE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"


def send_message(text, parse_mode="Markdown"):
    """Send a text message to Martin via Telegram."""
    url = f"{BASE_URL}/sendMessage"
    payload = {
        "chat_id": CHAT_ID,
        "text": text,
        "parse_mode": parse_mode,
    }
    resp = requests.post(url, json=payload)
    result = resp.json()
    if result.get("ok"):
        print(f"Message sent successfully. Message ID: {result['result']['message_id']}")
    else:
        print(f"Failed to send message: {result}")
    return result


def send_photo(photo_path, caption=""):
    """Send a photo to Martin via Telegram."""
    url = f"{BASE_URL}/sendPhoto"
    with open(photo_path, "rb") as f:
        files = {"photo": f}
        data = {"chat_id": CHAT_ID, "caption": caption, "parse_mode": "Markdown"}
        resp = requests.post(url, data=data, files=files)
    result = resp.json()
    if result.get("ok"):
        print(f"Photo sent successfully.")
    else:
        print(f"Failed to send photo: {result}")
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 telegram_bot.py <message>")
        sys.exit(1)
    
    message = sys.argv[1]
    send_message(message)
