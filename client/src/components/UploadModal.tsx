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
    try {
      const { processedContent } = await processLinkMutation.mutateAsync(linkUrl);
      
      // Determine content type based on URL or processed content
      let contentType = "link";
      const urlLower = linkUrl.toLowerCase();
      if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('vimeo.com')) {
        contentType = "video";
      }
      
      const knowledgeItemData = {
        ...processedContent,
        content: linkUrl,
        type: contentType,
        fileUrl: linkUrl,
        isProcessed: true,
        tags: processedContent.tags,
        // Include enhanced metadata
        thumbnailUrl: processedContent.thumbnailUrl,
        metadata: processedContent.metadata || {},
      };

      await createKnowledgeItemMutation.mutateAsync(knowledgeItemData);
      
      const contentTypeDisplay = contentType === "video" ? "video link" : "link";
      toast({
        title: `${contentTypeDisplay.charAt(0).toUpperCase() + contentTypeDisplay.slice(1)} added`,
        description: `Your ${contentTypeDisplay} has been analyzed and added to your knowledge base.`,
      });
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "Failed to process link. It may be due to rate limiting, please try again in a moment.",
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
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border-0 shadow-2xl">
        <DialogHeader className="border-b border-gray-100 dark:border-slate-700 pb-6">
          <DialogTitle className="flex items-center space-x-3 text-2xl">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-plus text-white"></i>
            </div>
            <div>
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent font-bold">
                Add to Knowledge Base
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-normal mt-1">
                Upload files, add text, or save links to expand your knowledge
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 h-14 bg-gray-50 dark:bg-slate-800 rounded-2xl p-2">
              <TabsTrigger 
                value="file" 
                className="text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md rounded-xl"
              >
                <i className="fas fa-upload mr-2"></i>
                Upload File
              </TabsTrigger>
              <TabsTrigger 
                value="text" 
                className="text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md rounded-xl"
              >
                <i className="fas fa-edit mr-2"></i>
                Add Text
              </TabsTrigger>
              <TabsTrigger 
                value="link" 
                className="text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md rounded-xl"
              >
                <i className="fas fa-link mr-2"></i>
                Add Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-8">
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={100 * 1024 * 1024} // 100MB
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleFileUploadComplete}
                  buttonClassName="w-full py-12 border-2 border-dashed border-blue-200 dark:border-slate-600 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 bg-white/50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700"
                >
                  <div className="flex flex-col items-center justify-center space-y-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <i className="fas fa-cloud-upload-alt text-2xl text-white"></i>
                    </div>
                    <div className="text-center">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        Drop files here or click to browse
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Supports: PDF, DOCX, images, audio, video files (Max 100MB each)
                      </p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                          <i className="fas fa-file-pdf mr-1"></i> PDF
                        </span>
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                          <i className="fas fa-image mr-1"></i> Images
                        </span>
                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                          <i className="fas fa-headphones mr-1"></i> Audio
                        </span>
                        <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                          <i className="fas fa-video mr-1"></i> Video
                        </span>
                      </div>
                    </div>
                  </div>
                </ObjectUploader>
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-8 space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <i className="fas fa-edit text-2xl text-white"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Add Text Content</h3>
                  <p className="text-gray-600 dark:text-gray-400">Share your thoughts, notes, or any text-based knowledge</p>
                </div>
                
                <div>
                  <Label htmlFor="text-content" className="text-sm font-medium text-gray-700 dark:text-gray-300">Text Content</Label>
                  <Textarea
                    id="text-content"
                    placeholder="Paste or type your text content here...\n\nTip: You can paste articles, notes, ideas, or any text content. Our AI will automatically generate a title, summary, and tags for you."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={12}
                    className="mt-2 resize-none bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50"
                  />
                </div>
                
                <Button 
                  onClick={handleTextSubmit}
                  disabled={!textContent.trim() || isProcessing}
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="spinner w-5 h-5 mr-3"></div>
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic mr-3"></i>
                      Add & Process Text
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="link" className="mt-8">
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-8 space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <i className="fas fa-link text-2xl text-white"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Save Web Link</h3>
                  <p className="text-gray-600 dark:text-gray-400">Save articles, videos (YouTube, Vimeo), and websites with automatic content analysis</p>
                </div>
                
                <div>
                  <Label htmlFor="link-url" className="text-sm font-medium text-gray-700 dark:text-gray-300">Website URL</Label>
                  <div className="relative mt-2">
                    <Input
                      id="link-url"
                      type="url"
                      placeholder="https://example.com or paste any web link here"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="pl-12 h-12 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50"
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <i className="fas fa-globe text-gray-400"></i>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Our AI will automatically analyze the content, extract thumbnails for videos, and generate detailed summaries with relevant tags
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                      <i className="fab fa-youtube mr-1"></i> YouTube
                    </span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                      <i className="fab fa-vimeo mr-1"></i> Vimeo
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                      <i className="fas fa-globe mr-1"></i> Articles
                    </span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleLinkSubmit}
                  disabled={!linkUrl.trim() || isProcessing}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="spinner w-5 h-5 mr-3"></div>
                      Fetching & Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-bookmark mr-3"></i>
                      Save & Process Link
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
