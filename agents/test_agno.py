#!/usr/bin/env python3
"""
Test Agno API to understand correct syntax
"""

try:
    from agno.agent import Agent
    from agno.models.openai import OpenAIChat
    print("✅ Basic imports successful")
except Exception as e:
    print(f"❌ Import error: {e}")

try:
    # Test basic agent creation
    agent = Agent(
        model=OpenAIChat(id="gpt-4o"),
        name="TestAgent"
    )
    print("✅ Basic agent creation successful")
    print(f"Agent: {agent}")
except Exception as e:
    print(f"❌ Agent creation error: {e}")

try:
    # Test agent with instructions
    agent = Agent(
        model=OpenAIChat(id="gpt-4o"),
        instructions="You are a helpful assistant"
    )
    print("✅ Agent with instructions successful")
except Exception as e:
    print(f"❌ Agent with instructions error: {e}")

# Test what parameters are available
print("\nAgent class signature:")
try:
    import inspect
    sig = inspect.signature(Agent.__init__)
    print(f"Parameters: {list(sig.parameters.keys())}")
except Exception as e:
    print(f"❌ Signature inspection error: {e}")