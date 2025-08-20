import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Trash2, ExternalLink, CheckCircle, XCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface WechatIntegration {
  id: string;
  userId: string;
  wechatOpenId: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  isActive: boolean | null;
  lastMessageAt: Date | null;
  createdAt: Date | null;
}

export default function WeChat() {
  const [wechatId, setWechatId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch WeChat integrations
  const { data: integrations = [], isLoading } = useQuery<WechatIntegration[]>({
    queryKey: ["/api/wechat/integrations"],
  });

  // Link WeChat account using WeChat ID
  const linkWechatAccount = async () => {
    if (!wechatId.trim()) {
      toast({
        title: "Error",
        description: "Please enter your WeChat ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLinking(true);
      const response = await apiRequest("POST", "/api/wechat/link", {
        wechatId: wechatId.trim(),
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/wechat/integrations"] });
      toast({
        title: "Success",
        description: "WeChat account linked successfully!",
      });
      setWechatId("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to link WeChat account",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  // Delete integration mutation
  const deleteIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/wechat/integrations/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wechat/integrations"] });
      toast({
        title: "Success",
        description: "WeChat integration removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove WeChat integration",
        variant: "destructive",
      });
    },
  });

  const handleDeleteIntegration = (id: string) => {
    if (confirm("Are you sure you want to remove this WeChat integration?")) {
      deleteIntegrationMutation.mutate(id);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl" data-testid="wechat-page">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="title-wechat">
            WeChat Integration
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-description">
            Connect your WeChat account to save messages, images, and links directly to your knowledge base.
          </p>
        </div>

        {/* Setup Instructions */}
        <Card data-testid="card-setup">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              How to Connect WeChat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 dark:text-blue-300 font-bold">1</span>
                </div>
                <h3 className="font-medium mb-1">Add WeChat Account</h3>
                <p className="text-sm text-muted-foreground">
                  Follow our WeChat account and get your WeChat ID
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 dark:text-blue-300 font-bold">2</span>
                </div>
                <h3 className="font-medium mb-1">Configure WeChat ID</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your WeChat ID in the form below to link your account
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 dark:text-blue-300 font-bold">3</span>
                </div>
                <h3 className="font-medium mb-1">Start Messaging</h3>
                <p className="text-sm text-muted-foreground">
                  Send messages to the bot to automatically save them to your knowledge base
                </p>
              </div>
            </div>

            <Separator />

            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wechat-id">Your WeChat ID</Label>
                <Input
                  id="wechat-id"
                  placeholder="Enter your WeChat ID"
                  value={wechatId}
                  onChange={(e) => setWechatId(e.target.value)}
                  data-testid="input-wechat-id"
                />
                <p className="text-xs text-muted-foreground">
                  You can find your WeChat ID in WeChat Settings → Account Info → WeChat ID
                </p>
              </div>
              
              <Button
                onClick={linkWechatAccount}
                disabled={isLinking || !wechatId.trim()}
                className="w-full"
                data-testid="button-link-account"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLinking ? "Linking..." : "Link WeChat Account"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connected Accounts */}
        <Card data-testid="card-connected-accounts">
          <CardHeader>
            <CardTitle>Connected WeChat Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8" data-testid="loading-integrations">
                <p className="text-muted-foreground">Loading integrations...</p>
              </div>
            ) : integrations.length === 0 ? (
              <div className="text-center py-8" data-testid="no-integrations">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No WeChat accounts connected yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate a QR code above to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4" data-testid="integrations-list">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`integration-${integration.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      {integration.avatarUrl ? (
                        <img
                          src={integration.avatarUrl}
                          alt={integration.nickname || "WeChat User"}
                          className="w-10 h-10 rounded-full"
                          data-testid={`avatar-${integration.id}`}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <MessageCircle className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium" data-testid={`nickname-${integration.id}`}>
                          {integration.nickname || "WeChat User"}
                        </h3>
                        <p className="text-sm text-muted-foreground" data-testid={`last-message-${integration.id}`}>
                          Last message: {formatDate(integration.lastMessageAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={integration.isActive ? "default" : "secondary"}
                        data-testid={`status-${integration.id}`}
                      >
                        {integration.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteIntegration(integration.id)}
                        disabled={deleteIntegrationMutation.isPending}
                        data-testid={`button-delete-${integration.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card data-testid="card-features">
          <CardHeader>
            <CardTitle>What You Can Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">✉️ Text Messages</h4>
                <p className="text-sm text-muted-foreground">
                  Send text messages to the WeChat bot to automatically save them with AI-generated summaries.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🖼️ Images & Photos</h4>
                <p className="text-sm text-muted-foreground">
                  Share images and photos to have them analyzed and described automatically.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🔗 Web Links</h4>
                <p className="text-sm text-muted-foreground">
                  Share web links to have their content extracted and summarized for easy reference.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🎵 Voice Messages</h4>
                <p className="text-sm text-muted-foreground">
                  Send voice messages to be saved (transcription coming soon).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}