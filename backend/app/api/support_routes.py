from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime
import boto3
from botocore.exceptions import ClientError

from app.db.deps import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.support import SupportChat, SupportMessage, ChatStatus, MessageSender, Priority
from app.schemas.support import (
    SupportChat as SupportChatSchema,
    SupportChatCreate,
    SupportChatSummary,
    SupportMessage as SupportMessageSchema,
    SupportMessageCreate
)

router = APIRouter(prefix="/support")

@router.get("/chats", response_model=List[SupportChatSummary])
async def get_user_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all support chats for the current user"""
    chats = db.query(SupportChat).filter(
        SupportChat.user_id == current_user.id
    ).order_by(SupportChat.updated_at.desc()).all()

    # Calculate unread counts and last messages
    result = []
    for chat in chats:
        unread_count = sum(
            1 for msg in chat.messages
            if msg.sender == MessageSender.support and not msg.is_read
        )
        last_message = chat.messages[-1].message if chat.messages else ""

        result.append(SupportChatSummary(
            id=chat.id,
            subject=chat.subject,
            status=chat.status,
            priority=chat.priority,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            last_message=last_message,
            unread_count=unread_count
        ))

    return result

@router.get("/chats/{chat_id}", response_model=SupportChatSchema)
async def get_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific chat with all messages"""
    chat = db.query(SupportChat).filter(
        SupportChat.id == chat_id,
        SupportChat.user_id == current_user.id
    ).first()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    return chat

@router.post("/chats", response_model=SupportChatSchema)
async def create_chat(
    chat_data: SupportChatCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new support chat"""
    try:
        chat_id = str(uuid.uuid4())

        # Create the chat
        chat = SupportChat(
            id=chat_id,
            user_id=current_user.id,
            subject=chat_data.subject,
            status=ChatStatus.open,
            priority=Priority.medium
        )
        db.add(chat)
        db.flush()  # Get the chat ID

        # Create the initial message
        message = SupportMessage(
            id=str(uuid.uuid4()),
            chat_id=chat_id,
            sender=MessageSender.user,
            message=chat_data.message,
            is_read=False  # Unread for admin until marked
        )
        db.add(message)

        db.commit()
        db.refresh(chat)

        return chat
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create chat: {str(e)}")

@router.post("/chats/{chat_id}/messages", response_model=SupportMessageSchema)
async def send_message(
    chat_id: str,
    message_data: SupportMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message in a chat"""
    chat = db.query(SupportChat).filter(
        SupportChat.id == chat_id,
        SupportChat.user_id == current_user.id
    ).first()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if chat.status == ChatStatus.closed:
        raise HTTPException(status_code=400, detail="Cannot send messages to closed chats")

    # Create the message
    message = SupportMessage(
        id=str(uuid.uuid4()),
        chat_id=chat_id,
        sender=MessageSender.user,
        message=message_data.message,
        is_read=False  # Unread for admin until marked
    )
    db.add(message)

    # Update chat's updated_at timestamp
    chat.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(message)

    return message

@router.post("/chats/{chat_id}/messages-with-image")
async def send_message_with_image(
    chat_id: str,
    message: str = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message with optional image in a chat"""
    chat = db.query(SupportChat).filter(
        SupportChat.id == chat_id,
        SupportChat.user_id == current_user.id
    ).first()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if chat.status == ChatStatus.closed:
        raise HTTPException(status_code=400, detail="Cannot send messages to closed chats")

    image_url = None
    if image:
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if image.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed.")

        # Validate file size (max 5MB)
        file_size = 0
        content = await image.read()
        file_size = len(content)

        if file_size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(status_code=400, detail="Image too large. Maximum size is 5MB.")

        try:
            # Upload to Cloudflare R2
            image_url = await _upload_image_to_r2(content, chat_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

    # Create the message
    message_obj = SupportMessage(
        id=str(uuid.uuid4()),
        chat_id=chat_id,
        sender=MessageSender.user,
        message=message,
        image_url=image_url,
        is_read=False  # Unread for admin until marked
    )
    db.add(message_obj)

    # Update chat's updated_at timestamp
    chat.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(message_obj)

    return message_obj

@router.post("/chats/{chat_id}/read")
async def mark_chat_as_read(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all messages in a chat as read"""
    chat = db.query(SupportChat).filter(
        SupportChat.id == chat_id,
        SupportChat.user_id == current_user.id
    ).first()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Mark all support messages as read
    db.query(SupportMessage).filter(
        SupportMessage.chat_id == chat_id,
        SupportMessage.sender == MessageSender.support,
        SupportMessage.is_read == False
    ).update({"is_read": True})

    db.commit()

    return {"message": "Chat marked as read"}


async def _upload_image_to_r2(file_content: bytes, chat_id: str) -> str:
    """Upload image to Cloudflare R2 and return public URL"""
    try:
        # Create S3 client for Cloudflare R2
        s3_client = boto3.client(
            's3',
            endpoint_url=settings.cloudflare_r2_endpoint_url,
            aws_access_key_id=settings.cloudflare_r2_access_key_id,
            aws_secret_access_key=settings.cloudflare_r2_secret_access_key,
            region_name='auto'  # Cloudflare R2 uses 'auto' region
        )

        # Generate unique file key
        file_key = f"support_images/{chat_id}/{uuid.uuid4()}.png"

        # Upload the file
        s3_client.put_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            Key=file_key,
            Body=file_content,
            ContentType='image/png',
            ACL='public-read'  # Make the file publicly accessible
        )

        # Return the public URL
        public_url = f"{settings.cloudflare_r2_public_url}/{file_key}"
        print(f"Successfully uploaded support image to R2: {public_url}")
        return public_url

    except ClientError as e:
        print(f"Error uploading to R2: {e}")
        raise Exception(f"Failed to upload image: {str(e)}")
    except Exception as e:
        print(f"Unexpected error uploading to R2: {e}")
        raise Exception(f"Failed to upload image: {str(e)}")
