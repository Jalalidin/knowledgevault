import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <i className="fas fa-brain text-5xl text-primary mr-4"></i>
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white">KnowledgeVault</h1>
          </div>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            AI-powered personal knowledge manager that automatically organizes and makes searchable 
            diverse content types with end-to-end encryption
          </p>
          
          <Button 
            onClick={handleLogin}
            size="lg"
            className="text-lg px-8 py-4"
          >
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-upload text-2xl text-blue-600 dark:text-blue-400"></i>
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Upload</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Upload any file type - documents, images, audio, video - and let AI automatically categorize and summarize
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-search text-2xl text-green-600 dark:text-green-400"></i>
                </div>
                <h3 className="text-xl font-semibold mb-2">Natural Search</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Find information using natural language queries. Ask questions and get relevant results instantly
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-shield-alt text-2xl text-purple-600 dark:text-purple-400"></i>
                </div>
                <h3 className="text-xl font-semibold mb-2">End-to-End Encryption</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your knowledge is completely private and secure with enterprise-grade encryption
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-8 text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <i className="fas fa-file-pdf"></i>
              <span>PDFs</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-image"></i>
              <span>Images</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-headphones"></i>
              <span>Audio</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-video"></i>
              <span>Video</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-link"></i>
              <span>Links</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
