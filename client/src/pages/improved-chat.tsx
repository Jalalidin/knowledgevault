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
import { Trash2, MessageSquare, Send, Bot, User, ExternalLink, Plus, Loader2 } from "lucide-react";
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

export default function ImprovedChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingSources, setStreamingSources] = useState<Array<{ id: string; title: string; type: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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
      // Make the streaming request
      const response = await fetch(`/api/conversations/${selectedConversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: messageContent }),
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
                  // User message saved, refresh conversation
                  queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId] });
                  break;
                case 'sources':
                  setStreamingSources(data.sources);
                  break;
                case 'chunk':
                  setStreamingContent(prev => prev + data.content);
                  break;
                case 'complete':
                  // AI response complete, refresh conversation
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

  return (
    <div className="flex h-screen bg-background" data-testid="improved-chat-page">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-muted/10">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5" />
            <h2 className="font-semibold">Conversations</h2>
          </div>
          
          {/* New conversation */}
          <div className="space-y-3 mb-4">
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
              data-testid="button-create-conversation"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createConversationMutation.isPending ? "Creating..." : "New Chat"}
            </Button>
          </div>
          
          <Separator className="mb-4" />
          
          {/* Conversations list */}
          <ScrollArea className="h-[calc(100vh-250px)]">
            {conversationsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                No conversations yet. Create one to get started!
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation: Conversation) => (
                  <Card
                    key={conversation.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedConversationId === conversation.id 
                        ? "ring-2 ring-primary shadow-md" 
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    data-testid={`conversation-${conversation.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
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
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-delete-${conversation.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            {/* Chat header */}
            <div className="border-b border-border p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <h1 className="font-semibold text-lg" data-testid="chat-title">
                {currentConversation?.title || "Loading..."}
              </h1>
              <p className="text-sm text-muted-foreground">
                Chat with your knowledge base using AI
              </p>
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
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Start your conversation</h3>
                  <p className="text-sm">Ask anything about your knowledge base!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {currentConversation?.messages.map((message) => (
                    <div
                      key={message.id}
                      className="flex gap-4"
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
                            
                            {/* Sources for AI messages */}
                            {message.role === "assistant" && message.metadata?.sources && message.metadata.sources.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-border">
                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <ExternalLink className="h-4 w-4" />
                                  Sources:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {message.metadata.sources.map((source) => (
                                    <Badge key={source.id} variant="outline" className="text-xs" data-testid={`source-${source.id}`}>
                                      {source.title} ({source.type})
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Model info for AI messages */}
                            {message.role === "assistant" && message.metadata?.model && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {message.metadata.provider} • {message.metadata.model}
                              </div>
                            )}
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
                            
                            {/* Streaming sources */}
                            {streamingSources.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-border">
                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <ExternalLink className="h-4 w-4" />
                                  Sources:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {streamingSources.map((source) => (
                                    <Badge key={source.id} variant="outline" className="text-xs">
                                      {source.title} ({source.type})
                                    </Badge>
                                  ))}
                                </div>
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
            <div className="border-t border-border p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex gap-3">
                <Input
                  placeholder="Ask anything about your knowledge base..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isStreaming}
                  className="flex-1"
                  data-testid="input-message"
                />
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-6 opacity-50" />
              <h2 className="text-xl font-medium mb-2">Welcome to KnowledgeVault Chat</h2>
              <p className="text-sm mb-4 max-w-md">Create a new conversation to start chatting with your knowledge base using AI</p>
              <Button onClick={() => handleCreateConversation()} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}