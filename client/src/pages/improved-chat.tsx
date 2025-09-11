import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { 
  Trash2, 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  ExternalLink, 
  Plus, 
  Loader2, 
  Copy, 
  RotateCcw, 
  StopCircle,
  FileText,
  Image,
  Link,
  Sparkles,
  Settings,
  ChevronDown
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    sources?: Array<{ id: string; title: string; type: string }>;
    model?: string;
    provider?: string;
  };
  createdAt: string;
  isStreaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationWithMessages extends Conversation {
  messages: ChatMessage[];
}

interface KnowledgeItem {
  id: string;
  title: string;
  type: string;
  summary?: string;
  isProcessed: boolean;
}

export default function ImprovedChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingSources, setStreamingSources] = useState<Array<{ id: string; title: string; type: string }>>([]);
  const [contextItems, setContextItems] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [selectedProvider, setSelectedProvider] = useState("gemini");
  const [temperature, setTemperature] = useState(0.7);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedKnowledgeItems, setSelectedKnowledgeItems] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Handle URL context parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const context = urlParams.get('context');
    if (context) {
      const itemIds = context.split(',').filter(id => id.trim());
      setSelectedKnowledgeItems(itemIds);
      setContextItems(itemIds);
      
      // If we have context items, create a new conversation
      if (itemIds.length > 0) {
        createConversationMutation.mutate({
          title: `Chat about ${itemIds.length} item${itemIds.length > 1 ? 's' : ''}`
        });
      }
      
      // Clear URL parameters after processing
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: () => apiRequest("GET", "/api/conversations").then((res: Response) => res.json()),
  });

  // Fetch current conversation
  const { data: currentConversation, isLoading: conversationLoading } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/conversations", selectedConversationId],
    queryFn: () => apiRequest("GET", `/api/conversations/${selectedConversationId}`).then((res: Response) => res.json()),
    enabled: !!selectedConversationId,
  });

  // Fetch knowledge items for context selection
  const { data: knowledgeItems = [], isLoading: knowledgeLoading } = useQuery<KnowledgeItem[]>({
    queryKey: ["/api/knowledge-items"],
    queryFn: () => apiRequest("GET", "/api/knowledge-items").then((res: Response) => res.json()),
  });

  // Fetch AI models
  const { data: aiModels } = useQuery({
    queryKey: ["/api/ai-models"],
    queryFn: () => apiRequest("GET", "/api/ai-models").then((res: Response) => res.json()),
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: (title: string) => 
      apiRequest("POST", "/api/conversations", { title }).then((res: Response) => res.json()),
    onSuccess: (conversation: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(conversation.id);
      setNewConversationTitle("");
      toast({ title: "New conversation created" });
    },
    onError: () => {
      toast({ title: "Failed to create conversation", variant: "destructive" });
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) =>
      apiRequest("DELETE", `/api/conversations/${conversationId}`).then((res: Response) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (selectedConversationId === deleteConversationMutation.variables) {
        setSelectedConversationId(null);
      }
      toast({ title: "Conversation deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete conversation", variant: "destructive" });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation?.messages, streamingContent]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId || isStreaming) return;
    
    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingSources([]);

    try {
      // Make the streaming request with model settings
      const response = await fetch(`/api/conversations/${selectedConversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: messageContent,
          model: selectedModel,
          provider: selectedProvider,
          temperature: temperature,
          selectedItems: selectedKnowledgeItems
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'user_message':
                  queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId] });
                  break;
                case 'sources':
                  setStreamingSources(data.sources);
                  break;
                case 'chunk':
                  setStreamingContent(prev => prev + data.content);
                  break;
                case 'complete':
                  queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId] });
                  queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
                  setIsStreaming(false);
                  setStreamingContent("");
                  setStreamingSources([]);
                  return;
                case 'error':
                  toast({ title: "Error sending message", description: data.error, variant: "destructive" });
                  setIsStreaming(false);
                  setStreamingContent("");
                  setStreamingSources([]);
                  return;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }

    } catch (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
      setIsStreaming(false);
      setStreamingContent("");
      setStreamingSources([]);
    }
  };

  const handleStopGeneration = () => {
    setIsStreaming(false);
    setStreamingContent("");
    setStreamingSources([]);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Message copied to clipboard" });
  };

  const handleRegenerateResponse = async () => {
    if (!currentConversation?.messages.length || isStreaming) return;
    
    const lastUserMessage = [...currentConversation.messages].reverse().find(m => m.role === "user");
    if (!lastUserMessage) return;

    setNewMessage(lastUserMessage.content);
    await handleSendMessage();
  };

  const handleCreateConversation = () => {
    const title = newConversationTitle.trim() || `Chat ${new Date().toLocaleDateString()}`;
    createConversationMutation.mutate(title);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleKnowledgeItem = (itemId: string) => {
    setSelectedKnowledgeItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="h-3 w-3" />;
      case 'image': return <Image className="h-3 w-3" />;
      case 'link': return <Link className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex h-screen bg-background" data-testid="improved-chat-page">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Conversations Panel */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <div className="h-full border-r border-border bg-muted/10 flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5" />
                <h2 className="font-semibold">Conversations</h2>
              </div>
              
              {/* New conversation */}
              <div className="space-y-3">
                <Input
                  placeholder="Conversation title..."
                  value={newConversationTitle}
                  onChange={(e) => setNewConversationTitle(e.target.value)}
                  data-testid="input-conversation-title"
                />
                <Button 
                  onClick={handleCreateConversation}
                  disabled={createConversationMutation.isPending}
                  className="w-full"
                  size="sm"
                  data-testid="button-create-conversation"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
            </div>
            
            {/* Conversations list */}
            <ScrollArea className="flex-1 p-2">
              {conversationsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm px-4">
                  No conversations yet. Create one to get started!
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation: Conversation) => (
                    <Card
                      key={conversation.id}
                      className={`cursor-pointer transition-all hover:shadow-sm ${
                        selectedConversationId === conversation.id 
                          ? "ring-2 ring-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate text-sm">{conversation.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(conversation.updatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversationMutation.mutate(conversation.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            data-testid={`button-delete-${conversation.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Chat Panel */}
        <ResizablePanel defaultSize={55} minSize={40}>
          <div className="h-full flex flex-col">
            {selectedConversationId ? (
              <>
                {/* Chat header with controls */}
                <div className="border-b border-border p-4 bg-background/95 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="font-semibold text-lg" data-testid="chat-title">
                        {currentConversation?.title || "Loading..."}
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Chat with your knowledge base using AI
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSettings(!showSettings)}
                        data-testid="button-toggle-settings"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Chat Settings */}
                  {showSettings && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">AI Provider</label>
                          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {aiModels?.providers?.map((provider: string) => (
                                <SelectItem key={provider} value={provider}>
                                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Model</label>
                          <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {aiModels?.models?.[selectedProvider]?.map((model: string) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {conversationLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-20 mb-2" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !currentConversation?.messages.length && !isStreaming ? (
                    <div className="text-center text-muted-foreground py-16">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Start your conversation</h3>
                      <p className="text-sm">Ask anything about your knowledge base!</p>
                      <div className="mt-6 flex flex-wrap gap-2 justify-center">
                        <Badge variant="outline">What's in my documents?</Badge>
                        <Badge variant="outline">Summarize recent uploads</Badge>
                        <Badge variant="outline">Find key insights</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {currentConversation?.messages.map((message) => (
                        <div
                          key={message.id}
                          className="flex gap-4 group"
                          data-testid={`message-${message.role}-${message.id}`}
                        >
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback className={message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}>
                              {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {message.role === "user" ? "You" : "AI Assistant"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            
                            <Card className="max-w-none">
                              <CardContent className="p-4">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <ReactMarkdown>{message.content}</ReactMarkdown>
                                </div>
                                
                                {/* Message Controls */}
                                <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyMessage(message.content)}
                                    data-testid={`button-copy-${message.id}`}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  {message.role === "assistant" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleRegenerateResponse}
                                      disabled={isStreaming}
                                      data-testid={`button-regenerate-${message.id}`}
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      ))}
                      
                      {/* Streaming message */}
                      {isStreaming && (
                        <div className="flex gap-4" data-testid="streaming-message">
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback className="bg-secondary">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">AI Assistant</span>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span className="text-xs text-muted-foreground">typing...</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleStopGeneration}
                                data-testid="button-stop-generation"
                              >
                                <StopCircle className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <Card className="max-w-none">
                              <CardContent className="p-4">
                                {streamingContent ? (
                                  <div className="prose prose-sm max-w-none dark:prose-invert">
                                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Thinking...</span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message input */}
                <div className="border-t border-border p-4 bg-background/95 backdrop-blur">
                  <div className="space-y-3">
                    {/* Selected Knowledge Items */}
                    {selectedKnowledgeItems.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-muted-foreground">Context:</span>
                        {selectedKnowledgeItems.map(itemId => {
                          const item = knowledgeItems.find(k => k.id === itemId);
                          return item ? (
                            <Badge key={itemId} variant="secondary" className="text-xs">
                              {getTypeIcon(item.type)}
                              <span className="ml-1">{item.title}</span>
                              <button
                                onClick={() => toggleKnowledgeItem(itemId)}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <Textarea
                        placeholder="Ask anything about your knowledge base..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isStreaming}
                        className="min-h-[44px] max-h-32 flex-1 resize-none"
                        data-testid="input-message"
                      />
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || isStreaming}
                          data-testid="button-send-message"
                        >
                          {isStreaming ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground max-w-md">
                  <MessageSquare className="h-16 w-16 mx-auto mb-6 opacity-50" />
                  <h2 className="text-xl font-medium mb-2">Welcome to KnowledgeVault Chat</h2>
                  <p className="text-sm mb-6">Create a new conversation to start chatting with your knowledge base using AI</p>
                  <Button onClick={() => handleCreateConversation()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Chat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Sources & Context Panel */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <div className="h-full border-l border-border bg-muted/5 flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Context & Sources
              </h3>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Live Sources */}
                {(streamingSources.length > 0 || (currentConversation?.messages.slice(-1)[0]?.metadata?.sources?.length || 0) > 0) && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <ExternalLink className="h-3 w-3" />
                      Active Sources
                    </h4>
                    <div className="space-y-2">
                      {(streamingSources.length > 0 ? streamingSources : currentConversation?.messages.slice(-1)[0]?.metadata?.sources || []).map((source) => (
                        <Card key={source.id} className="p-3" data-testid={`active-source-${source.id}`}>
                          <div className="flex items-start gap-2">
                            {getTypeIcon(source.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{source.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{source.type}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Knowledge Base Selection */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Select Context</h4>
                  <p className="text-xs text-muted-foreground mb-3">Choose specific items for AI context</p>
                  {knowledgeLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : knowledgeItems.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4 text-xs">
                      No knowledge items yet. Upload some content to get started!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {knowledgeItems.slice(0, 10).map((item) => (
                        <Card
                          key={item.id}
                          className={`p-2 cursor-pointer transition-all hover:shadow-sm ${
                            selectedKnowledgeItems.includes(item.id) 
                              ? "ring-2 ring-primary bg-primary/5" 
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleKnowledgeItem(item.id)}
                          data-testid={`knowledge-item-${item.id}`}
                        >
                          <div className="flex items-start gap-2">
                            {getTypeIcon(item.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{item.title}</p>
                              {item.summary && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={item.isProcessed ? "default" : "secondary"} className="text-xs h-4">
                                  {item.isProcessed ? "Ready" : "Processing"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}