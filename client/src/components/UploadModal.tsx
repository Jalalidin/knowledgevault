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
    if (result.successful.length === 0) return;

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
      
      const knowledgeItemData = {
        ...processedContent,
        content: linkUrl,
        type: "link",
        fileUrl: linkUrl,
        isProcessed: true,
        tags: processedContent.tags,
      };

      await createKnowledgeItemMutation.mutateAsync(knowledgeItemData);
      
      toast({
        title: "Link added",
        description: "Your link has been added to your knowledge base.",
      });
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "Failed to process link.",
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <i className="fas fa-plus text-primary"></i>
            <span>Add to Knowledge Base</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="text">Add Text</TabsTrigger>
            <TabsTrigger value="link">Add Link</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <div className="text-center">
              <ObjectUploader
                maxNumberOfFiles={5}
                maxFileSize={100 * 1024 * 1024} // 100MB
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleFileUploadComplete}
                buttonClassName="w-full"
              >
                <div className="upload-zone">
                  <div className="mx-auto w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                    <i className="fas fa-cloud-upload-alt text-xl text-primary"></i>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Drop files here or click to browse
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Supports: PDF, DOCX, images, audio, video files (Max 100MB each)
                  </p>
                  <div className="text-primary">Choose Files</div>
                </div>
              </ObjectUploader>
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="text-content">Text Content</Label>
                <Textarea
                  id="text-content"
                  placeholder="Paste or type your text content here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={10}
                  className="resize-none"
                />
              </div>
              <Button 
                onClick={handleTextSubmit}
                disabled={!textContent.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <div className="spinner w-4 h-4 mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus mr-2"></i>
                    Add Text
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="link-url">Website URL</Label>
                <Input
                  id="link-url"
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleLinkSubmit}
                disabled={!linkUrl.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <div className="spinner w-4 h-4 mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-link mr-2"></i>
                    Add Link
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
