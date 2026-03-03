from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
import uuid
from datetime import datetime

from app.db.deps import get_db
from app.core.auth import get_current_admin_allowlisted
from app.models.user import User
from app.models.support import SupportChat, SupportMessage, ChatStatus, MessageSender, Priority
from app.schemas.support import (
    SupportChat as SupportChatSchema,
    SupportChatSummary,
    SupportMessage as SupportMessageSchema,
    SupportMessageCreate
)
from app.api.admin_workboard_routes import log_admin_activity

router = APIRouter(prefix="/admin/support", tags=["Admin Support"])

class AdminSupportChatSummary(SupportChatSummary):
    assigned_to: str | None
    user_name: str
    user_email: str
    user_unread_count: int

    class Config:
        from_attributes = True

@router.get("/chats", response_model=List[AdminSupportChatSummary])
async def get_all_support_chats(
    status: str = None,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db)
):
    """Get all support chats for admin view"""
    query = db.query(SupportChat).options(
        joinedload(SupportChat.user),
        joinedload(SupportChat.messages)
    )

    # Filter by status if provided
    if status:
        if status == "closed":
            query = query.filter(SupportChat.status == ChatStatus.closed)
        elif status == "open":
            query = query.filter(SupportChat.status == ChatStatus.open)

    chats = query.order_by(SupportChat.updated_at.desc()).all()

    result = []
    for chat in chats:
        user_name = chat.user.nick_name or chat.user.full_name or chat.user.email
        user_email = chat.user.email

        # Calculate unread counts
        unread_count = sum(1 for msg in chat.messages if msg.sender == MessageSender.support and not msg.is_read)
        user_unread_count = sum(1 for msg in chat.messages if msg.sender == MessageSender.user and not msg.is_read)

        last_message = chat.messages[-1].message if chat.messages else ""

        result.append(AdminSupportChatSummary(
            id=chat.id,
            subject=chat.subject,
            status=chat.status,
            priority=chat.priority,
            assigned_to=chat.assigned_to,
            user_name=user_name,
            user_email=user_email,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            last_message=last_message,
            unread_count=unread_count,
            user_unread_count=user_unread_count
        ))

    return result

@router.get("/chats/{chat_id}", response_model=SupportChatSchema)
async def get_chat(
    chat_id: str,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db)
):
    """Get a specific chat with all messages for admin"""
    chat = db.query(SupportChat).options(
        joinedload(SupportChat.messages)
    ).filter(SupportChat.id == chat_id).first()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    return chat

@router.post("/chats/{chat_id}/assign")
async def assign_chat(
    chat_id: str,
    payload: dict,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db)
):
    admin_name = payload.get("admin_name")
    """Assign a chat to an admin"""
    chat = db.query(SupportChat).filter(SupportChat.id == chat_id).first()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    chat.assigned_to = admin_name
    chat.updated_at = datetime.utcnow()

    db.commit()

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="assign_chat",
        description=f"Assigned chat {chat_id} to {admin_name}",
        entity_type="support_chat",
        extra_data=chat_id,
    )

    return {"message": f"Chat assigned to {admin_name}"}

@router.post("/chats/{chat_id}/messages", response_model=SupportMessageSchema)
async def send_support_message(
    chat_id: str,
    payload: dict,
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db)
):
    """Send a message as support"""
    message = payload.get("message")
    admin_name = payload.get("admin_name")

    chat = db.query(SupportChat).filter(SupportChat.id == chat_id).first()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if chat.status == ChatStatus.closed:
        raise HTTPException(status_code=400, detail="Cannot send messages to closed chats")

    # Assign the chat to this admin if not already assigned
    if not chat.assigned_to:
        chat.assigned_to = admin_name

    # Create the message
    message_obj = SupportMessage(
        id=str(uuid.uuid4()),
        chat_id=chat_id,
        sender=MessageSender.support,
        message=message,
        image_url=payload.get("image_url"),
        is_read=False  # Support messages start as unread for user
    )
    db.add(message_obj)

    # Update chat's updated_at timestamp
    chat.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(message_obj)

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="send_support_message",
        description=f"Sent support message in chat {chat_id}",
        entity_type="support_chat",
        extra_data=chat_id,
    )

    return message_obj

@router.post("/chats/{chat_id}/close")
async def close_chat(
    chat_id: str,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db)
):
    """Close a support chat"""
    chat = db.query(SupportChat).filter(SupportChat.id == chat_id).first()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    chat.status = ChatStatus.closed
    chat.updated_at = datetime.utcnow()

    db.commit()

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="close_chat",
        description=f"Closed support chat {chat_id}",
        entity_type="support_chat",
        extra_data=chat_id,
    )

    return {"message": "Chat closed"}

@router.post("/chats/{chat_id}/read")
async def mark_user_messages_as_read(
    chat_id: str,
    _: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db)
):
    """Mark all user messages in a chat as read (for admin view)"""
    chat = db.query(SupportChat).filter(SupportChat.id == chat_id).first()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Mark all user messages as read
    db.query(SupportMessage).filter(
        SupportMessage.chat_id == chat_id,
        SupportMessage.sender == MessageSender.user,
        SupportMessage.is_read == False
    ).update({"is_read": True})

    db.commit()

    log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        admin_name=current_admin.full_name or current_admin.email,
        action="mark_chat_read",
        description=f"Marked user messages as read in chat {chat_id}",
        entity_type="support_chat",
        extra_data=chat_id,
    )

    return {"message": "User messages marked as read"}
