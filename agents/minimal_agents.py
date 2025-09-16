#!/usr/bin/env python3
"""
KnowledgeVault Multi-Agent System - Minimal Implementation

This is a minimal working implementation to test the Agno framework integration.
"""

import os
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agno.agent import Agent
from agno.models.openai import OpenAIChat

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

# Pydantic Models
class ChatMessage(BaseModel):
    content: str
    session_id: Optional[str] = None

class AgentResponse(BaseModel):
    content: str
    agent: str
    metadata: Optional[Dict[str, Any]] = {}

class MinimalAgentSystem:
    """Minimal multi-agent system for testing Agno integration."""
    
    def __init__(self):
        self._setup_agents()
        self.app = self._setup_fastapi()
    
    def _setup_agents(self):
        """Initialize minimal agents for testing."""
        
        # Document Processing Agent
        self.document_processor = Agent(
            model=OpenAIChat(id="gpt-4o"),
            name="DocumentProcessor",
            instructions="You are a document analysis expert. Analyze documents and provide summaries, key insights, and metadata.",
            markdown=True
        )
        
        # Search Agent (without external tools for now)
        self.search_agent = Agent(
            model=OpenAIChat(id="gpt-4o"),
            name="SearchAgent",
            instructions="You are a search specialist. Help users find information and provide relevant results with explanations.",
            markdown=True
        )
        
        # Conversation Agent
        self.conversation_agent = Agent(
            model=OpenAIChat(id="gpt-4o"),
            name="ConversationAgent", 
            instructions="You are a helpful conversation assistant for KnowledgeVault. Provide clear, informative responses to user questions.",
            markdown=True
        )
    
    def _setup_fastapi(self):
        """Setup minimal FastAPI application."""
        
        app = FastAPI(
            title="KnowledgeVault Minimal Agent System",
            description="Minimal multi-agent system for testing Agno integration",
            version="1.0.0"
        )
        
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        @app.get("/health")
        async def health_check():
            return {
                "status": "healthy",
                "agents": ["DocumentProcessor", "SearchAgent", "ConversationAgent"],
                "version": "1.0.0"
            }
        
        @app.post("/chat", response_model=AgentResponse)
        async def chat(message: ChatMessage):
            """Basic chat endpoint."""
            try:
                response = self.conversation_agent.run(message.content)
                
                return AgentResponse(
                    content=response.content,
                    agent="ConversationAgent",
                    metadata={"session_id": message.session_id}
                )
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
        
        @app.post("/process-document", response_model=AgentResponse)
        async def process_document(content: Dict[str, Any]):
            """Basic document processing endpoint."""
            try:
                prompt = f"Analyze this document: {content.get('text', content.get('content', ''))}"
                response = self.document_processor.run(prompt)
                
                return AgentResponse(
                    content=response.content,
                    agent="DocumentProcessor",
                    metadata={"processed": True}
                )
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")
        
        @app.post("/search", response_model=AgentResponse)
        async def search(query: Dict[str, Any]):
            """Basic search endpoint."""
            try:
                prompt = f"Help search for: {query.get('query', '')}"
                response = self.search_agent.run(prompt)
                
                return AgentResponse(
                    content=response.content,
                    agent="SearchAgent",
                    metadata={"query": query.get('query', '')}
                )
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
        
        return app

# Initialize system
agent_system = MinimalAgentSystem()
app = agent_system.app

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting KnowledgeVault Minimal Agent System")
    print("📊 Agents: DocumentProcessor, SearchAgent, ConversationAgent")
    print("🔗 Framework: Agno 2.0")
    print("🌐 API: http://localhost:8001")
    
    uvicorn.run(
        "minimal_agents:app",
        host="0.0.0.0",
        port=8001,
        reload=False
    )