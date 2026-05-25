import { Upload, X, FileText, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  status: "uploading" | "completed" | "error";
}

interface DocumentUploaderProps {
  title: string;
  description?: string;
  acceptedFormats?: string[];
  maxSize?: string;
  onUpload?: (files: File[]) => void;
}

export function DocumentUploader({
  title,
  description,
  acceptedFormats = ["PDF", "DOC", "DOCX", "JPG", "PNG"],
  maxSize = "10MB",
  onUpload,
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFiles = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024).toFixed(2) + " KB",
      status: "uploading" as const,
    }));
    
    setFiles([...files, ...uploadedFiles]);
    
    // Simulate upload completion
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((f) =>
          uploadedFiles.find((uf) => uf.id === f.id)
            ? { ...f, status: "completed" as const }
            : f
        )
      );
    }, 1500);
    
    if (onUpload) {
      onUpload(newFiles);
    }
  };

  const removeFile = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[#0A0F14] mb-2">
          {title}
        </label>
        {description && (
          <p className="text-sm text-[#64748B] mb-4">{description}</p>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-[#00A9B7] bg-[#E0F5F7]"
            : "border-[#E6EEF2] bg-white hover:border-[#00A9B7]"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-[#E0F5F7] rounded-full flex items-center justify-center">
            <Upload className="w-6 h-6 text-[#00A9B7]" />
          </div>
          
          <div>
            <label className="cursor-pointer">
              <span className="text-[#00A9B7] font-semibold hover:underline">
                Click to upload
              </span>
              <span className="text-[#64748B]"> or drag and drop</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFiles(Array.from(e.target.files));
                  }
                }}
              />
            </label>
          </div>
          
          <p className="text-xs text-[#64748B]">
            {acceptedFormats.join(", ")} (max {maxSize})
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-white border border-[#E6EEF2] rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F6F9FC] rounded flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#00A9B7]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0A0F14]">{file.name}</p>
                  <p className="text-xs text-[#64748B]">{file.size}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {file.status === "completed" && (
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                )}
                {file.status === "uploading" && (
                  <div className="w-5 h-5 border-2 border-[#00A9B7] border-t-transparent rounded-full animate-spin" />
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 hover:bg-[#F6F9FC] rounded transition-colors"
                >
                  <X className="w-4 h-4 text-[#64748B]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
