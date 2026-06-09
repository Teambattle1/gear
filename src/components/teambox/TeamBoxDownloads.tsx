import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Eye,
  Trash2,
  Upload,
  FileText,
  RefreshCw,
  ChevronLeft,
  X,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TEAMBOX_BUCKET as BUCKET_NAME } from "@/lib/teamboxContent";

interface UploadedFile {
  name: string;
  url: string;
  type: "image" | "pdf";
  size: number;
  created_at: string;
}

interface TeamBoxDownloadsProps {
  onBack: () => void;
}

const TeamBoxDownloads: React.FC<TeamBoxDownloadsProps> = ({ onBack }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

      if (error) {
        console.error("Error loading files:", error);
        setIsLoading(false);
        return;
      }

      const fileList: UploadedFile[] = (data || [])
        .filter((file) => file.name !== ".emptyFolderPlaceholder")
        .map((file) => {
          const ext = file.name.split(".").pop()?.toLowerCase();
          const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
          const {
            data: { publicUrl },
          } = supabase.storage.from(BUCKET_NAME).getPublicUrl(file.name);
          return {
            name: file.name,
            url: publicUrl,
            type: isImage ? "image" : "pdf",
            size: (file as any).metadata?.size || 0,
            created_at: file.created_at || "",
          };
        });
      setFiles(fileList);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        const isValidType = ["jpg", "jpeg", "png", "gif", "webp", "pdf"].includes(ext || "");
        if (!isValidType) {
          alert(`Ugyldig filtype: ${file.name}. Kun JPEG, PNG og PDF er tilladt.`);
          continue;
        }
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `${timestamp}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, file, { upsert: true });
        if (uploadError) {
          console.error("Upload error:", uploadError);
          alert(`Fejl ved upload af ${file.name}: ${uploadError.message}`);
        }
      }
      await loadFiles();
    } catch (err) {
      console.error("Error uploading:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Slet filen "${fileName}"?`)) return;
    try {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileName]);
      if (error) {
        console.error("Delete error:", error);
        alert(`Fejl ved sletning: ${error.message}`);
        return;
      }
      setFiles((prev) => prev.filter((f) => f.name !== fileName));
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleFileClick = (file: UploadedFile) => {
    if (file.type === "image") setPreviewImage(file.url);
    else window.open(file.url, "_blank");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDisplayName = (fileName: string) => {
    const match = fileName.match(/^\d+-(.+)$/);
    return match ? match[1].replace(/_/g, " ") : fileName.replace(/_/g, " ");
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 tablet:px-4">
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={previewImage}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 right-4 p-3 bg-battle-orange/20 border border-battle-orange/30 rounded-lg text-battle-orange hover:bg-battle-orange/30 transition-colors flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-5 h-5" />
            <span className="text-sm uppercase">Åbn i nyt vindue</span>
          </a>
        </div>
      )}

      <div className="bg-battle-grey/20 border border-white/10 rounded-xl tablet:rounded-2xl p-4 tablet:p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
              <Download className="w-6 h-6 tablet:w-8 tablet:h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg tablet:text-xl font-bold text-white uppercase tracking-wider">
                Downloads
              </h2>
              <p className="text-xs tablet:text-sm text-purple-400 uppercase">TeamBox Filer</p>
            </div>
          </div>
          <button
            onClick={loadFiles}
            disabled={isLoading}
            className="p-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mb-6">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
            multiple
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-purple-500/30 rounded-xl text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                <span className="uppercase tracking-wider">Uploader...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span className="uppercase tracking-wider">Upload filer (JPEG, PNG, PDF)</span>
              </>
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-3">Indlæser filer...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Download className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Ingen filer uploadet endnu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-3">
            {files.map((file) => (
              <div
                key={file.name}
                className="bg-battle-black/30 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleFileClick(file)}
                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-battle-black/50 border border-white/10 flex items-center justify-center hover:border-purple-500/50 transition-colors"
                  >
                    {file.type === "image" ? (
                      <img src={file.url} alt={file.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-8 h-8 text-red-400" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <button onClick={() => handleFileClick(file)} className="text-left w-full">
                      <p className="text-white font-medium truncate hover:text-purple-400 transition-colors">
                        {getDisplayName(file.name)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {file.type === "image" ? "Billede" : "PDF"} · {formatFileSize(file.size)}
                      </p>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFileClick(file)}
                      className="p-2 bg-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
                      title={file.type === "image" ? "Vis billede" : "Åbn PDF"}
                    >
                      {file.type === "image" ? <Eye className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                    </button>
                    <a
                      href={file.url}
                      download={getDisplayName(file.name)}
                      className="p-2 bg-white/10 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/20 transition-colors"
                      title="Download"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(file.name)}
                      className="p-2 bg-white/10 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                      title="Slet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-500">
          Klik på et billede for at se det i fuld størrelse. Klik på en PDF for at åbne den.
        </div>
      </div>
    </div>
  );
};

export default TeamBoxDownloads;
