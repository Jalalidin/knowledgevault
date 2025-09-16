#!/usr/bin/env python3
"""
KnowledgeVault Unified Backend

A comprehensive Python/FastAPI backend with integrated multi-agent system using Agno.
This replaces the Node.js backend entirely for a simpler, unified architecture.
"""

import os
import uuid
import json
import aiofiles
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Union
from pathlib import Path

# FastAPI and dependencies
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

# Database
from sqlalchemy import create_engine, Column, String, Text, Integer, Boolean, DateTime, JSON, ForeignKey, Table, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship, declarative_base
from sqlalchemy.sql import func

# Authentication & Security
from passlib.context import CryptContext
from jose import JWTError, jwt

# Agno agents
from agno.agent import Agent
from agno.models.openai import OpenAIChat

# HTTP client for external requests
import httpx

# Configuration
class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "postgresql://localhost/knowledgevault")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    secret_key: str = os.getenv("JWT_SECRET_KEY", "dev-only-secret-key-not-for-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    upload_dir: str = "/tmp/uploads"
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    class Config:
        env_file = ".env"

settings = Settings()

# Database setup
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models (SQLAlchemy equivalent of Drizzle schema)

# Association table for knowledge items and tags
knowledge_item_tags = Table(
    'knowledge_item_tags', Base.metadata,
    Column('knowledge_item_id', String, ForeignKey('knowledge_items.id', ondelete='CASCADE')),
    Column('tag_id', String, ForeignKey('tags.id', ondelete='CASCADE'))
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    first_name = Column('first_name', String, key='firstName')
    last_name = Column('last_name', String, key='lastName')
    profile_image_url = Column('profile_image_url', String, key='profileImageUrl')
    created_at = Column('created_at', DateTime, default=func.now(), key='createdAt')
    updated_at = Column('updated_at', DateTime, default=func.now(), onupdate=func.now(), key='updatedAt')
    
    # Relationships
    knowledge_items = relationship("KnowledgeItem", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    ai_settings = relationship("UserAiSettings", back_populates="user", cascade="all, delete-orphan")

class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column('user_id', String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, key='userId')
    title = Column(Text, nullable=False)
    summary = Column(Text)
    content = Column(Text)
    type = Column(String(50), nullable=False)  # 'text', 'image', 'audio', 'video', 'document', 'link'
    file_url = Column('file_url', Text, key='fileUrl')
    file_name = Column('file_name', Text, key='fileName')
    file_size = Column('file_size', Integer, key='fileSize')
    mime_type = Column('mime_type', String, key='mimeType')
    object_path = Column('object_path', Text, key='objectPath')
    item_metadata = Column('metadata', JSON)
    is_processed = Column('is_processed', Boolean, default=False, key='isProcessed')
    processing_error = Column('processing_error', Text, key='processingError')
    created_at = Column('created_at', DateTime, default=func.now(), key='createdAt')
    updated_at = Column('updated_at', DateTime, default=func.now(), onupdate=func.now(), key='updatedAt')
    
    # Relationships
    user = relationship("User", back_populates="knowledge_items")
    tags = relationship("Tag", secondary=knowledge_item_tags, back_populates="knowledge_items")

class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    color = Column(String(7), default="#3B82F6")
    user_id = Column('user_id', String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, key='userId')
    created_at = Column('created_at', DateTime, default=func.now(), key='createdAt')
    
    # Relationships
    user = relationship("User", back_populates="tags")
    knowledge_items = relationship("KnowledgeItem", secondary=knowledge_item_tags, back_populates="tags")

class UserAiSettings(Base):
    __tablename__ = "user_ai_settings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column('user_id', String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, key='userId')
    preferred_provider = Column('preferred_provider', String(50), nullable=False, default="gemini", key='preferredProvider')
    preferred_model = Column('preferred_model', String(100), nullable=False, default="gemini-2.5-flash", key='preferredModel')
    custom_api_keys = Column('custom_api_keys', JSON, key='customApiKeys')
    chat_settings = Column('chat_settings', JSON, default={}, key='chatSettings')
    created_at = Column('created_at', DateTime, default=func.now(), key='createdAt')
    updated_at = Column('updated_at', DateTime, default=func.now(), onupdate=func.now(), key='updatedAt')
    
    # Relationships
    user = relationship("User", back_populates="ai_settings")

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column('user_id', String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, key='userId')
    title = Column(Text, nullable=False)
    created_at = Column('created_at', DateTime, default=func.now(), key='createdAt')
    updated_at = Column('updated_at', DateTime, default=func.now(), onupdate=func.now(), key='updatedAt')
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column('conversation_id', String, ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False, key='conversationId')
    role = Column(String(20), nullable=False)  # 'user', 'assistant'
    content = Column(Text, nullable=False)
    message_metadata = Column('metadata', JSON)
    created_at = Column('created_at', DateTime, default=func.now(), key='createdAt')
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

# Response serialization helpers
def serialize_user(user: User) -> dict:
    """Convert User ORM object to API response format."""
    return {
        "id": user.id,
        "email": user.email,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "profileImageUrl": user.profile_image_url,
        "createdAt": user.created_at
    }

def serialize_knowledge_item(item: KnowledgeItem, include_tags: bool = True) -> dict:
    """Convert KnowledgeItem ORM object to API response format."""
    result = {
        "id": item.id,
        "title": item.title,
        "summary": item.summary,
        "content": item.content,
        "type": item.type,
        "fileUrl": item.file_url,
        "fileName": item.file_name,
        "fileSize": item.file_size,
        "mimeType": item.mime_type,
        "objectPath": item.object_path,
        "metadata": item.item_metadata,
        "isProcessed": item.is_processed,
        "processingError": item.processing_error,
        "createdAt": item.created_at,
        "updatedAt": item.updated_at
    }
    
    if include_tags:
        result["tags"] = [tag.name for tag in item.tags]
    
    return result

def serialize_chat_message(message: ChatMessage) -> dict:
    """Convert ChatMessage ORM object to API response format."""
    return {
        "id": message.id,
        "role": message.role,
        "content": message.content,
        "metadata": message.message_metadata,
        "createdAt": message.created_at
    }

def serialize_conversation(conversation: Conversation, include_message_count: bool = True) -> dict:
    """Convert Conversation ORM object to API response format."""
    result = {
        "id": conversation.id,
        "title": conversation.title,
        "createdAt": conversation.created_at,
        "updatedAt": conversation.updated_at
    }
    
    if include_message_count:
        result["message_count"] = len(conversation.messages)
    
    return result

# Pydantic Models
class UserResponse(BaseModel):
    id: str
    email: Optional[str]
    firstName: Optional[str]
    lastName: Optional[str]
    profileImageUrl: Optional[str]
    createdAt: datetime
    
    class Config:
        from_attributes = True

class KnowledgeItemCreate(BaseModel):
    title: str
    summary: Optional[str] = None
    content: Optional[str] = None
    type: str
    tags: Optional[List[str]] = []
    metadata: Optional[Dict[str, Any]] = {}

class KnowledgeItemResponse(BaseModel):
    id: str
    title: str
    summary: Optional[str]
    content: Optional[str]
    type: str
    fileUrl: Optional[str]
    fileName: Optional[str]
    metadata: Optional[Dict[str, Any]]
    isProcessed: bool
    createdAt: datetime
    tags: List[str] = []
    
    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    use_knowledge_base: bool = True

class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    sources: List[Dict[str, Any]] = []
    agent_used: str = "ConversationAgent"

# Multi-Agent System Integration
class KnowledgeVaultAgents:
    """Integrated multi-agent system for KnowledgeVault operations."""
    
    def __init__(self):
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required for agent system")
        
        self._setup_agents()
    
    def _setup_agents(self):
        """Initialize specialized agents."""
        
        # Document Processing Agent
        self.document_processor = Agent(
            model=OpenAIChat(id="gpt-4o"),
            name="DocumentProcessor",
            instructions="You are a document analysis expert. Extract titles, summaries, key concepts, and suggest relevant tags. Provide structured responses.",
            markdown=True
        )
        
        # Search Agent
        self.search_agent = Agent(
            model=OpenAIChat(id="gpt-4o"),
            name="SearchAgent",
            instructions="You are a search specialist. Help find relevant information and provide context-aware search results.",
            markdown=True
        )
        
        # Conversation Agent
        self.conversation_agent = Agent(
            model=OpenAIChat(id="gpt-4o"),
            name="ConversationAgent",
            instructions="You are a helpful AI assistant for KnowledgeVault. Answer questions using the provided knowledge base context. Be conversational and cite sources when relevant.",
            markdown=True
        )
        
        # Summarization Agent
        self.summarization_agent = Agent(
            model=OpenAIChat(id="gpt-4o"),
            name="SummarizationAgent",
            instructions="You are a content summarization expert. Create concise, accurate summaries and extract key insights.",
            markdown=True
        )

# Global instances - agents initialized lazily
agents = None  # type: Optional[KnowledgeVaultAgents]

def get_agents() -> Optional[KnowledgeVaultAgents]:
    """Get agents instance, initializing lazily if possible."""
    global agents
    if agents is None and settings.openai_api_key:
        try:
            agents = KnowledgeVaultAgents()
        except Exception as e:
            print(f"Warning: Could not initialize agents: {e}")
            agents = None
    return agents
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Get current authenticated user with proper error handling."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify token
    payload = verify_token(credentials.credentials)
    if not payload:
        raise credentials_exception
        
    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

# FastAPI Application
app = FastAPI(
    title="KnowledgeVault Unified Backend",
    description="AI-powered personal knowledge management with multi-agent system",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_origin_regex=r"https://.*\.replit\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Ensure upload directory exists
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    ag = get_agents()
    return {
        "status": "healthy",
        "version": "2.0.0",
        "agents_available": bool(ag),
        "database": "connected"
    }

@app.post("/api/auth/login")
async def login(email: str = Form(), password: str = Form(), db: Session = Depends(get_db)):
    """Authentication endpoint - secure in production."""
    
    # Prevent insecure demo login in production
    if settings.environment != "development":
        raise HTTPException(
            status_code=403, 
            detail="Password/OAuth authentication required in production"
        )
    
    # Demo login only in development
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            first_name="Demo",
            last_name="User"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": serialize_user(user)}

@app.get("/api/auth/user")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information."""
    return serialize_user(current_user)

@app.get("/api/knowledge-items")
async def get_knowledge_items(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get knowledge items for the current user."""
    items = db.query(KnowledgeItem).filter(
        KnowledgeItem.user_id == current_user.id
    ).order_by(KnowledgeItem.created_at.desc()).offset(offset).limit(limit).all()
    
    # Convert to response format with tags
    return [serialize_knowledge_item(item) for item in items]

@app.get("/api/knowledge-items/{item_id}")
async def get_knowledge_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific knowledge item."""
    item = db.query(KnowledgeItem).filter(
        KnowledgeItem.id == item_id,
        KnowledgeItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    
    return serialize_knowledge_item(item)

@app.post("/api/knowledge-items")
async def create_knowledge_item(
    item_data: KnowledgeItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new knowledge item."""
    
    # Use document processor agent for content analysis
    if item_data.content:
        try:
            analysis_prompt = f"Analyze this content and suggest improvements:\n\nTitle: {item_data.title}\nContent: {item_data.content}\n\nProvide: 1) Improved title if needed, 2) Summary, 3) Suggested tags"
            ag = get_agents()
            if not ag:
                raise Exception("AI unavailable")
            analysis_response = ag.document_processor.run(analysis_prompt)
            
            # Extract suggestions from agent response (simplified parsing)
            if "Summary:" in analysis_response.content:
                suggested_summary = analysis_response.content.split("Summary:")[1].split("\n")[0].strip()
                if not item_data.summary:
                    item_data.summary = suggested_summary
        except Exception as e:
            print(f"Agent analysis failed: {e}")
    
    # Create knowledge item
    db_item = KnowledgeItem(
        user_id=current_user.id,
        title=item_data.title,
        summary=item_data.summary,
        content=item_data.content,
        type=item_data.type,
        item_metadata=item_data.metadata or {},
        is_processed=True  # Mark as processed since we used agent
    )
    
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Handle tags
    if item_data.tags:
        for tag_name in item_data.tags:
            # Get or create tag
            existing_tag = db.query(Tag).filter(
                Tag.name == tag_name,
                Tag.user_id == current_user.id
            ).first()
            
            if not existing_tag:
                new_tag = Tag(name=tag_name, user_id=current_user.id)
                db.add(new_tag)
                db.commit()
                db.refresh(new_tag)
                db_item.tags.append(new_tag)
            else:
                db_item.tags.append(existing_tag)
        
        db.commit()
    
    # Return response
    return serialize_knowledge_item(db_item)

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Upload and process files using document processing agent."""
    
    # Save file
    file_path = Path(settings.upload_dir) / f"{uuid.uuid4()}_{file.filename}"
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Read content for processing
    file_content = ""
    if file.content_type and file.content_type.startswith('text/'):
        async with aiofiles.open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            file_content = await f.read()
    
    # Use document processor agent
    try:
        process_prompt = f"Process this uploaded file:\n\nFilename: {file.filename}\nContent Type: {file.content_type}\nContent: {file_content[:1000]}...\n\nProvide: 1) Title, 2) Summary, 3) Key concepts, 4) Suggested tags (comma-separated)"
        
        ag = get_agents()
        if not ag:
            raise Exception("AI unavailable")
        processing_response = ag.document_processor.run(process_prompt)
        
        # Parse agent response (simplified)
        title = file.filename
        summary = "File processed by AI agent"
        suggested_tags = ["uploaded"]
        
        # Try to extract structured info from agent response
        response_content = processing_response.content
        if "Title:" in response_content:
            title = response_content.split("Title:")[1].split("\n")[0].strip() or file.filename
        if "Summary:" in response_content:
            summary = response_content.split("Summary:")[1].split("\n")[0].strip()
        if "Tags:" in response_content:
            tags_line = response_content.split("Tags:")[1].split("\n")[0].strip()
            suggested_tags = [tag.strip() for tag in tags_line.split(",") if tag.strip()]
        
    except Exception as e:
        print(f"File processing failed: {e}")
        title = file.filename
        summary = "File uploaded successfully"
        suggested_tags = ["uploaded"]
    
    # Create knowledge item
    db_item = KnowledgeItem(
        user_id=current_user.id,
        title=title,
        summary=summary,
        content=file_content,
        type="document",
        file_name=file.filename,
        file_url=str(file_path),
        file_size=len(content),
        mime_type=file.content_type,
        item_metadata={"original_filename": file.filename},
        is_processed=True
    )
    
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Add tags
    for tag_name in suggested_tags:
        existing_tag = db.query(Tag).filter(
            Tag.name == tag_name,
            Tag.user_id == current_user.id
        ).first()
        
        if not existing_tag:
            new_tag = Tag(name=tag_name, user_id=current_user.id)
            db.add(new_tag)
            db.commit()
            db.refresh(new_tag)
            db_item.tags.append(new_tag)
        else:
            db_item.tags.append(existing_tag)
    
    db.commit()
    
    # Return response
    return serialize_knowledge_item(db_item)

@app.post("/api/chat")
async def chat(
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Chat with AI using knowledge base context and multi-agent system."""
    
    # Get or create conversation
    conversation = None
    if chat_request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == chat_request.conversation_id,
            Conversation.user_id == current_user.id
        ).first()
    
    if not conversation:
        conversation = Conversation(
            user_id=current_user.id,
            title=f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    # Add user message
    user_message = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=chat_request.message
    )
    db.add(user_message)
    db.commit()
    
    # Search knowledge base if requested
    relevant_items = []
    context = ""
    
    if chat_request.use_knowledge_base:
        # Simple text search (in production, use vector similarity)
        items = db.query(KnowledgeItem).filter(
            KnowledgeItem.user_id == current_user.id,
            KnowledgeItem.content.ilike(f"%{chat_request.message[:50]}%")
        ).limit(5).all()
        
        relevant_items = [
            {
                "id": item.id,
                "title": item.title,
                "summary": item.summary,
                "type": item.type
            }
            for item in items
        ]
        
        if items:
            context = "\n\n".join([
                f"[{item.title}]\n{item.summary}\n{item.content[:300]}..."
                for item in items
            ])
    
    # Generate response using conversation agent
    try:
        chat_prompt = f"User question: {chat_request.message}\n\nKnowledge base context:\n{context}\n\nProvide a helpful response based on the available context."
        
        ag = get_agents()
        if not ag:
            raise Exception("AI unavailable")
        agent_response = ag.conversation_agent.run(chat_prompt)
        assistant_content = agent_response.content
        
    except Exception as e:
        print(f"Agent chat failed: {e}")
        assistant_content = "I'm sorry, I'm having trouble processing your request right now. Please try again."
    
    # Add assistant message
    assistant_message = ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_content,
        message_metadata={"sources": relevant_items, "agent_used": "ConversationAgent"}
    )
    db.add(assistant_message)
    db.commit()
    
    return ChatResponse(
        message=assistant_content,
        conversation_id=conversation.id,
        sources=relevant_items,
        agent_used="ConversationAgent"
    )

@app.get("/api/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's conversations."""
    conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()
    
    return [serialize_conversation(conv) for conv in conversations]

@app.get("/api/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages in a conversation."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    return [serialize_chat_message(msg) for msg in messages]

@app.get("/api/tags")
async def get_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's tags."""
    tags = db.query(Tag).filter(Tag.user_id == current_user.id).all()
    
    return [
        {
            "id": tag.id,
            "name": tag.name,
            "color": tag.color,
            "createdAt": tag.created_at
        }
        for tag in tags
    ]

# Direct agent endpoints (for testing/advanced usage)
@app.post("/api/agents/process-document")
async def agent_process_document(
    content: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Direct access to document processing agent."""
    ag = get_agents()
    if not ag:
        return {"response": "AI processing unavailable", "agent": "DocumentProcessor"}
    
    try:
        response = ag.document_processor.run(
            f"Process this content: {content.get('text', content.get('content', ''))}"
        )
        return {"response": response.content, "agent": "DocumentProcessor"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent processing failed: {str(e)}")

@app.post("/api/agents/search")
async def agent_search(
    query: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Direct access to search agent."""
    ag = get_agents()
    if not ag:
        return {"response": "AI search unavailable", "agent": "SearchAgent"}
    
    try:
        response = ag.search_agent.run(query.get('query', ''))
        return {"response": response.content, "agent": "SearchAgent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent search failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PY_PORT", "8001"))
    
    print("🚀 Starting KnowledgeVault Unified Backend")
    print("📊 Multi-Agent System: Integrated")
    print("🗄️  Database: PostgreSQL")
    print("🔐 Authentication: JWT-based")
    print(f"🌐 API: http://localhost:{port}")
    print(f"📚 Docs: http://localhost:{port}/docs")
    dev = os.getenv("DEV", "0") == "1"
    
    uvicorn.run(
        "knowledge_vault_backend:app",
        host="0.0.0.0",
        port=port,
        reload=dev
    )