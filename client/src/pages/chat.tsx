import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Trash2, MessageSquare, Send, Bot, User, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

export default function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newConversationTitle, setNewConversationTitle] = useState("");
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

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      apiRequest("POST", `/api/conversations/${conversationId}/messages`, { content }).then((res: Response) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setNewMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
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
  }, [currentConversation?.messages]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversationId) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content: newMessage.trim(),
    });
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
    <div className="flex h-screen bg-background" data-testid="chat-page">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-muted/10">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5" />
            <h2 className="font-semibold">Conversations</h2>
          </div>
          
          {/* New conversation */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Conversation title..."
              value={newConversationTitle}
              onChange={(e) => setNewConversationTitle(e.target.value)}
              data-testid="input-conversation-title"
            />
            <Button 
              onClick={handleCreateConversation}
              disabled={createConversationMutation.isPending}
              data-testid="button-create-conversation"
            >
              Create
            </Button>
          </div>
          
          <Separator className="mb-4" />
          
          {/* Conversations list */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            {conversationsLoading ? (
              <div className="text-center text-muted-foreground py-4">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No conversations yet. Create one to get started!
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation: Conversation) => (
                  <Card
                    key={conversation.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedConversationId === conversation.id ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    data-testid={`conversation-${conversation.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{conversation.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(conversation.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversationMutation.mutate(conversation.id);
                          }}
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
            <div className="border-b border-border p-4">
              <h1 className="font-semibold text-lg" data-testid="chat-title">
                {currentConversation?.title || "Loading..."}
              </h1>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {conversationLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading messages...</div>
              ) : !currentConversation?.messages.length ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Ask a question about your knowledge base!
                </div>
              ) : (
                <div className="space-y-4">
                  {currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${message.role}-${message.id}`}
                    >
                      <div className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className="flex-shrink-0">
                          {message.role === "user" ? (
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-primary-foreground" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                              <Bot className="h-4 w-4 text-secondary-foreground" />
                            </div>
                          )}
                        </div>
                        
                        <div className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
                          <Card className={message.role === "user" ? "bg-primary text-primary-foreground" : ""}>
                            <CardContent className="p-3">
                              <div className="whitespace-pre-wrap">{message.content}</div>
                              
                              {/* Sources for AI messages */}
                              {message.role === "assistant" && message.metadata?.sources && message.metadata.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <p className="text-sm font-medium mb-2">Sources:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {message.metadata.sources.map((source) => (
                                      <Badge key={source.id} variant="outline" className="text-xs" data-testid={`source-${source.id}`}>
                                        <ExternalLink className="h-3 w-3 mr-1" />
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
                          
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message input */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask anything about your knowledge base..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h2 className="text-lg font-medium mb-2">Start a conversation</h2>
              <p>Create a new conversation to chat with your knowledge base using AI</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}