# KnowledgeVault Multi-Agent System

High-performance multi-agent system built with [Agno framework](https://docs.agno.com/) for KnowledgeVault's AI-powered knowledge management capabilities.

## Architecture Overview

### Specialized Agents

1. **DocumentProcessor Agent**
   - File analysis and content extraction
   - Metadata generation and categorization
   - Content quality assessment
   - Relationship detection

2. **SearchRetrieval Agent**
   - Semantic search and ranking
   - Query optimization and expansion
   - Knowledge base retrieval
   - Contextual result filtering

3. **Summarization Agent**
   - Content analysis and summarization
   - Key insight extraction
   - Multi-format summary generation
   - Technical abstract creation

4. **ConversationAgent (Orchestrator)**
   - Chat interaction management
   - Agent coordination and routing
   - Context maintenance
   - Response generation

### Team Coordination

The agents work together as a coordinated team using Agno's Team system:
- **Coordinate Mode**: Agents collaborate on complex tasks
- **Sequential Mode**: Agents work in defined order
- **Parallel Mode**: Agents work simultaneously on different aspects

### Deterministic Workflows

Three main workflows handle complex multi-step processes:

1. **DocumentProcessingWorkflow**
   - Content analysis → Metadata generation → Storage optimization
   
2. **SearchWorkflow** 
   - Query analysis → Multi-strategy search → Result ranking
   
3. **ConversationWorkflow**
   - Context analysis → Intent classification → Response generation

## Performance Benefits

Built with Agno framework for:
- **~10,000x faster** agent instantiation vs traditional frameworks
- **~50x less memory** usage
- **Native multimodal** support (text, images, audio, video)
- **Pure Python** - no complex orchestration overhead

## API Endpoints

### Core Agent Endpoints

- `POST /chat` - Conversational interactions with agent orchestration
- `POST /process-document` - Document analysis and processing
- `POST /search` - Semantic search across knowledge base
- `POST /summarize` - Content analysis and summarization
- `POST /team-process` - Complex multi-agent coordination tasks

### System Endpoints

- `GET /health` - System health and agent status
- `GET /agents` - Available agents and capabilities

## Quick Start

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set Environment Variables**
   ```bash
   export OPENAI_API_KEY="your-openai-key"
   export DATABASE_URL="postgresql://..."
   ```

3. **Run Agent System**
   ```bash
   python main.py
   ```

The system will start on `http://localhost:8001` with full API documentation at `/docs`.

## Integration with KnowledgeVault

The agent system runs as a separate Python service alongside the main Node.js application:

- **Node.js App**: `http://localhost:5000` (Frontend + API)
- **Agent System**: `http://localhost:8001` (Multi-Agent AI)

The Node.js application makes HTTP requests to the agent system for AI operations.

## Configuration

### Model Selection

Agents use OpenAI GPT-4o by default but can be configured for:
- OpenAI (GPT-4, GPT-4o, GPT-3.5)
- Anthropic (Claude 3, Claude 3.5)
- Groq (Llama models)
- Any OpenAI-compatible API

### Memory & Storage

- **PostgreSQL**: Persistent agent memory and session storage
- **Vector Database**: Optional for enhanced semantic search
- **Cache**: In-memory caching for performance optimization

### Observability

- Built-in request/response logging
- Agent performance metrics
- Workflow execution tracing
- Error monitoring and alerting

## Development

### Adding New Agents

1. Create agent in `main.py`:
   ```python
   new_agent = Agent(
       name="NewAgent",
       model=OpenAIChat(id="gpt-4o"),
       instructions="Agent instructions...",
       memory=AgentMemory(storage=self.storage),
       tools=[...],  # Optional tools
   )
   ```

2. Add to team coordination
3. Create API endpoint for agent-specific operations

### Creating Custom Workflows

1. Extend `Workflow` class in `workflows.py`
2. Define deterministic steps with `yield RunResponse(...)`
3. Add workflow to factory for easy access

### Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=agents

# Run specific test file
pytest test_agents.py
```

## Production Deployment

### AgentOS Runtime

For production, deploy using Agno's AgentOS runtime:
- Pre-built FastAPI application
- Built-in monitoring and control plane
- Secure cloud deployment
- Direct browser connection to agents

### Scaling Considerations

- Deploy multiple agent instances for load balancing
- Use Redis for shared session state
- Configure horizontal pod autoscaling
- Monitor memory and CPU usage per agent

## Security

- All agent communications use HTTPS
- API key management via environment variables
- Database connections use SSL
- No external data transmission (agents run in your cloud)
- Session-based memory isolation

## Monitoring

- Agent response times and success rates
- Memory usage per agent and workflow
- Database connection health
- Model API usage and costs
- User interaction patterns

## Support

For issues or questions:
- Check [Agno Documentation](https://docs.agno.com/)
- Review agent logs for debugging
- Monitor system metrics for performance issues
- Contact development team for custom agent requirements