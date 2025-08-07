import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProcessedContent {
  title: string;
  summary: string;
  tags: string[];
  category: string;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("file");
  const [textContent, setTextContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const createKnowledgeItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/knowledge-items", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-items"] });
      onSuccess();
      handleClose();
    },
  });

  const processTextMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/process-text", { content });
      return response.json();
    },
  });

  const processLinkMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/process-link", { url });
      return response.json();
    },
  });

  const handleClose = () => {
    setTextContent("");
    setLinkUrl("");
    setActiveTab("file");
    onClose();
  };

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload");
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleFileUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (!result.successful || result.successful.length === 0) return;

    setIsProcessing(true);
    try {
      const uploadedFile = result.successful[0];
      const uploadURL = uploadedFile.uploadURL;
      
      // For now, create a basic knowledge item
      // In a real implementation, you'd process the file on the server
      const knowledgeItemData = {
        title: uploadedFile.name || "Uploaded File",
        summary: `Uploaded file: ${uploadedFile.name}`,
        content: "",
        type: getFileType(uploadedFile.type),
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.type,
        fileUrl: uploadURL,
        isProcessed: false,
        tags: ["upload"],
      };

      await createKnowledgeItemMutation.mutateAsync(knowledgeItemData);
      
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded and is being processed.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process uploaded file.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim()) return;

    setIsProcessing(true);
    try {
      const { processedContent } = await processTextMutation.mutateAsync(textContent);
      
      const knowledgeItemData = {
        ...processedContent,
        content: textContent,
        type: "text",
        isProcessed: true,
        tags: processedContent.tags,
      };

      await createKnowledgeItemMutation.mutateAsync(knowledgeItemData);
      
      toast({
        title: "Text added",
        description: "Your text has been processed and added to your knowledge base.",
      });
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "Failed to process text content.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLinkSubmit = async () => {
    if (!linkUrl.trim()) return;

    // Basic URL validation
    try {
      new URL(linkUrl);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    // Determine content type based on URL
    let contentType = "link";
    const urlLower = linkUrl.toLowerCase();
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('vimeo.com')) {
      contentType = "video";
    }
    
    try {
      // Step 1: Create item immediately with basic info and processing state
      const initialItemData = {
        title: contentType === "video" ? "🎬 Analyzing video content..." : "🔗 Processing link...",
        summary: "AI is analyzing this content and will provide a detailed summary shortly.",
        content: linkUrl,
        type: contentType,
        fileUrl: linkUrl,
        isProcessed: false,
        tags: [contentType === "video" ? "video" : "web", "processing"],
        metadata: {
          processingState: "analyzing",
          originalUrl: linkUrl
        }
      };

      const createdItem = await createKnowledgeItemMutation.mutateAsync(initialItemData);
      
      // Show success immediately
      toast({
        title: "✨ Content added!",
        description: `Your ${contentType === "video" ? "video" : "link"} is being analyzed by AI. You'll see the summary update in real-time.`,
      });
      
      // Close modal immediately for better UX
      handleClose();
      
      // Step 2: Process in background and update the item
      try {
        const { processedContent } = await processLinkMutation.mutateAsync(linkUrl);
        
        // Update the item with processed content
        const updatedItemData = {
          ...processedContent,
          content: linkUrl,
          type: contentType,
          fileUrl: linkUrl,
          isProcessed: true,
          tags: processedContent.tags,
          thumbnailUrl: processedContent.thumbnailUrl,
          metadata: {
            ...processedContent.metadata,
            processingState: "completed",
            originalUrl: linkUrl
          },
        };

        // Update the created item
        await apiRequest("PUT", `/api/knowledge-items/${createdItem.id}`, updatedItemData);
        
        // Refresh the list to show updated content
        queryClient.invalidateQueries({ queryKey: ["/api/knowledge-items"] });
        
      } catch (processingError) {
        // If processing fails, update item to show error state
        await apiRequest("PUT", `/api/knowledge-items/${createdItem.id}`, {
          title: "⚠️ Processing incomplete",
          summary: "Unable to fully analyze this content. You can still access the original link.",
          isProcessed: false,
          metadata: {
            processingState: "failed",
            originalUrl: linkUrl,
            error: "Failed to process content"
          }
        });
        queryClient.invalidateQueries({ queryKey: ["/api/knowledge-items"] });
      }
      
    } catch (error) {
      toast({
        title: "Failed to add content",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getFileType = (mimeType?: string): string => {
    if (!mimeType) return "document";
    
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.includes("pdf") || mimeType.includes("document")) return "document";
    if (mimeType.startsWith("text/")) return "text";
    
    return "document";
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto floating-card border-0 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 rounded-3xl">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute top-10 left-10 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl animate-blob"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-300/20 rounded-full blur-2xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-36 h-36 bg-cyan-300/20 rounded-full blur-2xl animate-blob animation-delay-4000 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        <div className="relative z-10">
          <DialogHeader className="text-center pb-8">
            <DialogTitle className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl floating-icon">
                  <i className="fas fa-sparkles text-3xl text-white"></i>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
                  <i className="fas fa-plus text-white text-sm"></i>
                </div>
              </div>
              <div>
                <h2 className="text-4xl font-bold gradient-text mb-2">
                  ✨ Expand Your Universe
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
                  Choose your preferred method to add knowledge
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

        <div className="pt-8">
          {/* Modern Card-based Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div 
              className={`morphism-button p-6 rounded-3xl cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                activeTab === "file" 
                  ? "border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 shadow-xl" 
                  : "border-purple-200 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500"
              }`}
              onClick={() => setActiveTab("file")}
            >
              <div className="text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  activeTab === "file" 
                    ? "bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg" 
                    : "bg-gradient-to-br from-purple-400 to-blue-500 shadow-md"
                }`}>
                  <i className="fas fa-cloud-upload-alt text-white text-2xl"></i>
                </div>
                <h3 className={`text-xl font-bold mb-2 ${
                  activeTab === "file" ? "gradient-text" : "text-gray-800 dark:text-gray-200"
                }`}>
                  📁 Upload Files
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Documents, images, audio, video
                </p>
              </div>
            </div>
            
            <div 
              className={`morphism-button p-6 rounded-3xl cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                activeTab === "text" 
                  ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 shadow-xl" 
                  : "border-green-200 dark:border-green-600 hover:border-green-400 dark:hover:border-green-500"
              }`}
              onClick={() => setActiveTab("text")}
            >
              <div className="text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  activeTab === "text" 
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg" 
                    : "bg-gradient-to-br from-green-400 to-emerald-500 shadow-md"
                }`}>
                  <i className="fas fa-pen-fancy text-white text-2xl"></i>
                </div>
                <h3 className={`text-xl font-bold mb-2 ${
                  activeTab === "text" ? "text-green-600 dark:text-green-400" : "text-gray-800 dark:text-gray-200"
                }`}>
                  ✍️ Add Text
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Notes, ideas, articles, thoughts
                </p>
              </div>
            </div>
            
            <div 
              className={`morphism-button p-6 rounded-3xl cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                activeTab === "link" 
                  ? "border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 shadow-xl" 
                  : "border-cyan-200 dark:border-cyan-600 hover:border-cyan-400 dark:hover:border-cyan-500"
              }`}
              onClick={() => setActiveTab("link")}
            >
              <div className="text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  activeTab === "link" 
                    ? "bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg" 
                    : "bg-gradient-to-br from-cyan-400 to-blue-500 shadow-md"
                }`}>
                  <i className="fas fa-globe-americas text-white text-2xl"></i>
                </div>
                <h3 className={`text-xl font-bold mb-2 ${
                  activeTab === "link" ? "text-cyan-600 dark:text-cyan-400" : "text-gray-800 dark:text-gray-200"
                }`}>
                  🌐 Save Links
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Websites, videos, articles
                </p>
              </div>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>

            <TabsContent value="file" className="mt-0">
              <div className="floating-card rounded-3xl p-8 border-2 border-purple-200 dark:border-purple-600">
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={100 * 1024 * 1024} // 100MB
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleFileUploadComplete}
                  buttonClassName="w-full py-16 border-3 border-dashed border-purple-300 dark:border-purple-500 rounded-3xl hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-500 morphism-button group relative overflow-hidden"
                >
                  <div className="relative z-10">
                    {/* Floating elements */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-2 border-purple-400 rounded-lg animate-bounce group-hover:scale-110 transition-transform" style={{animationDelay: '0s'} as React.CSSProperties}></div>
                    <div className="absolute top-8 right-8 w-6 h-6 border-2 border-blue-400 rounded-full animate-bounce group-hover:scale-110 transition-transform" style={{animationDelay: '0.5s'} as React.CSSProperties}></div>
                    <div className="absolute bottom-8 left-12 w-4 h-4 border-2 border-cyan-400 rounded-lg animate-bounce group-hover:scale-110 transition-transform" style={{animationDelay: '1s'} as React.CSSProperties}></div>
                    
                    <div className="flex flex-col items-center justify-center space-y-8">
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-blue-600 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-all duration-300 group-hover:scale-110">
                          <i className="fas fa-cloud-upload-alt text-4xl text-white"></i>
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                          <i className="fas fa-plus text-white text-sm"></i>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <h4 className="text-3xl font-bold gradient-text mb-4">
                          🎆 Drag & Drop Magic Zone
                        </h4>
                        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 font-medium">
                          Drop files here or click to browse your device
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                          <div className="morphism-button p-4 rounded-2xl group-hover:scale-105 transition-all">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                              <i className="fas fa-file-pdf text-white"></i>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">PDF Documents</p>
                          </div>
                          
                          <div className="morphism-button p-4 rounded-2xl group-hover:scale-105 transition-all">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                              <i className="fas fa-image text-white"></i>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Images</p>
                          </div>
                          
                          <div className="morphism-button p-4 rounded-2xl group-hover:scale-105 transition-all">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                              <i className="fas fa-headphones text-white"></i>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Audio</p>
                          </div>
                          
                          <div className="morphism-button p-4 rounded-2xl group-hover:scale-105 transition-all">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                              <i className="fas fa-video text-white"></i>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Video</p>
                          </div>
                        </div>
                        
                        <p className="text-base text-gray-500 dark:text-gray-400 mt-6">
                          Maximum 100MB per file • Up to 5 files at once
                        </p>
                      </div>
                    </div>
                  </div>
                </ObjectUploader>
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-0">
              <div className="floating-card rounded-3xl p-8 border-2 border-green-200 dark:border-green-600 space-y-8">
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl floating-icon">
                      <i className="fas fa-pen-fancy text-3xl text-white"></i>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
                      <i className="fas fa-sparkles text-white text-sm"></i>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-3">✍️ Capture Your Thoughts</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">Transform ideas into organized knowledge with AI assistance</p>
                </div>
                
                <div className="relative">
                  <Label htmlFor="text-content" className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 block">Your Content</Label>
                  <Textarea
                    id="text-content"
                    placeholder="✨ Share your thoughts, paste an article, or drop any text here...\n\n🤖 AI will automatically:\n• Generate a meaningful title\n• Create a comprehensive summary\n• Add relevant tags\n• Organize everything perfectly\n\nJust paste and let the magic happen!"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={16}
                    className="w-full resize-none morphism-button border-2 border-green-200 dark:border-green-600 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 text-base p-6 font-medium leading-relaxed"
                  />
                  <div className="absolute bottom-4 right-4 text-xs text-gray-500 dark:text-gray-400 morphism-button px-3 py-1 rounded-lg">
                    {textContent.length} characters
                  </div>
                </div>
                
                <Button 
                  onClick={handleTextSubmit}
                  disabled={!textContent.trim() || isProcessing}
                  className="w-full h-16 morphism-button bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-3">
                      <div className="pulse-loader w-6 h-6"></div>
                      <span>✨ AI is analyzing your content...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-rocket text-xl"></i>
                      <span>🎆 Process & Add to Knowledge</span>
                    </div>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="link" className="mt-0">
              <div className="floating-card rounded-3xl p-8 border-2 border-cyan-200 dark:border-cyan-600 space-y-8">
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl floating-icon">
                      <i className="fas fa-globe-americas text-3xl text-white"></i>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
                      <i className="fas fa-link text-white text-sm"></i>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mb-3">🌐 Save Web Content</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">Capture articles, videos, and websites with intelligent analysis</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="link-url" className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 block">Website URL</Label>
                    <div className="relative">
                      <Input
                        id="link-url"
                        type="url"
                        placeholder="🔗 https://example.com - paste any web link here"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="pl-16 pr-4 h-16 morphism-button border-2 border-cyan-200 dark:border-cyan-600 rounded-2xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 text-base font-medium"
                      />
                      <div className="absolute left-5 top-1/2 transform -translate-y-1/2">
                        <i className="fas fa-globe text-cyan-500 text-xl"></i>
                      </div>
                    </div>
                  </div>
                  
                  <div className="morphism-button p-6 rounded-2xl">
                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                      <i className="fas fa-magic mr-2 text-cyan-500"></i>
                      ✨ AI-Powered Analysis
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-eye text-cyan-500"></i>
                        <span className="text-gray-600 dark:text-gray-400">Extract key content & summaries</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-image text-cyan-500"></i>
                        <span className="text-gray-600 dark:text-gray-400">Capture thumbnails & media</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-tags text-cyan-500"></i>
                        <span className="text-gray-600 dark:text-gray-400">Generate relevant tags</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-brain text-cyan-500"></i>
                        <span className="text-gray-600 dark:text-gray-400">Intelligent categorization</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-3">
                    <div className="morphism-button px-4 py-2 rounded-xl flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                        <i className="fab fa-youtube text-white text-sm"></i>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">YouTube</span>
                    </div>
                    <div className="morphism-button px-4 py-2 rounded-xl flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <i className="fab fa-vimeo text-white text-sm"></i>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Vimeo</span>
                    </div>
                    <div className="morphism-button px-4 py-2 rounded-xl flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                        <i className="fas fa-newspaper text-white text-sm"></i>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Articles</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleLinkSubmit}
                  disabled={!linkUrl.trim() || isProcessing}
                  className="w-full h-16 morphism-button bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-3">
                      <div className="pulse-loader w-6 h-6"></div>
                      <span>✨ Fetching & analyzing content...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-rocket text-xl"></i>
                      <span>🎆 Capture & Analyze Link</span>
                    </div>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
