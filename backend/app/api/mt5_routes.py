from datetime import datetime, timezone
from io import StringIO
import csv

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin_allowlisted
from app.db.deps import get_db
from app.models.challenge_account import ChallengeAccount
from app.models.mt5_account import MT5Account
from app.models.payment_order import PaymentOrder
from app.models.user import User
from app.services.challenge_objectives import initialize_challenge_stage_tracking
from app.tasks import send_welcome_email
from app.services.certificate_service import get_certificate_service
from app.schemas.mt5_account import (
    MT5AccountAssignRequest,
    MT5AccountBulkCreateRequest,
    MT5AccountResponse,
    MT5AccountStatusUpdateRequest,
    MT5AccountTextUploadRequest,
)


router = APIRouter(prefix="/admin/mt5", tags=["MT5 Accounts"])

ASSIGNED_STAGES = {"Phase 1", "Phase 2", "Funded"}
TXT_TEMPLATE = """server,account_number,password,investor_password,account_size,status
MT5-Live-01,10314521,Tr@de#8721,Inv@2210,₦200k Account,Ready
MT5-Live-01,10314522,Tr@de#8722,Inv@2211,₦400k Account,Ready
"""


def _generate_challenge_id(db: Session, *, prefix: str = "CH") -> str:
    latest = db.scalar(select(ChallengeAccount.id).order_by(ChallengeAccount.id.desc()))
    next_seq = (latest + 1) if latest else 1
    return f"{prefix}-{next_seq:05d}"


def _auto_assign_pending_orders(db: Session) -> None:
    """Automatically assign MT5 accounts to pending payment orders when new accounts are uploaded."""
    # Find all pending orders that are paid but awaiting account assignment
    pending_orders = db.scalars(
        select(PaymentOrder).where(
            PaymentOrder.status == "paid",
            PaymentOrder.assignment_status == "awaiting_account"
        ).order_by(PaymentOrder.paid_at.asc())
    ).all()

    if not pending_orders:
        return

    # Group orders by account size
    orders_by_size: dict[str, list[PaymentOrder]] = {}
    for order in pending_orders:
        if order.account_size not in orders_by_size:
            orders_by_size[order.account_size] = []
        orders_by_size[order.account_size].append(order)

    # For each account size, find available ready accounts and assign them
    for account_size, orders in orders_by_size.items():
        # Find ready accounts of this size
        ready_accounts = db.scalars(
            select(MT5Account).where(
                MT5Account.status == "Ready",
                MT5Account.account_size == account_size
            ).order_by(MT5Account.id.asc())
        ).all()

        if not ready_accounts:
            continue

        # Assign accounts to orders (first come, first served)
        for i, order in enumerate(orders):
            if i >= len(ready_accounts):
                break

            account = ready_accounts[i]
            user = db.get(User, order.user_id)
            if not user:
                continue

            # Create challenge account
            challenge_id = _generate_challenge_id(db, prefix="CH")
            challenge = ChallengeAccount(
                challenge_id=challenge_id,
                user_id=user.id,
                account_size=account.account_size,
                current_stage="Phase 1",
                phase1_mt5_account_id=account.id,
                phase2_mt5_account_id=None,
                funded_mt5_account_id=None,
                active_mt5_account_id=account.id,
            )
            initialize_challenge_stage_tracking(challenge, account_size=account.account_size)
            db.add(challenge)
            db.flush()

            # Update MT5 account
            account.status = "Phase 1"
            account.assignment_mode = "automatic"
            account.assigned_user_id = user.id
            account.assigned_at = datetime.now(timezone.utc)
            account.assigned_by_admin_name = "System (Auto-assigned)"
            db.add(account)

            # Update payment order
            order.assignment_status = "assigned"
            order.assigned_mt5_account_id = account.id
            order.challenge_id = challenge_id
            db.add(order)

            # Send welcome email (don't fail the assignment if email fails)
            try:
                send_welcome_email.delay(
                    user_email=user.email,
                    user_name=user.full_name,
                    challenge_id=challenge_id,
                    account_size=account.account_size,
                    mt5_server=account.server,
                    mt5_account=account.account_number,
                    mt5_password=account.password,
                    mt5_investor_password=account.investor_password,
                    payment_amount_kobo=order.net_amount_kobo,
                )
            except Exception as e:
                # Log email failure but don't fail the assignment
                print(f"Email failed for user {user.email}: {e}")
                pass

    db.commit()


def _auto_assign_awaiting_challenges(db: Session) -> None:
    """Automatically assign MT5 accounts to challenges awaiting next stage accounts."""
    from app.services.challenge_objectives import initialize_challenge_stage_tracking

    # Find all challenges awaiting next stage accounts
    awaiting_challenges = db.scalars(
        select(ChallengeAccount).where(
            ChallengeAccount.objective_status == "awaiting_next_stage_account"
        ).order_by(ChallengeAccount.id.asc())
    ).all()

    if not awaiting_challenges:
        return

    # Group challenges by account size
    challenges_by_size: dict[str, list[ChallengeAccount]] = {}
    for challenge in awaiting_challenges:
        if challenge.account_size not in challenges_by_size:
            challenges_by_size[challenge.account_size] = []
        challenges_by_size[challenge.account_size].append(challenge)

    # For each account size, find available ready accounts and assign them
    for account_size, challenges in challenges_by_size.items():
        # Find ready accounts of this size
        ready_accounts = db.scalars(
            select(MT5Account).where(
                MT5Account.status == "Ready",
                MT5Account.account_size == account_size
            ).order_by(MT5Account.id.asc())
        ).all()

        if not ready_accounts:
            continue

        # Assign accounts to challenges (first come, first served)
        for i, challenge in enumerate(challenges):
            if i >= len(ready_accounts):
                break

            account = ready_accounts[i]
            user = db.get(User, challenge.user_id)
            if not user:
                continue

            # Determine next stage based on current stage
            next_stage = "Phase 2" if challenge.current_stage == "Phase 1" else "Funded"

            # Update MT5 account
            account.status = next_stage
            account.assignment_mode = "automatic"
            account.assigned_user_id = challenge.user_id
            account.assigned_at = datetime.now(timezone.utc)
            account.assigned_by_admin_name = "System (Auto-assigned)"
            db.add(account)

            # Update challenge account
            challenge.current_stage = next_stage
            challenge.active_mt5_account_id = account.id
            if next_stage == "Phase 2":
                challenge.phase2_mt5_account_id = account.id
            elif next_stage == "Funded":
                challenge.funded_mt5_account_id = account.id

                # Generate funding certificate for the user
                try:
                    certificate_service = get_certificate_service()
                    certificate_service.generate_funding_certificate(
                        user_id=user.id,
                        challenge_account_id=challenge.challenge_id,
                        account_size=challenge.account_size,
                        db=db
                    )
                except Exception as e:
                    # Log certificate generation failure but don't fail the assignment
                    print(f"Certificate generation failed for user {user.email}: {e}")
                    pass

            # Reset challenge status and initialize new stage tracking
            challenge.objective_status = "active"
            challenge.passed_stage = None
            challenge.passed_at = None
            initialize_challenge_stage_tracking(challenge, account_size=account.account_size)
            db.add(challenge)

            # Send stage progression email
            try:
                from app.tasks import send_challenge_objective_email
                message = (
                    f"Congratulations! You have been automatically progressed to {next_stage}.\n\n"
                    f"Your new MT5 trading account details:\n"
                    f"• Account Number: {account.account_number}\n"
                    f"• Server: {account.server}\n"
                    f"• Password: {account.password}\n\n"
                    f"You can now log in to your MT5 platform and continue trading."
                )
                send_challenge_objective_email.delay(
                    to_email=user.email,
                    subject=f"Challenge Progressed to {next_stage}",
                    message=message,
                )
            except Exception as e:
                # Log email failure but don't fail the assignment
                print(f"Email failed for user {user.email}: {e}")
                pass

    db.commit()


@router.get("/challenge-id/next")
def get_next_challenge_id(
    mode: str = Query(default="manual"),
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    prefix = "MCH" if mode == "manual" else "CH"
    return {"challenge_id": _generate_challenge_id(db, prefix=prefix)}


def _parse_accounts_from_txt(content: str) -> list[dict[str, str]]:
    try:
        reader = csv.DictReader(StringIO(content.strip()))
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid TXT/CSV content") from exc

    required_columns = {"server", "account_number", "password", "investor_password", "account_size", "status"}
    if reader.fieldnames is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Template header row is missing")

    incoming_columns = {field.strip() for field in reader.fieldnames}
    missing = required_columns - incoming_columns
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns: {', '.join(sorted(missing))}",
        )

    allowed_status = {"Ready", "Phase 1", "Phase 2", "Funded", "Disabled", "Withdrawn"}
    rows: list[dict[str, str]] = []
    for idx, raw in enumerate(reader, start=2):
        row = {k.strip(): (v or "").strip() for k, v in raw.items()}
        if not any(row.values()):
            continue

        for field in required_columns:
            if not row.get(field):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Row {idx}: field '{field}' is required",
                )

        if row["status"] not in allowed_status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {idx}: invalid status '{row['status']}'",
            )

        rows.append(row)

    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No account rows found in upload")

    return rows


@router.get("/accounts")
def list_mt5_accounts(
    status_filter: str | None = Query(default=None, alias="status"),
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[MT5AccountResponse]]:
    stmt = select(MT5Account).order_by(MT5Account.id.desc())
    if status_filter:
        stmt = stmt.where(MT5Account.status == status_filter)

    rows = db.scalars(stmt).all()
    return {"accounts": [MT5AccountResponse.model_validate(row) for row in rows]}


@router.get("/accounts/summary")
def mt5_accounts_summary(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    total = db.scalar(select(func.count(MT5Account.id))) or 0
    ready = db.scalar(select(func.count(MT5Account.id)).where(MT5Account.status == "Ready")) or 0
    assigned = db.scalar(select(func.count(MT5Account.id)).where(MT5Account.status.in_(tuple(ASSIGNED_STAGES)))) or 0
    disabled = db.scalar(select(func.count(MT5Account.id)).where(MT5Account.status == "Disabled")) or 0

    return {
        "total": int(total),
        "ready": int(ready),
        "assigned": int(assigned),
        "disabled": int(disabled),
    }


@router.get("/accounts/assigned")
def list_assigned_mt5_accounts(
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[MT5AccountResponse]]:
    rows = db.scalars(
        select(MT5Account)
        .where(MT5Account.status.in_(tuple(ASSIGNED_STAGES)))
        .order_by(MT5Account.assigned_at.desc().nullslast(), MT5Account.id.desc())
    ).all()
    return {"accounts": [MT5AccountResponse.model_validate(row) for row in rows]}


@router.get("/accounts/template", response_class=PlainTextResponse)
def download_mt5_accounts_template(_: User = Depends(get_current_admin_allowlisted)) -> str:
    return TXT_TEMPLATE


@router.post("/accounts", status_code=status.HTTP_201_CREATED)
def create_mt5_accounts(
    payload: MT5AccountBulkCreateRequest,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[MT5AccountResponse]]:
    incoming_numbers = [item.account_number.strip() for item in payload.accounts]
    if len(incoming_numbers) != len(set(incoming_numbers)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate account_number in request")

    existing_numbers = set(
        db.scalars(select(MT5Account.account_number).where(MT5Account.account_number.in_(incoming_numbers))).all()
    )
    if existing_numbers:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Account number already exists: {', '.join(sorted(existing_numbers))}",
        )

    created_rows: list[MT5Account] = []
    for item in payload.accounts:
        row = MT5Account(
            server=item.server.strip(),
            account_number=item.account_number.strip(),
            password=item.password,
            investor_password=item.investor_password,
            account_size=item.account_size.strip(),
            status=item.status,
            assignment_mode=None,
            assigned_user_id=None,
            assigned_at=None,
        )
        created_rows.append(row)

    db.add_all(created_rows)
    db.commit()

    for row in created_rows:
        db.refresh(row)

    # Auto-assign pending orders and awaiting challenges to newly created ready accounts
    _auto_assign_pending_orders(db)
    _auto_assign_awaiting_challenges(db)

    return {"accounts": [MT5AccountResponse.model_validate(row) for row in created_rows]}


@router.post("/accounts/upload-txt", status_code=status.HTTP_201_CREATED)
def upload_mt5_accounts_from_txt(
    payload: MT5AccountTextUploadRequest,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, list[MT5AccountResponse]]:
    parsed_rows = _parse_accounts_from_txt(payload.content)

    incoming_numbers = [row["account_number"] for row in parsed_rows]
    if len(incoming_numbers) != len(set(incoming_numbers)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate account_number in upload")

    existing_numbers = set(
        db.scalars(select(MT5Account.account_number).where(MT5Account.account_number.in_(incoming_numbers))).all()
    )
    if existing_numbers:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Account number already exists: {', '.join(sorted(existing_numbers))}",
        )

    created_rows: list[MT5Account] = []
    for row in parsed_rows:
        account = MT5Account(
            server=row["server"],
            account_number=row["account_number"],
            password=row["password"],
            investor_password=row["investor_password"],
            account_size=row["account_size"],
            status=row["status"],
            assignment_mode=None,
            assigned_user_id=None,
            assigned_at=None,
            assigned_by_admin_name=None,
        )
        created_rows.append(account)

    db.add_all(created_rows)
    db.commit()

    for row in created_rows:
        db.refresh(row)

    # Auto-assign pending orders and awaiting challenges to newly uploaded ready accounts
    _auto_assign_pending_orders(db)
    _auto_assign_awaiting_challenges(db)

    return {"accounts": [MT5AccountResponse.model_validate(row) for row in created_rows]}


@router.patch("/accounts/{account_id}/status")
def update_mt5_account_status(
    account_id: int,
    payload: MT5AccountStatusUpdateRequest,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> MT5AccountResponse:
    row = db.get(MT5Account, account_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MT5 account not found")

    if row.status in ASSIGNED_STAGES and payload.status != row.status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assigned stage is immutable for this account. Use a new ready account for next stage.",
        )

    if payload.status in ASSIGNED_STAGES:
        if payload.assigned_user_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="assigned_user_id is required when assigning a stage",
            )

        assigned_user = db.get(User, payload.assigned_user_id)
        if assigned_user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found")

        row.assigned_user_id = payload.assigned_user_id
        row.assignment_mode = payload.assignment_mode or "manual"
        if row.assignment_mode == "manual":
            row.assigned_by_admin_name = None
        row.assigned_at = datetime.now(timezone.utc)
    elif payload.status == "Ready":
        if row.status in ASSIGNED_STAGES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Assigned stage cannot be moved back to Ready",
            )
        row.assigned_user_id = None
        row.assignment_mode = None
        row.assigned_by_admin_name = None
        row.assigned_at = None
    else:
        row.assignment_mode = payload.assignment_mode

    row.status = payload.status
    db.add(row)
    db.commit()
    db.refresh(row)

    return MT5AccountResponse.model_validate(row)


@router.post("/accounts/{account_id}/assign")
def assign_ready_mt5_account(
    account_id: int,
    payload: MT5AccountAssignRequest,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> MT5AccountResponse:

    row = db.get(MT5Account, account_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MT5 account not found")

    if row.status != "Ready":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only accounts in Ready state can be assigned",
        )

    assigned_email = payload.assigned_user_email.strip().lower()
    assigned_user = db.scalar(select(User).where(User.email == assigned_email))
    if assigned_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found for provided email")

    challenge: ChallengeAccount | None = None

    # Determine challenge_id to use
    challenge_id = payload.challenge_id.strip() if payload.challenge_id else _generate_challenge_id(db, prefix="MCH")

    # Try to find existing challenge
    challenge = db.scalar(select(ChallengeAccount).where(ChallengeAccount.challenge_id == challenge_id))

    if challenge is None:
        # Challenge doesn't exist, create it
        challenge = ChallengeAccount(
            challenge_id=challenge_id,
            user_id=assigned_user.id,
            account_size=row.account_size,
            current_stage=payload.stage,
            phase1_mt5_account_id=row.id if payload.stage == "Phase 1" else None,
            phase2_mt5_account_id=row.id if payload.stage == "Phase 2" else None,
            funded_mt5_account_id=row.id if payload.stage == "Funded" else None,
            active_mt5_account_id=row.id,
        )
        initialize_challenge_stage_tracking(challenge, account_size=row.account_size)
        db.add(challenge)
        db.flush()

        # Generate certificate for new Funded challenges
        if payload.stage == "Funded":
            try:
                certificate_service = get_certificate_service()
                certificate_service.generate_funding_certificate(
                    user_id=assigned_user.id,
                    challenge_account_id=challenge.challenge_id,
                    account_size=challenge.account_size,
                    db=db
                )
            except Exception as e:
                # Log certificate generation failure but don't fail the assignment
                print(f"Certificate generation failed for user {assigned_user.email}: {e}")
                pass
    else:
        # Challenge exists, verify it belongs to the same user
        if challenge.user_id != assigned_user.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="challenge_id belongs to a different user")

        # Update existing challenge
        challenge.current_stage = payload.stage
        challenge.active_mt5_account_id = row.id
        if payload.stage == "Phase 1":
            challenge.phase1_mt5_account_id = row.id
        elif payload.stage == "Phase 2":
            challenge.phase2_mt5_account_id = row.id
        elif payload.stage == "Funded":
            challenge.funded_mt5_account_id = row.id
            challenge.current_stage = "Funded"  # Update challenge stage to Funded

            # Generate funding certificate for the user
            try:
                certificate_service = get_certificate_service()
                certificate_service.generate_funding_certificate(
                    user_id=assigned_user.id,
                    challenge_account_id=challenge.challenge_id,
                    account_size=challenge.account_size,
                    db=db
                )
            except Exception as e:
                # Log certificate generation failure but don't fail the assignment
                print(f"Certificate generation failed for user {assigned_user.email}: {e}")
                pass

        if payload.stage in {"Phase 1", "Phase 2"}:
            initialize_challenge_stage_tracking(challenge, account_size=row.account_size)
        db.add(challenge)

    # Send appropriate email based on assignment type
    try:
        if payload.stage == "Phase 1":
            # Send welcome email for new Phase 1 assignments
            message = f"""
Welcome to NairaTrader!

Your challenge account has been successfully created.

Challenge ID: {challenge.challenge_id}
Account Size: {row.account_size}
MT5 Server: {row.server}
Account Number: {row.account_number}
Password: {row.password}
Investor Password: {row.investor_password}

Please keep this information secure and do not share it with anyone.
You can now log in to your MT5 platform and start trading.
"""
            send_welcome_email.delay(
                to_email=assigned_user.email,
                message=message.strip(),
            )
        elif payload.stage in {"Phase 2", "Funded"}:
            # Send progression email for Phase 2/Funded assignments
            from app.tasks import send_challenge_objective_email
            stage_name = "Phase 2" if payload.stage == "Phase 2" else "Funded"
            message = (
                f"Congratulations! Your account has been manually progressed to {stage_name}.\n\n"
                f"Your new MT5 trading account details:\n"
                f"• Account Number: {row.account_number}\n"
                f"• Server: {row.server}\n"
                f"• Password: {row.password}\n\n"
                f"You can now log in to your MT5 platform and continue trading."
            )
            send_challenge_objective_email.delay(
                to_email=assigned_user.email,
                subject=f"Challenge Progressed to {stage_name}",
                message=message,
            )
    except Exception as e:
        # Log email failure but don't fail the assignment
        print(f"Email failed for user {assigned_user.email}: {e}")
        pass

    row.status = payload.stage
    row.assignment_mode = "manual"
    row.assigned_user_id = assigned_user.id
    row.assigned_by_admin_name = current_admin.full_name or current_admin.email
    row.assigned_at = datetime.now(timezone.utc)

    db.add(row)
    db.commit()
    db.refresh(row)
    return MT5AccountResponse.model_validate(row)
