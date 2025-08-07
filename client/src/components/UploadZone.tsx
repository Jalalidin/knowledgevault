import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  onUploadClick: () => void;
}

export default function UploadZone({ onUploadClick }: UploadZoneProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
          <i className="fas fa-cloud-upload-alt text-2xl text-primary"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Add to Your Knowledge Base
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Upload files, paste text, or add web links to organize your knowledge
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button onClick={onUploadClick} className="w-full sm:w-auto">
            <i className="fas fa-upload mr-2"></i>
            Upload Files
          </Button>
          
          <Button variant="outline" onClick={onUploadClick} className="w-full sm:w-auto">
            <i className="fas fa-edit mr-2"></i>
            Paste Text
          </Button>
          
          <Button variant="outline" onClick={onUploadClick} className="w-full sm:w-auto">
            <i className="fas fa-link mr-2"></i>
            Add Link
          </Button>
        </div>
      </div>
    </div>
  );
}
