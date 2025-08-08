import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import type { KnowledgeItemWithTags } from "@shared/schema";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function SearchModal({ isOpen, onClose, initialQuery = "" }: SearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Reset query when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  const { data: searchResults, isLoading } = useQuery<KnowledgeItemWithTags[]>({
    queryKey: ["/api/search", { q: debouncedQuery }],
    enabled: isOpen && debouncedQuery.length > 0,
  });

  const getFileIcon = (type: string, mimeType?: string) => {
    switch (type) {
      case "document":
        if (mimeType?.includes("pdf")) return "fas fa-file-pdf text-red-600";
        return "fas fa-file-alt text-blue-600";
      case "image":
        return "fas fa-image text-green-600";
      case "audio":
        return "fas fa-headphones text-purple-600";
      case "video":
        return "fas fa-video text-red-600";
      case "link":
        return "fas fa-link text-cyan-600";
      default:
        return "fas fa-sticky-note text-gray-600";
    }
  };

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery) return text;
    
    const regex = new RegExp(`(${searchQuery})`, "gi");
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800/30">
          {part}
        </mark>
      ) : part
    );
  };

  const handleResultClick = (item: KnowledgeItemWithTags) => {
    if (item.type === "link" && item.fileUrl) {
      window.open(item.fileUrl, "_blank");
    } else if (item.objectPath) {
      window.open(item.objectPath, "_blank");
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col [&>button]:opacity-100 [&>button]:hover:bg-gray-100 [&>button]:dark:hover:bg-gray-800 [&>button]:transition-colors">
        <DialogHeader>
          <div className="flex items-center space-x-4 pb-4">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Search your knowledge base..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-4 pr-4 py-3 text-lg"
                autoFocus
              />
            </div>
          </div>
          
          {debouncedQuery && (
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                {isLoading ? "Searching..." : `Found ${searchResults?.length || 0} results`}
                {!isLoading && debouncedQuery && ` for "${debouncedQuery}"`}
              </span>
            </div>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {!debouncedQuery ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <i className="fas fa-search text-4xl mb-4"></i>
              <p>Start typing to search your knowledge base</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary dark:hover:border-primary transition-colors cursor-pointer"
                  onClick={() => handleResultClick(item)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className={getFileIcon(item.type, item.mimeType || undefined)}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {highlightText(item.title, debouncedQuery)}
                      </h4>
                      {item.summary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {highlightText(item.summary, debouncedQuery)}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {item.type.toUpperCase()} • {formatDistanceToNow(new Date(item.createdAt))} ago
                        </span>
                        {item.knowledgeItemTags.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <i className="fas fa-tags"></i>
                            <span>{item.knowledgeItemTags.map(kt => kt.tag.name).join(", ")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <i className="fas fa-search text-4xl mb-4"></i>
              <p>No results found for "{debouncedQuery}"</p>
              <p className="text-sm mt-2">Try different keywords or check your spelling</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
