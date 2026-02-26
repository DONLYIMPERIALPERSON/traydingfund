from app.core.celery import celery_app
from app.services.email_service import (
    send_pin_otp_email as sync_send_pin_otp_email,
    send_payout_notification as sync_send_payout_notification,
    send_admin_settings_otp_email as sync_send_admin_settings_otp_email,
    send_welcome_email as sync_send_welcome_email,
    send_challenge_pass_email as sync_send_challenge_pass_email,
    send_challenge_breach_email as sync_send_challenge_breach_email,
    send_challenge_objective_email as sync_send_challenge_objective_email,
    send_kyc_approved_email as sync_send_kyc_approved_email,
    send_announcement_email as sync_send_announcement_email,
)
from app.models.challenge_account import ChallengeAccount
from app.models.mt5_account import MT5Account
from app.models.user import User
from app.services.challenge_objectives import (
    process_challenge_feed,
    compute_max_permitted_loss_left,
    compute_unrealized_pnl,
    compute_win_rate,
    is_min_trading_days_met,
)
from app.db.session import SessionLocal
from datetime import datetime

@celery_app.task
def send_pin_otp_email(to_email: str, otp_code: str):
    sync_send_pin_otp_email(to_email=to_email, otp_code=otp_code)

@celery_app.task
def send_payout_notification(to_email: str, subject: str, message: str):
    sync_send_payout_notification(to_email=to_email, subject=subject, message=message)

@celery_app.task
def send_admin_settings_otp_email(to_email: str, otp_code: str):
    sync_send_admin_settings_otp_email(to_email=to_email, otp_code=otp_code)

@celery_app.task
def send_welcome_email(to_email: str, message: str):
    sync_send_welcome_email(to_email=to_email, message=message)

@celery_app.task
def send_challenge_pass_email(to_email: str, message: str):
    sync_send_challenge_pass_email(to_email=to_email, message=message)

@celery_app.task
def send_challenge_breach_email(to_email: str, message: str):
    sync_send_challenge_breach_email(to_email=to_email, message=message)

@celery_app.task
def send_challenge_objective_email(to_email: str, subject: str, message: str):
    sync_send_challenge_objective_email(to_email=to_email, subject=subject, message=message)

@celery_app.task
def send_kyc_approved_email(to_email: str, account_name: str, bank_name: str, bank_account_number: str):
    sync_send_kyc_approved_email(to_email=to_email, account_name=account_name, bank_name=bank_name, bank_account_number=bank_account_number)

@celery_app.task
def send_announcement_email(to_emails: list[str], subject: str, message: str):
    sync_send_announcement_email(to_emails=to_emails, subject=subject, message=message)

@celery_app.task(bind=True, max_retries=3)
def process_mt5_feed(
    self,
    challenge_id: str,
    balance: float,
    equity: float,
    closed_trade_durations_seconds: list[int],
    scalping_breach_increment: int,
    equity_breach_signal: bool,
    balance_breach_signal: bool,
    stage_pass_signal: bool,
    closed_trades_count_increment: int,
    winning_trades_count_increment: int,
    lots_traded_increment: float,
    today_closed_pnl: float,
    today_trades_count: int,
    today_lots_total: float,
    observed_at: datetime
) -> dict:
    db = SessionLocal()
    try:
        challenge = db.query(ChallengeAccount).filter(ChallengeAccount.challenge_id == challenge_id).first()
        if not challenge:
            return {"error": "Challenge not found"}

        user = db.get(User, challenge.user_id)
        prev_status = challenge.objective_status
        prev_payout_amount = challenge.funded_user_payout_amount

        updated_challenge, transitioned_to_stage = process_challenge_feed(
            db,
            challenge=challenge,
            balance=balance,
            equity=equity,
            closed_trade_durations_seconds=closed_trade_durations_seconds,
            scalping_breach_increment=scalping_breach_increment,
            equity_breach_signal=equity_breach_signal,
            balance_breach_signal=balance_breach_signal,
            stage_pass_signal=stage_pass_signal,
            closed_trades_count_increment=closed_trades_count_increment,
            winning_trades_count_increment=winning_trades_count_increment,
            lots_traded_increment=lots_traded_increment,
            today_closed_pnl=today_closed_pnl,
            today_trades_count=today_trades_count,
            today_lots_total=today_lots_total,
            observed_at=observed_at,
        )

        db.commit()
        db.refresh(updated_challenge)

        if updated_challenge.objective_status == "breached" and prev_status != "breached":
            breach_reason_lookup = {
                "drawdown_limit": "drawdown",
                "scalping_rule": "scalping rule",
                "equity_signal": "equity breach signal",
                "balance_signal": "balance breach signal",
            }
            breach_reason = breach_reason_lookup.get(updated_challenge.breached_reason or "", "risk rule")
            _try_send_challenge_mail(
                user=user,
                subject="Challenge Stage Breached",
                message=(
                    f"Your challenge {updated_challenge.challenge_id} was breached at {updated_challenge.current_stage} "
                    f"due to {breach_reason}."
                ),
            )

        if transitioned_to_stage is not None:
            active_mt5 = db.get(MT5Account, updated_challenge.active_mt5_account_id) if updated_challenge.active_mt5_account_id else None
            if active_mt5:
                message = (
                    f"Congratulations! You passed {updated_challenge.passed_stage or 'your stage'} and have been moved "
                    f"to {transitioned_to_stage}.\n\n"
                    f"Your new MT5 trading account details:\n"
                    f"• Account Number: {active_mt5.account_number}\n"
                    f"• Server: {active_mt5.server}\n"
                    f"• Password: {active_mt5.password}\n\n"
                    f"You can now log in to your MT5 platform and continue trading."
                )
            else:
                message = (
                    f"Congratulations! You passed {updated_challenge.passed_stage or 'your stage'} and have been moved "
                    f"to {transitioned_to_stage}."
                )
            _try_send_challenge_mail(
                user=user,
                subject="Challenge Stage Passed",
                message=message,
            )

            # Generate certificate for Funded stage progression
            if transitioned_to_stage == "Funded":
                try:
                    from app.services.certificate_service import get_certificate_service
                    certificate_service = get_certificate_service()
                    certificate_service.generate_funding_certificate(
                        user_id=user.id,
                        challenge_account_id=updated_challenge.challenge_id,
                        account_size=updated_challenge.account_size,
                        db=db
                    )
                except Exception as e:
                    # Log certificate generation failure but don't fail the progression
                    print(f"Certificate generation failed for user {user.email}: {e}")
                    pass

        if updated_challenge.objective_status == "awaiting_next_stage_account":
            _try_send_challenge_mail(
                user=user,
                subject="Challenge Progress Pending",
                message=(
                    f"You passed {updated_challenge.passed_stage or 'the current stage'}, but the next stage account is "
                    "not yet available. Our team will assign it shortly."
                ),
            )

        if (
            updated_challenge.current_stage == "Funded"
            and updated_challenge.objective_status == "active"
            and updated_challenge.funded_user_payout_amount > prev_payout_amount
        ):
            _try_send_challenge_mail(
                user=user,
                subject="Funded Account Profit Update",
                message=(
                    f"Your funded account eligible payout is now ₦{updated_challenge.funded_user_payout_amount:,.2f} "
                    f"(capped profit: ₦{updated_challenge.funded_profit_capped:,.2f})."
                ),
            )

        min_trading_days_required, stage_elapsed_hours, min_trading_days_met = is_min_trading_days_met(
            db, updated_challenge, now=observed_at
        )

        return {
            "challenge_id": updated_challenge.challenge_id,
            "stage": updated_challenge.current_stage,
            "objective_status": updated_challenge.objective_status,
            "breached_reason": updated_challenge.breached_reason,
            "passed_stage": updated_challenge.passed_stage,
            "highest_balance": updated_challenge.highest_balance,
            "breach_balance": updated_challenge.breach_balance,
            "profit_target_balance": updated_challenge.profit_target_balance,
            "scalping_violations_count": updated_challenge.scalping_violations_count,
            "funded_profit_raw": updated_challenge.funded_profit_raw,
            "funded_profit_capped": updated_challenge.funded_profit_capped,
            "funded_profit_cap_amount": updated_challenge.funded_profit_cap_amount,
            "funded_user_payout_amount": updated_challenge.funded_user_payout_amount,
            "unrealized_pnl": compute_unrealized_pnl(updated_challenge),
            "max_permitted_loss_left": compute_max_permitted_loss_left(updated_challenge),
            "win_rate": compute_win_rate(updated_challenge),
            "min_trading_days_required": min_trading_days_required,
            "min_trading_days_met": min_trading_days_met,
            "stage_elapsed_hours": round(stage_elapsed_hours, 2),
            "closed_trades_count": updated_challenge.closed_trades_count,
            "winning_trades_count": updated_challenge.winning_trades_count,
            "lots_traded_total": round(updated_challenge.lots_traded_total, 2),
            "today_closed_pnl": round(updated_challenge.today_closed_pnl, 2),
            "today_trades_count": updated_challenge.today_trades_count,
            "today_lots_total": round(updated_challenge.today_lots_total, 2),
            "transitioned_to_stage": transitioned_to_stage,
        }
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()

