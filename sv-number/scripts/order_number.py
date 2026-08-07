"""Order a number, wait for the verification code, close the activation.

    export SVN_API_KEY=your_key_here
    python order_number.py tg 6          # Telegram, Indonesia

Country and service ids come from the API itself:
    getCountryAndOperators             -> every country with its id
    getServicesAndCostWithStatistics   -> service codes, price, how many are online,
                                          and the share of codes that actually arrived
"""
import os
import sys
import time
import requests

API = "https://sms-verification-number.com/stubs/handler_api"
KEY = os.environ["SVN_API_KEY"]


def call(action, **params):
    """Every call takes api_key, action and lang. Errors come back as plain text, HTTP 200."""
    response = requests.get(API, params={"api_key": KEY, "action": action, "lang": "en", **params},
                            timeout=60)
    response.raise_for_status()
    return response.text.strip()


def order(service, country, max_price=None):
    params = {"service": service, "country": country, "operator": "any"}
    if max_price:
        params["maxPrice"] = max_price
    answer = call("getNumber", **params)
    if not answer.startswith("ACCESS_NUMBER"):
        raise RuntimeError(f"could not order a number: {answer}")
    _, activation_id, phone = answer.split(":")
    return activation_id, phone


def wait_for_code(activation_id, minutes=20):
    """The number lives 20 minutes. Poll every 3 to 5 seconds, not once a second."""
    deadline = time.monotonic() + minutes * 60
    while time.monotonic() < deadline:
        answer = call("getStatus", id=activation_id)
        if answer.startswith("STATUS_OK"):
            return answer.split(":", 1)[1]
        if answer == "STATUS_CANCEL":
            return None
        time.sleep(4)
    return None


def main():
    service, country = sys.argv[1], sys.argv[2]
    activation_id, phone = order(service, country)
    print(f"number {phone} (activation {activation_id})")
    print("trigger the SMS on the target service now")

    code = wait_for_code(activation_id)
    if code:
        print("code:", code)
        call("setStatus", id=activation_id, status=6)      # finished, the charge stays
    else:
        # cancelling is refused for the first 2 minutes, most codes land inside that window
        print("no code arrived, cancelling")
        call("setStatus", id=activation_id, status=8)      # money returns to the balance


if __name__ == "__main__":
    main()
