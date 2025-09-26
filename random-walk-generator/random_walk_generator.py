import os
import random
import time
from datetime import datetime, timezone

import requests

ES_HOST = os.getenv("ES_HOST", "http://localhost:9200")
ES_USERNAME = os.getenv("ES_USERNAME", "admin")
ES_PASSWORD = os.getenv("ES_PASSWORD", "admin123")
INDEX_NAME = os.getenv("ES_INDEX", "random-walk")
STEP_STDDEV = float(os.getenv("RW_STEP_STDDEV", "0.5"))
START_VALUE = float(os.getenv("RW_START_VALUE", "100.0"))
SAMPLE_INTERVAL = float(os.getenv("RW_INTERVAL_SECONDS", "1"))

AUTH = (ES_USERNAME, ES_PASSWORD)
SESSION = requests.Session()
SESSION.auth = AUTH
SESSION.headers.update({"Content-Type": "application/json"})

SCHEMA = {
    "mappings": {
        "dynamic": "strict",
        "properties": {
            "timestamp": {"type": "date"},
            "value": {"type": "double"}
        }
    }
}


def ensure_index():
    url = f"{ES_HOST}/{INDEX_NAME}"
    while True:
        try:
            resp = SESSION.put(url, json=SCHEMA, timeout=10)
            if resp.status_code in (200, 201):
                return
            if resp.status_code == 400 and "resource_already_exists_exception" in resp.text:
                return
            print(f"[random-walk] Failed to create index: {resp.status_code} {resp.text}")
        except requests.RequestException as exc:
            print(f"[random-walk] Error ensuring index: {exc}")
        time.sleep(5)


def send_sample(timestamp: str, value: float):
    url = f"{ES_HOST}/{INDEX_NAME}/_doc"
    payload = {
        "timestamp": timestamp,
        "value": value
    }
    try:
        resp = SESSION.post(url, json=payload, timeout=5)
        if resp.status_code not in (200, 201):
            print(f"[random-walk] Failed to index sample ({resp.status_code}): {resp.text}")
    except requests.RequestException as exc:
        print(f"[random-walk] Error indexing sample: {exc}")


def main():
    ensure_index()
    value = START_VALUE
    while True:
        value += random.gauss(0, STEP_STDDEV)
        timestamp = datetime.now(timezone.utc).isoformat()
        send_sample(timestamp, round(value, 5))
        time.sleep(SAMPLE_INTERVAL)


if __name__ == "__main__":
    main()
