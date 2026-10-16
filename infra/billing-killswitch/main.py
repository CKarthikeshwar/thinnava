"""Billing kill switch for `thinnava-maps` (spec §27.5, lock 3).

A Cloud Billing budget publishes its status to a Pub/Sub topic several times a day.
When the budget's *gross* cost (before credits) passes the threshold, this function
detaches the billing account from the project, which stops every paid API at once.
Places then pauses; nothing else in the app is affected. Re-link billing by hand.

Based on Google's documented "disable billing usage with notifications" pattern.
"""
import base64
import json
import os

import functions_framework
from googleapiclient import discovery

PROJECT_ID = os.environ.get("TARGET_PROJECT", "thinnava-maps")
# Any real usage beyond Google's free amounts is a sign something is wrong: stop at ₹50.
THRESHOLD = float(os.environ.get("THRESHOLD_INR", "50"))


@functions_framework.cloud_event
def stop_billing(cloud_event):
    data = json.loads(base64.b64decode(cloud_event.data["message"]["data"]).decode("utf-8"))
    cost = float(data.get("costAmount", 0))
    print(f"Budget update: cost={cost} {data.get('currencyCode')} threshold={THRESHOLD}")
    if cost <= THRESHOLD:
        return

    billing = discovery.build("cloudbilling", "v1", cache_discovery=False)
    name = f"projects/{PROJECT_ID}"
    info = billing.projects().getBillingInfo(name=name).execute()
    if not info.get("billingEnabled"):
        print("Billing already disabled.")
        return
    billing.projects().updateBillingInfo(name=name, body={"billingAccountName": ""}).execute()
    print(f"Billing DISABLED for {PROJECT_ID} (cost {cost} > {THRESHOLD}).")
