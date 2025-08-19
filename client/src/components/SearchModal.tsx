import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [searchMode, setSearchMode] = useState<"filter" | "ai">("filter");
  const [filterType, setFilterType] = useState<string>("all");
  const [shouldSearch, setShouldSearch] = useState(false);

  // Debounce search query for filter mode, immediate for AI mode
  useEffect(() => {
    if (searchMode === "filter") {
      const timer = setTimeout(() => {
        setDebouncedQuery(query);
        setShouldSearch(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [query, searchMode]);

  // Handle AI search on Enter key
  const handleAISearch = () => {
    if (searchMode === "ai" && query.trim()) {
      setDebouncedQuery(query);
      setShouldSearch(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchMode === "ai") {
      e.preventDefault();
      handleAISearch();
    }
  };

  // Reset query when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setShouldSearch(false);
      setDebouncedQuery("");
    }
  }, [isOpen, initialQuery]);

  // Reset search when switching modes
  useEffect(() => {
    setShouldSearch(false);
    setDebouncedQuery("");
    if (searchMode === "filter" && query.trim()) {
      // Auto-trigger filter search when switching to filter mode
      setTimeout(() => {
        setDebouncedQuery(query);
        setShouldSearch(true);
      }, 100);
    }
  }, [searchMode]);

  const { data: searchResults, isLoading } = useQuery<KnowledgeItemWithTags[]>({
    queryKey: [searchMode === "ai" ? "/api/search-ai" : "/api/search-filter", { q: debouncedQuery, type: filterType, mode: searchMode }],
    enabled: isOpen && debouncedQuery.length > 0 && shouldSearch,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col [&>button]:hidden">
        {/* Custom close button positioned at top-right corner */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-50 w-8 h-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800"
        >
          <i className="fas fa-times text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 text-sm"></i>
        </button>
        <DialogHeader>
          <DialogTitle className="sr-only">Search Knowledge Base</DialogTitle>
          <DialogDescription className="sr-only">
            Search your knowledge base using filter mode for exact matches or AI mode for natural language queries
          </DialogDescription>
          
          {/* Search Mode Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <Button
                  variant={searchMode === "filter" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSearchMode("filter")}
                  className={`px-4 py-2 rounded-md transition-all ${searchMode === "filter" ? "bg-primary text-white shadow-sm" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                  data-testid="button-filter-mode"
                >
                  <i className="fas fa-filter mr-2"></i>
                  Filter Search
                </Button>
                <Button
                  variant={searchMode === "ai" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSearchMode("ai")}
                  className={`px-4 py-2 rounded-md transition-all ${searchMode === "ai" ? "bg-primary text-white shadow-sm" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                  data-testid="button-ai-mode"
                >
                  <i className="fas fa-brain mr-2"></i>
                  AI Search
                </Button>
              </div>
              
              {searchMode === "filter" && (
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40" data-testid="select-filter-type">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="link">Links</SelectItem>
                    <SelectItem value="text">Text Notes</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <i className={`fas ${searchMode === "ai" ? "fa-brain" : "fa-search"} mr-2`}></i>
              <span>{searchMode === "ai" ? "Natural language queries" : "Keyword & filter search"}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 pb-4">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder={searchMode === "ai" ? "Ask anything about your knowledge... (Press Enter to search)" : "Search by title, content, or tags..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-12 pr-12 py-3 text-lg"
                autoFocus
                data-testid="input-search"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <i className={`fas ${searchMode === "ai" ? "fa-brain text-purple-500" : "fa-search text-gray-400"} text-lg`}></i>
              </div>
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setShouldSearch(false);
                    setDebouncedQuery("");
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                  data-testid="button-clear-search"
                >
                  <i className="fas fa-times text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"></i>
                </Button>
              )}
              
              {searchMode === "ai" && query.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAISearch}
                  className="absolute right-12 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600"
                  data-testid="button-ai-search"
                >
                  <i className="fas fa-search"></i>
                </Button>
              )}
            </div>
          </div>
          
          {debouncedQuery && (
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center space-x-2">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span>{searchMode === "ai" ? "AI is analyzing..." : "Searching..."}</span>
                  </>
                ) : (
                  <>
                    <i className={`fas ${searchMode === "ai" ? "fa-brain text-purple-500" : "fa-search text-gray-400"}`}></i>
                    <span>Found {searchResults?.length || 0} results for "{debouncedQuery}"</span>
                    {searchMode === "filter" && filterType !== "all" && (
                      <Badge variant="secondary" className="ml-2">{filterType}</Badge>
                    )}
                  </>
                )}
              </span>
              
              {searchMode === "ai" && !isLoading && (
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  <i className="fas fa-sparkles mr-1"></i>
                  AI Enhanced
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {!debouncedQuery ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <i className={`fas ${searchMode === "ai" ? "fa-brain" : "fa-search"} text-4xl mb-4 ${searchMode === "ai" ? "text-purple-400" : ""}`}></i>
              <h3 className="text-lg font-medium mb-2">
                {searchMode === "ai" ? "AI-Powered Search" : "Filter & Search"}
              </h3>
              <p className="mb-4">
                {searchMode === "ai" 
                  ? "Ask questions in natural language about your content"
                  : "Search by keywords, tags, or filter by content type"
                }
              </p>
              <div className="max-w-md mx-auto text-sm space-y-2">
                {searchMode === "ai" ? (
                  <div className="space-y-1">
                    <p className="font-medium text-purple-600 dark:text-purple-400">Try asking:</p>
                    <p>• "List all images"</p>
                    <p>• "Show me my documents from last week"</p>
                    <p>• "Find videos about tutorials"</p>
                    <p className="text-xs text-gray-500 mt-2">💡 Press Enter to search</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium">Search examples:</p>
                    <p>• Type keywords to find in titles and content</p>
                    <p>• Use filters to narrow down by file type</p>
                    <p>• Search by tag names for organized results</p>
                  </div>
                )}
              </div>
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
                  data-testid={`search-result-${item.id}`}
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
                          {item.type.toUpperCase()} • {formatDistanceToNow(new Date(item.createdAt || new Date()))} ago
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
              <i className={`fas ${searchMode === "ai" ? "fa-brain" : "fa-search"} text-4xl mb-4`}></i>
              <p>No results found for "{debouncedQuery}"</p>
              <div className="text-sm mt-4 space-y-2">
                {searchMode === "ai" ? (
                  <div>
                    <p>Try rephrasing your question or asking differently</p>
                    <p className="text-xs mt-2">Switch to Filter mode for exact keyword matching</p>
                  </div>
                ) : (
                  <div>
                    <p>Try different keywords or check your spelling</p>
                    <p className="text-xs mt-2">Switch to AI mode for natural language queries</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
