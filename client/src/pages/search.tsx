import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import KnowledgeCard from "@/components/KnowledgeCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import type { KnowledgeItemWithTags } from "@shared/schema";

export default function Search() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  // Get query from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get("q");
    if (q) {
      setQuery(q);
      setDebouncedQuery(q);
    }
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      // Update URL
      if (query) {
        window.history.replaceState({}, "", `?q=${encodeURIComponent(query)}`);
      } else {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchResults, isLoading, refetch } = useQuery<KnowledgeItemWithTags[]>({
    queryKey: ["/api/search", { q: debouncedQuery }],
    enabled: debouncedQuery.length > 0,
  });

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
  };

  const handleBackToHome = () => {
    setLocation("/");
  };

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
        <mark key={index} className="search-highlight">
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
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation onSearch={handleSearch} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              onClick={handleBackToHome}
              className="flex items-center space-x-2"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Back to Knowledge Base</span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Search your knowledge base..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-3 text-lg"
                autoFocus
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <i className="fas fa-times"></i>
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isLoading ? "Searching..." : debouncedQuery ? `Found ${searchResults?.length || 0} results` : "Enter search terms above"}
                {!isLoading && debouncedQuery && ` for "${debouncedQuery}"`}
              </span>
            </div>
            
            {debouncedQuery && searchResults && searchResults.length > 0 && (
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className="px-3 py-1"
                >
                  <i className="fas fa-th"></i>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="px-3 py-1"
                >
                  <i className="fas fa-list"></i>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        <div className="space-y-6">
          {!debouncedQuery ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <i className="fas fa-search text-4xl mb-4"></i>
              <h3 className="text-lg font-medium mb-2">Search Your Knowledge Base</h3>
              <p>Use natural language to find information across all your content</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Badge variant="secondary">Try: "machine learning notes"</Badge>
                <Badge variant="secondary">Try: "meeting from last week"</Badge>
                <Badge variant="secondary">Try: "Python tutorials"</Badge>
              </div>
            </div>
          ) : isLoading ? (
            <div className={viewMode === "card" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "space-y-4"
            }>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={viewMode === "card" 
                  ? "bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4"
                  : "border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                }>
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
            viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 knowledge-grid">
                {searchResults.map((item) => (
                  <KnowledgeCard 
                    key={item.id} 
                    item={item} 
                    viewMode={viewMode}
                    onUpdate={refetch}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary dark:hover:border-primary transition-colors cursor-pointer"
                    onClick={() => handleResultClick(item)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className={getFileIcon(item.type, item.mimeType)}></i>
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
                        <div className="flex items-center justify-between">
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
                          <Button variant="ghost" size="sm">
                            View →
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <i className="fas fa-search text-4xl mb-4"></i>
              <h3 className="text-lg font-medium mb-2">No Results Found</h3>
              <p>No results found for "{debouncedQuery}"</p>
              <p className="text-sm mt-2">Try different keywords or check your spelling</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
