import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, Bot, Key, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AiModels {
  providers: string[];
  models: Record<string, string[]>;
}

interface AiSettings {
  preferredProvider: string;
  preferredModel: string;
  customApiKeys: Record<string, string>;
  chatSettings: {
    temperature?: number;
    maxTokens?: number;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AiSettings>({
    preferredProvider: "gemini",
    preferredModel: "gemini-2.5-flash",
    customApiKeys: {},
    chatSettings: {},
  });
  
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Fetch available AI models
  const { data: aiModels } = useQuery<AiModels>({
    queryKey: ["/api/ai-models"],
    queryFn: () => apiRequest("GET", "/api/ai-models").then((res: Response) => res.json()),
  });

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery<AiSettings>({
    queryKey: ["/api/ai-settings"],
    queryFn: () => apiRequest("GET", "/api/ai-settings").then((res: Response) => res.json()),
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<AiSettings>) =>
      apiRequest("PUT", "/api/ai-settings", newSettings).then((res: Response) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  // Update local state when settings are loaded
  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
      // Don't load masked API keys into the form
      setApiKeys({});
    }
  }, [currentSettings]);

  const handleProviderChange = (provider: string) => {
    const newSettings = {
      ...settings,
      preferredProvider: provider,
      preferredModel: aiModels?.models[provider]?.[0] || "",
    };
    setSettings(newSettings);
  };

  const handleSaveSettings = () => {
    const settingsToSave = {
      ...settings,
      customApiKeys: {
        ...settings.customApiKeys,
        ...Object.fromEntries(
          Object.entries(apiKeys).filter(([_, value]) => value.trim() !== "")
        ),
      },
    };

    updateSettingsMutation.mutate(settingsToSave);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl" data-testid="settings-page">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">AI Chat Settings</h1>
      </div>

      <div className="grid gap-6">
        {/* AI Provider Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Model Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="provider">AI Provider</Label>
                <Select
                  value={settings.preferredProvider}
                  onValueChange={handleProviderChange}
                >
                  <SelectTrigger data-testid="select-provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModels?.providers.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="model">Model</Label>
                <Select
                  value={settings.preferredModel}
                  onValueChange={(model) => setSettings({ ...settings, preferredModel: model })}
                >
                  <SelectTrigger data-testid="select-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModels?.models[settings.preferredProvider]?.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="temperature">Temperature (0-1)</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.chatSettings.temperature || 0.7}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      chatSettings: {
                        ...settings.chatSettings,
                        temperature: parseFloat(e.target.value),
                      },
                    })
                  }
                  data-testid="input-temperature"
                />
              </div>

              <div>
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="100"
                  max="4000"
                  value={settings.chatSettings.maxTokens || 1000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      chatSettings: {
                        ...settings.chatSettings,
                        maxTokens: parseInt(e.target.value),
                      },
                    })
                  }
                  data-testid="input-max-tokens"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Add your own API keys for different providers. Leave empty to use default keys where available.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiModels?.providers.map((provider) => (
              <div key={provider}>
                <Label htmlFor={`api-key-${provider}`}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)} API Key
                </Label>
                <Input
                  id={`api-key-${provider}`}
                  type="password"
                  placeholder={
                    settings.customApiKeys[provider]
                      ? "API key is set (enter new key to replace)"
                      : `Enter your ${provider} API key`
                  }
                  value={apiKeys[provider] || ""}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, [provider]: e.target.value })
                  }
                  data-testid={`input-api-key-${provider}`}
                />
                {provider === "gemini" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Get your key from Google AI Studio
                  </p>
                )}
                {provider === "openai" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Get your key from OpenAI Platform
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
            data-testid="button-save-settings"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}