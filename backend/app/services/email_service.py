import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException, status

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.email_log import EmailLog


EMAIL_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "emails"
HTML_TEMPLATE_PATH = EMAIL_TEMPLATE_DIR / "email.html"
TEXT_TEMPLATE_PATH = EMAIL_TEMPLATE_DIR / "email.txt"
HERO_IMAGE_URL = "https://pub-5619531ec8e749dbbaa3df7c20144145.r2.dev/e33cabf818e9c488dbe37cf73f4024b5.jpg"


def _render_html_template(otp_code: str) -> str:
    html = HTML_TEMPLATE_PATH.read_text(encoding="utf-8")
    html = html.replace("OTP Code: 681248", f"OTP Code: {otp_code}")
    html = html.replace("images/e33cabf818e9c488dbe37cf73f4024b5.jpg", HERO_IMAGE_URL)
    return html


def _render_text_template(otp_code: str) -> str:
    text = TEXT_TEMPLATE_PATH.read_text(encoding="utf-8")
    return text.replace("OTP Code: 681248", f"OTP Code: {otp_code}")


def _render_admin_html_template(otp_code: str) -> str:
    html = _render_html_template(otp_code)
    html = html.replace("Dear User,", "Dear Admin,")
    html = html.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:<br>",
        "You are attempting to modify challenge settings in the admin portal. Please use the OTP code below to authorize this change:<br>",
    )
    return html


def _render_admin_text_template(otp_code: str) -> str:
    text = _render_text_template(otp_code)
    text = text.replace("Dear User,", "Dear Admin,")
    text = text.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "You are attempting to modify challenge settings in the admin portal. Please use the OTP code below to authorize this change:",
    )
    return text


def send_pin_otp_email(*, to_email: str, otp_code: str) -> None:
    subject = "Your NairaTrader OTP Code"
    if not settings.resend_api_key:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message="RESEND_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY is not configured",
        )

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": subject,
        "html": _render_html_template(otp_code),
        "text": _render_text_template(otp_code),
    }

    request = Request(
        url=f"{settings.resend_api_base_url}/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NairaTrader-Backend/1.0 (+https://nairatrader.is)",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if response.status >= 400:
                _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=f"HTTP {response.status}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to send OTP email",
                )
        _record_email_log(to_email=to_email, subject=subject, status="sent", error_message=None)
    except HTTPError as exc:
        error_detail = exc.read().decode("utf-8", errors="ignore")
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=error_detail or str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resend API error: {error_detail or exc.reason}",
        ) from exc
    except URLError as exc:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Resend API",
        ) from exc


def send_payout_notification(*, to_email: str, subject: str = "Payout Update", message: str) -> None:
    """Send payout-related emails using the professional NairaTrader template."""
    if not settings.resend_api_key:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message="RESEND_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY is not configured",
        )

    # Use the same professional template as welcome emails for payout notifications
    html = HTML_TEMPLATE_PATH.read_text(encoding="utf-8")
    html = html.replace("YOUR OTP VALIDATION CODE", subject.upper())
    html = html.replace("OTP Code: 681248", message.replace("\n", "<br>"))
    html = html.replace("images/e33cabf818e9c488dbe37cf73f4024b5.jpg", HERO_IMAGE_URL)
    html = html.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "Here's your payout update from NairaTrader:",
    )
    html = html.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Thank you for trading with NairaTrader. We're committed to fast and secure payouts.",
    )

    # Create text version
    text = TEXT_TEMPLATE_PATH.read_text(encoding="utf-8")
    text = text.replace("YOUR OTP VALIDATION CODE", subject.upper())
    text = text.replace("OTP Code: 681248", message)
    text = text.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "Here's your payout update from NairaTrader:",
    )
    text = text.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Thank you for trading with NairaTrader. We're committed to fast and secure payouts.",
    )

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": f"{subject} - NairaTrader",
        "html": html,
        "text": text,
    }

    request = Request(
        url=f"{settings.resend_api_base_url}/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NairaTrader-Backend/1.0 (+https://nairatrader.is)",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if response.status >= 400:
                _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=f"HTTP {response.status}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to send payout notification email",
                )
        _record_email_log(to_email=to_email, subject=subject, status="sent", error_message=None)
    except HTTPError as exc:
        error_detail = exc.read().decode("utf-8", errors="ignore")
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=error_detail or str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resend API error: {error_detail or exc.reason}",
        ) from exc
    except URLError as exc:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Resend API",
        ) from exc


def send_admin_settings_otp_email(*, to_email: str, otp_code: str) -> None:
    subject = "Your NairaTrader Admin OTP Code"
    if not settings.resend_api_key:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message="RESEND_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY is not configured",
        )

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": subject,
        "html": _render_admin_html_template(otp_code),
        "text": _render_admin_text_template(otp_code),
    }

    request = Request(
        url=f"{settings.resend_api_base_url}/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NairaTrader-Backend/1.0 (+https://nairatrader.is)",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if response.status >= 400:
                _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=f"HTTP {response.status}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to send OTP email",
                )
        _record_email_log(to_email=to_email, subject=subject, status="sent", error_message=None)
    except HTTPError as exc:
        error_detail = exc.read().decode("utf-8", errors="ignore")
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=error_detail or str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resend API error: {error_detail or exc.reason}",
        ) from exc
    except URLError as exc:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Resend API",
        ) from exc


def _render_welcome_html_template(message: str) -> str:
    html = HTML_TEMPLATE_PATH.read_text(encoding="utf-8")
    html = html.replace("YOUR OTP VALIDATION CODE", "WELCOME TO NAIRATRADER")
    html = html.replace("OTP Code: 681248", message.replace("\n", "<br>"))
    html = html.replace("images/e33cabf818e9c488dbe37cf73f4024b5.jpg", HERO_IMAGE_URL)
    html = html.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "Congratulations! Your challenge account has been successfully created. Here are your account details:",
    )
    html = html.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Please keep this information secure and do not share it with anyone. You can now log in to your MT5 platform and start trading.",
    )
    return html


def _render_welcome_text_template(message: str) -> str:
    text = TEXT_TEMPLATE_PATH.read_text(encoding="utf-8")
    text = text.replace("YOUR OTP VALIDATION CODE", "WELCOME TO NAIRATRADER")
    text = text.replace("OTP Code: 681248", message)
    text = text.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "Congratulations! Your challenge account has been successfully created. Here are your account details:",
    )
    text = text.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Please keep this information secure and do not share it with anyone. You can now log in to your MT5 platform and start trading.",
    )
    return text


def send_welcome_email(*, to_email: str, message: str) -> None:
    """Send welcome email using the same template as OTP emails."""
    subject = "Welcome to NairaTrader - Your Challenge Account is Ready!"
    if not settings.resend_api_key:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message="RESEND_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY is not configured",
        )

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": subject,
        "html": _render_welcome_html_template(message),
        "text": _render_welcome_text_template(message),
    }

    request = Request(
        url=f"{settings.resend_api_base_url}/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NairaTrader-Backend/1.0 (+https://nairatrader.is)",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if response.status >= 400:
                _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=f"HTTP {response.status}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to send welcome email",
                )
        _record_email_log(to_email=to_email, subject=subject, status="sent", error_message=None)
    except HTTPError as exc:
        error_detail = exc.read().decode("utf-8", errors="ignore")
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=error_detail or str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resend API error: {error_detail or exc.reason}",
        ) from exc
    except URLError as exc:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Resend API",
        ) from exc


def _render_challenge_pass_html_template(message: str) -> str:
    html = HTML_TEMPLATE_PATH.read_text(encoding="utf-8")
    html = html.replace("YOUR OTP VALIDATION CODE", "🎉 CHALLENGE STAGE PASSED!")
    html = html.replace("OTP Code: 681248", message.replace("\n", "<br>"))
    html = html.replace("images/e33cabf818e9c488dbe37cf73f4024b5.jpg", HERO_IMAGE_URL)
    html = html.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "Congratulations! You have successfully passed your challenge stage. Here are the details:",
    )
    html = html.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Your new trading account is now ready. Log in to your MT5 platform and continue your journey to becoming a funded trader.",
    )
    return html


def _render_challenge_pass_text_template(message: str) -> str:
    text = TEXT_TEMPLATE_PATH.read_text(encoding="utf-8")
    text = text.replace("YOUR OTP VALIDATION CODE", "CHALLENGE STAGE PASSED!")
    text = text.replace("OTP Code: 681248", message)
    text = text.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "Congratulations! You have successfully passed your challenge stage. Here are the details:",
    )
    text = text.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Your new trading account is now ready. Log in to your MT5 platform and continue your journey to becoming a funded trader.",
    )
    return text


def _render_challenge_breach_html_template(message: str) -> str:
    html = HTML_TEMPLATE_PATH.read_text(encoding="utf-8")
    html = html.replace("YOUR OTP VALIDATION CODE", "⚠️ CHALLENGE BREACH NOTICE")
    html = html.replace("OTP Code: 681248", message.replace("\n", "<br>"))
    html = html.replace("images/e33cabf818e9c488dbe37cf73f4024b5.jpg", HERO_IMAGE_URL)
    html = html.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "We regret to inform you that your challenge account has been breached. Here are the details:",
    )
    html = html.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Don't worry! You can start a new challenge anytime. Review our trading rules and try again.",
    )
    return html


def _render_challenge_breach_text_template(message: str) -> str:
    text = TEXT_TEMPLATE_PATH.read_text(encoding="utf-8")
    text = text.replace("YOUR OTP VALIDATION CODE", "CHALLENGE BREACH NOTICE")
    text = text.replace("OTP Code: 681248", message)
    text = text.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "We regret to inform you that your challenge account has been breached. Here are the details:",
    )
    text = text.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Don't worry! You can start a new challenge anytime. Review our trading rules and try again.",
    )
    return text


def send_challenge_pass_email(*, to_email: str, message: str) -> None:
    """Send challenge stage pass email using the professional template."""
    subject = "🎉 Congratulations! Challenge Stage Passed - NairaTrader"
    if not settings.resend_api_key:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message="RESEND_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY is not configured",
        )

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": subject,
        "html": _render_challenge_pass_html_template(message),
        "text": _render_challenge_pass_text_template(message),
    }

    request = Request(
        url=f"{settings.resend_api_base_url}/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NairaTrader-Backend/1.0 (+https://nairatrader.is)",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if response.status >= 400:
                _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=f"HTTP {response.status}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to send challenge pass email",
                )
        _record_email_log(to_email=to_email, subject=subject, status="sent", error_message=None)
    except HTTPError as exc:
        error_detail = exc.read().decode("utf-8", errors="ignore")
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=error_detail or str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resend API error: {error_detail or exc.reason}",
        ) from exc
    except URLError as exc:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Resend API",
        ) from exc


def send_challenge_breach_email(*, to_email: str, message: str) -> None:
    """Send challenge breach email using the professional template."""
    subject = "⚠️ Challenge Account Breached - NairaTrader"
    if not settings.resend_api_key:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message="RESEND_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY is not configured",
        )

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": subject,
        "html": _render_challenge_breach_html_template(message),
        "text": _render_challenge_breach_text_template(message),
    }

    request = Request(
        url=f"{settings.resend_api_base_url}/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NairaTrader-Backend/1.0 (+https://nairatrader.is)",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if response.status >= 400:
                _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=f"HTTP {response.status}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to send challenge breach email",
                )
        _record_email_log(to_email=to_email, subject=subject, status="sent", error_message=None)
    except HTTPError as exc:
        error_detail = exc.read().decode("utf-8", errors="ignore")
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=error_detail or str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resend API error: {error_detail or exc.reason}",
        ) from exc
    except URLError as exc:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Resend API",
        ) from exc


def send_challenge_objective_email(*, to_email: str, subject: str, message: str) -> None:
    """Send challenge progression emails using the professional NairaTrader template."""
    if not settings.resend_api_key:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message="RESEND_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY is not configured",
        )

    # Use the same professional template as welcome emails for all challenge updates
    html = HTML_TEMPLATE_PATH.read_text(encoding="utf-8")
    html = html.replace("YOUR OTP VALIDATION CODE", subject.upper())
    html = html.replace("OTP Code: 681248", message.replace("\n", "<br>"))
    html = html.replace("images/e33cabf818e9c488dbe37cf73f4024b5.jpg", HERO_IMAGE_URL)
    html = html.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "Here's your latest challenge update from NairaTrader:",
    )
    html = html.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Thank you for trading with NairaTrader. We're here to support your journey to becoming a funded trader.",
    )

    # Create text version
    text = TEXT_TEMPLATE_PATH.read_text(encoding="utf-8")
    text = text.replace("YOUR OTP VALIDATION CODE", subject.upper())
    text = text.replace("OTP Code: 681248", message)
    text = text.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "Here's your latest challenge update from NairaTrader:",
    )
    text = text.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Thank you for trading with NairaTrader. We're here to support your journey to becoming a funded trader.",
    )

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": subject,
        "html": html,
        "text": text,
    }

    request = Request(
        url=f"{settings.resend_api_base_url}/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NairaTrader-Backend/1.0 (+https://nairatrader.is)",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if response.status >= 400:
                _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=f"HTTP {response.status}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to send challenge notification email",
                )
        _record_email_log(to_email=to_email, subject=subject, status="sent", error_message=None)
    except HTTPError as exc:
        error_detail = exc.read().decode("utf-8", errors="ignore")
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=error_detail or str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resend API error: {error_detail or exc.reason}",
        ) from exc
    except URLError as exc:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Resend API",
        ) from exc


def send_kyc_approved_email(*, to_email: str, account_name: str, bank_name: str, bank_account_number: str) -> None:
    subject = "KYC Approved - Withdrawal Profile Ready"
    if not settings.resend_api_key:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message="RESEND_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY is not configured",
        )

    masked = f"****{bank_account_number[-4:]}" if len(bank_account_number) >= 4 else bank_account_number
    message = (
        f"Your KYC profile has been approved automatically. Your verified payout details are {account_name} "
        f"({bank_name}, {masked}). You can now request withdrawals when eligible."
    )

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": subject,
        "html": f"""
            <div style=\"font-family:Arial,sans-serif;line-height:1.5;color:#111\">
              <h2 style=\"margin-bottom:8px\">NairaTrader KYC Approved</h2>
              <p>{message}</p>
              <p style=\"margin-top:20px\">Best regards,<br/>NairaTrader Team</p>
            </div>
        """,
        "text": f"NairaTrader KYC Approved\n\n{message}\n\nBest regards,\nNairaTrader Team",
    }

    request = Request(
        url=f"{settings.resend_api_base_url}/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NairaTrader-Backend/1.0 (+https://nairatrader.is)",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if response.status >= 400:
                _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=f"HTTP {response.status}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to send KYC approval email",
                )
        _record_email_log(to_email=to_email, subject=subject, status="sent", error_message=None)
    except HTTPError as exc:
        error_detail = exc.read().decode("utf-8", errors="ignore")
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=error_detail or str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resend API error: {error_detail or exc.reason}",
        ) from exc
    except URLError as exc:
        _record_email_log(to_email=to_email, subject=subject, status="failed", error_message=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Resend API",
        ) from exc


def _render_announcement_html_template(subject: str, message: str) -> str:
    html = HTML_TEMPLATE_PATH.read_text(encoding="utf-8")
    html = html.replace("YOUR OTP VALIDATION CODE", subject.upper())
    html = html.replace("OTP Code: 681248", message.replace("\n", "<br>"))
    html = html.replace("images/e33cabf818e9c488dbe37cf73f4024b5.jpg", HERO_IMAGE_URL)
    html = html.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "Here's an important announcement from NairaTrader:",
    )
    html = html.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Thank you for being part of the NairaTrader community. We're committed to providing you with the best trading experience.",
    )
    return html


def _render_announcement_text_template(subject: str, message: str) -> str:
    text = TEXT_TEMPLATE_PATH.read_text(encoding="utf-8")
    text = text.replace("YOUR OTP VALIDATION CODE", subject.upper())
    text = text.replace("OTP Code: 681248", message)
    text = text.replace(
        "You are attempting to access a secure area that requires One-Time Password (OTP) verification. Please use the code below to proceed with your request:",
        "Here's an important announcement from NairaTrader:",
    )
    text = text.replace(
        "This code is valid for one-time use only and will expire within five minutes. If you did not initiate this request, please ignore this message.",
        "Thank you for being part of the NairaTrader community. We're committed to providing you with the best trading experience.",
    )
    return text


def send_announcement_email(*, to_emails: list[str], subject: str, message: str) -> None:
    """Send announcement emails to multiple recipients using the professional NairaTrader template."""
    if not settings.resend_api_key:
        for email in to_emails:
            _record_email_log(to_email=email, subject=subject, status="failed", error_message="RESEND_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY is not configured",
        )

    payload = {
        "from": settings.resend_from_email,
        "to": to_emails,
        "subject": f"📢 {subject} - NairaTrader",
        "html": _render_announcement_html_template(subject, message),
        "text": _render_announcement_text_template(subject, message),
    }

    request = Request(
        url=f"{settings.resend_api_base_url}/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NairaTrader-Backend/1.0 (+https://nairatrader.is)",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:  # Longer timeout for bulk emails
            if response.status >= 400:
                for email in to_emails:
                    _record_email_log(to_email=email, subject=subject, status="failed", error_message=f"HTTP {response.status}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to send announcement email",
                )
        for email in to_emails:
            _record_email_log(to_email=email, subject=subject, status="sent", error_message=None)
    except HTTPError as exc:
        error_detail = exc.read().decode("utf-8", errors="ignore")
        for email in to_emails:
            _record_email_log(to_email=email, subject=subject, status="failed", error_message=error_detail or str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resend API error: {error_detail or exc.reason}",
        ) from exc
    except URLError as exc:
        for email in to_emails:
            _record_email_log(to_email=email, subject=subject, status="failed", error_message=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Resend API",
        ) from exc


def _record_email_log(
    *,
    to_email: str,
    subject: str,
    status: str,
    error_message: str | None,
) -> None:
    try:
        db = SessionLocal()
        db.add(
            EmailLog(
                to_email=to_email,
                subject=subject,
                status=status,
                error_message=error_message,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
