import json
import secrets
import time
import base64
import hashlib
import logging
from urllib.parse import unquote_plus
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from app.core.config import settings

logger = logging.getLogger(__name__)


class PalmPayQueryError(Exception):
    pass


class PalmPayPaymentError(Exception):
    pass


def _normalize_sign_value(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (dict, list)):
        return json.dumps(value, separators=(",", ":"), ensure_ascii=False)
    return str(value).strip()


def _build_sign_source(payload: dict[str, object]) -> str:
    pairs: list[tuple[str, str]] = []
    for key, value in payload.items():
        normalized = _normalize_sign_value(value)
        if normalized == "":
            continue
        pairs.append((key, normalized))
    pairs.sort(key=lambda x: x[0])
    return "&".join(f"{k}={v}" for k, v in pairs)


def _generate_signature(payload: dict[str, object]) -> str:
    private_key_b64 = settings.palmpay_merchant_private_key.strip()
    if not private_key_b64:
        raise PalmPayPaymentError("PalmPay merchant private key is not configured")

    sign_source = _build_sign_source(payload)
    md5_upper = hashlib.md5(sign_source.encode("utf-8")).hexdigest().upper()

    key_der = base64.b64decode(private_key_b64)
    private_key = serialization.load_der_private_key(key_der, password=None)
    signature = private_key.sign(
        md5_upper.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA1(),
    )
    return base64.b64encode(signature).decode("utf-8")


def _resolve_auth_and_signature(payload: dict[str, object]) -> tuple[str, str]:
    app_id = settings.palmpay_app_id.strip()
    merchant_private_key = settings.palmpay_merchant_private_key.strip()

    if not app_id or not merchant_private_key:
        raise PalmPayPaymentError("PalmPay app ID/private key credentials are not configured")

    return app_id, _generate_signature(payload)


def verify_callback_signature(payload: dict[str, object], signature: str) -> bool:
    public_key_b64 = settings.palmpay_platform_public_key.strip()
    if not public_key_b64:
        return False

    normalized_signature = unquote_plus((signature or "").strip())
    if not normalized_signature:
        return False

    callback_payload = {k: v for k, v in payload.items() if str(k).lower() != "sign"}
    sign_source = _build_sign_source(callback_payload)
    md5_upper = hashlib.md5(sign_source.encode("utf-8")).hexdigest().upper()

    try:
        key_der = base64.b64decode(public_key_b64)
        public_key = serialization.load_der_public_key(key_der)
        public_key.verify(
            base64.b64decode(normalized_signature),
            md5_upper.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA1(),
        )
    except (ValueError, InvalidSignature):
        return False

    return True


def _post_palmpay(path: str, payload: dict[str, object], *, timeout: int = 120) -> dict[str, object]:
    authorization_token, signature = _resolve_auth_and_signature(payload)

    url = f"{settings.palmpay_base_url.rstrip('/')}{path}"
    start_time = time.time()

    logger.info(f"PalmPay API request: {path} (timeout: {timeout}s)")
    logger.debug(f"PalmPay request payload: {json.dumps(payload, indent=2)}")

    req = Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Accept": "application/json",
            "CountryCode": settings.palmpay_country_code,
            "Signature": signature,
            "Authorization": f"Bearer {authorization_token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urlopen(req, timeout=timeout) as response:
            logger.info(f"PalmPay API response started: {path} (status: {response.status})")
            read_start = time.time()
            raw = response.read().decode("utf-8")
            read_duration = time.time() - read_start
            logger.info(f"PalmPay API response read completed: {path} (read time: {read_duration:.2f}s, size: {len(raw)} bytes)")
    except HTTPError as exc:
        total_duration = time.time() - start_time
        logger.error(f"PalmPay HTTP error: {path} (code: {exc.code}, duration: {total_duration:.2f}s)")
        raise PalmPayPaymentError(f"PalmPay HTTP error: {exc.code}") from exc
    except URLError as exc:
        total_duration = time.time() - start_time
        logger.error(f"PalmPay connection error: {path} (reason: {exc.reason}, duration: {total_duration:.2f}s)")
        raise PalmPayPaymentError("PalmPay service unreachable") from exc
    except TimeoutError as exc:
        total_duration = time.time() - start_time
        logger.error(f"PalmPay timeout error: {path} (timeout: {timeout}s, duration: {total_duration:.2f}s)")
        raise PalmPayPaymentError(f"PalmPay request timed out after {timeout} seconds") from exc

    total_duration = time.time() - start_time
    logger.info(f"PalmPay API request completed: {path} (total time: {total_duration:.2f}s)")

    try:
        body = json.loads(raw)
        logger.debug(f"PalmPay response body: {json.dumps(body, indent=2)}")
    except ValueError as exc:
        logger.error(f"PalmPay invalid JSON response: {path} (raw: {raw[:500]}...)")
        raise PalmPayPaymentError("PalmPay returned invalid JSON") from exc

    resp_code = str(body.get("respCode") or "")
    if resp_code != "00000000":
        resp_msg = str(body.get("respMsg") or "PalmPay request failed")
        logger.error(f"PalmPay API error: {path} (code: {resp_code}, message: {resp_msg})")
        raise PalmPayPaymentError(resp_msg)

    logger.info(f"PalmPay API success: {path} (response code: {resp_code})")
    return body


def _base_request_payload() -> dict[str, object]:
    return {
        "requestTime": int(time.time() * 1000),
        "version": settings.palmpay_api_version,
        "nonceStr": secrets.token_urlsafe(24),
    }


def create_bank_transfer_order(
    *,
    order_id: str,
    amount_kobo: int,
    title: str,
    description: str,
    user_id: str,
    user_mobile_no: str | None,
    notify_url: str,
    callback_url: str,
    order_expire_seconds: int,
    goods_details_json: str,
) -> dict[str, object]:
    payload: dict[str, object] = {
        **_base_request_payload(),
        "orderId": order_id,
        "title": title,
        "description": description,
        "userId": user_id,
        "amount": amount_kobo,
        "currency": "NGN",
        "notifyUrl": notify_url,
        "callBackUrl": callback_url,
        "orderExpireTime": order_expire_seconds,
        "goodsDetails": goods_details_json,
        "productType": "bank_transfer",
    }
    if user_mobile_no:
        payload["userMobileNo"] = user_mobile_no

    body = _post_palmpay(settings.palmpay_create_order_path, payload)
    data = body.get("data")
    if not isinstance(data, dict):
        raise PalmPayPaymentError("PalmPay create order returned invalid data")
    return data


def query_order_status(*, order_id: str | None = None, order_no: str | None = None) -> dict[str, object]:
    if not order_id and not order_no:
        raise PalmPayPaymentError("order_id or order_no is required")

    payload: dict[str, object] = {
        **_base_request_payload(),
    }
    if order_id:
        payload["orderId"] = order_id
    if order_no:
        payload["orderNo"] = order_no

    body = _post_palmpay(settings.palmpay_query_order_path, payload)
    data = body.get("data")
    if not isinstance(data, dict):
        raise PalmPayPaymentError("PalmPay query order returned invalid data")
    return data


def map_order_status(status_value: int | str | None) -> str:
    text = str(status_value or "").strip()
    if text in {"2", "SUCCESS", "success", "PAID", "paid"}:
        return "paid"
    if text in {"3", "FAILED", "failed"}:
        return "failed"
    if text in {"4", "EXPIRED", "expired"}:
        return "expired"
    return "pending"


def query_bank_account_name(*, bank_code: str, bank_account_number: str) -> str:
    payload = {
        "requestTime": int(time.time() * 1000),
        "version": "V1.1",
        "nonceStr": "nairatrader-bank-verify",
        "bankCode": bank_code,
        "bankAccNo": bank_account_number,
    }
    try:
        authorization_token, signature = _resolve_auth_and_signature(payload)
    except PalmPayPaymentError as exc:
        raise PalmPayQueryError(str(exc)) from exc

    url = f"{settings.palmpay_base_url.rstrip('/')}{settings.palmpay_query_bank_account_path}"

    req = Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Accept": "application/json",
            "CountryCode": settings.palmpay_country_code,
            "Signature": signature,
            "Authorization": f"Bearer {authorization_token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        # Read the error response body if available
        try:
            error_body = exc.read().decode("utf-8")
            error_json = json.loads(error_body)
            error_message = error_json.get("respMsg") or error_json.get("message") or f"HTTP {exc.code}"
        except:
            error_message = f"PalmPay HTTP error: {exc.code}"
        raise PalmPayQueryError(error_message) from exc
    except URLError as exc:
        raise PalmPayQueryError("PalmPay service unreachable") from exc

    try:
        body = json.loads(raw)
    except ValueError as exc:
        raise PalmPayQueryError("PalmPay returned invalid JSON") from exc

    # Check for API-level errors first
    resp_code = str(body.get("respCode") or "").strip()
    if resp_code and resp_code != "00000000":
        resp_msg = str(body.get("respMsg") or "PalmPay request failed")
        raise PalmPayQueryError(resp_msg)

    data = body.get("data") or {}
    status_value = str(data.get("Status") or data.get("status") or "").strip().lower()

    if status_value != "success":
        error_message = data.get("errorMessage") or data.get("message") or body.get("respMsg") or "Account verification failed"
        raise PalmPayQueryError(str(error_message))

    account_name = str(data.get("accountName") or "").strip()
    if not account_name:
        raise PalmPayQueryError("PalmPay did not return account name")

    return account_name


def query_bank_list(*, business_type: int = 0) -> list[dict[str, str | None]]:
    payload = {
        "requestTime": int(time.time() * 1000),
        "version": "V1.1",
        "nonceStr": "nairatrader-bank-list",
        "businessType": business_type,
    }
    try:
        authorization_token, signature = _resolve_auth_and_signature(payload)
    except PalmPayPaymentError as exc:
        raise PalmPayQueryError(str(exc)) from exc

    url = f"{settings.palmpay_base_url.rstrip('/')}/api/v2/general/merchant/queryBankList"

    req = Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Accept": "application/json",
            "CountryCode": settings.palmpay_country_code,
            "Signature": signature,
            "Authorization": f"Bearer {authorization_token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        raise PalmPayQueryError(f"PalmPay HTTP error: {exc.code}") from exc
    except URLError as exc:
        raise PalmPayQueryError("PalmPay service unreachable") from exc

    try:
        body = json.loads(raw)
    except ValueError as exc:
        raise PalmPayQueryError("PalmPay bank list returned invalid JSON") from exc

    data = body.get("data")
    if isinstance(data, dict):
        data_list = [data]
    elif isinstance(data, list):
        data_list = data
    else:
        raise PalmPayQueryError("PalmPay bank list response is invalid")

    normalized: list[dict[str, str | None]] = []
    for item in data_list:
        if not isinstance(item, dict):
            continue
        bank_code = str(item.get("bankCode") or "").strip()
        bank_name = str(item.get("bankName") or "").strip()
        if not bank_code or not bank_name:
            continue
        normalized.append(
            {
                "bank_code": bank_code,
                "bank_name": bank_name,
                "bank_url": str(item.get("bankUrl") or "").strip() or None,
                "bg_url": str(item.get("bgUrl") or "").strip() or None,
                "bg2_url": str(item.get("bg2Url") or "").strip() or None,
            }
        )

    if not normalized:
        raise PalmPayQueryError("PalmPay bank list returned empty data")

    return normalized


def create_payout_order(
    *,
    order_id: str,
    amount_kobo: int,
    payee_name: str,
    payee_bank_code: str,
    payee_bank_acc_no: str,
    payee_phone_no: str | None = None,
    currency: str = "NGN",
    notify_url: str,
    remark: str = "",
) -> dict[str, object]:
    """
    Create a merchant payout order using PalmPay API
    """
    payload: dict[str, object] = {
        **_base_request_payload(),
        "orderId": order_id,
        "payeeName": payee_name,
        "payeeBankCode": payee_bank_code,
        "payeeBankAccNo": payee_bank_acc_no,
        "amount": amount_kobo,
        "currency": currency,
        "notifyUrl": notify_url,
        "remark": remark,
    }
    if payee_phone_no:
        payload["payeePhoneNo"] = payee_phone_no

    body = _post_palmpay("/api/v2/merchant/payment/payout", payload)
    data = body.get("data")
    if not isinstance(data, dict):
        raise PalmPayPaymentError("PalmPay create payout order returned invalid data")
    return data


def query_payout_status(*, order_id: str | None = None, order_no: str | None = None) -> dict[str, object]:
    """
    Query the status of a payout order
    """
    if not order_id and not order_no:
        raise PalmPayPaymentError("order_id or order_no is required")

    payload: dict[str, object] = {
        **_base_request_payload(),
    }
    if order_id:
        payload["orderId"] = order_id
    if order_no:
        payload["orderNo"] = order_no

    body = _post_palmpay("/api/v2/merchant/payment/queryPayStatus", payload)
    data = body.get("data")
    if not isinstance(data, dict):
        raise PalmPayPaymentError("PalmPay query payout status returned invalid data")
    return data


class PalmPayService:
    """Service class for PalmPay operations."""

    def create_transfer(self, amount: float, account_number: str, bank_code: str, account_name: str, description: str) -> dict[str, object]:
        """Create a bank transfer/payout."""
        amount_kobo = int(amount * 100)  # Convert to kobo

        return create_payout_order(
            order_id=f"nairatrader-migration-{int(time.time())}",
            amount_kobo=amount_kobo,
            payee_name=account_name,
            payee_bank_code=bank_code,
            payee_bank_acc_no=account_number,
            notify_url=f"{settings.app_public_base_url}/api/payments/palmpay/callback",
            remark=description
        )

    def query_bank_account(self, account_number: str, bank_code: str) -> dict[str, str]:
        """Query bank account details."""
        account_name = query_bank_account_name(bank_code=bank_code, bank_account_number=account_number)

        # Get the bank name from the bank code
        bank_name = "Unknown Bank"
        try:
            banks = query_bank_list()
            for bank in banks:
                if bank.get("bank_code") == bank_code:
                    bank_name = bank.get("bank_name", "Unknown Bank")
                    break
        except Exception:
            # If bank list query fails, keep default
            pass

        return {
            "accountName": account_name,
            "bankName": bank_name
        }
