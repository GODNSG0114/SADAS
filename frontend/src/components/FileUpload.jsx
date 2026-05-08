import React, { useState } from 'react';
import { uploadDocument } from '../services/supabase';
import { Loader2, UploadCloud, CheckCircle, X } from 'lucide-react';

// Replaces URL input fields — uploads file to Supabase Storage and returns public URL via onChange
const FileUpload = ({ value, onChange, label }) => {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      alert('Only PNG, JPG or PDF files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5MB.');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadDocument(file);
      setFileName(file.name);
      onChange(url);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const clear = () => { setFileName(''); onChange(''); };

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      {value ? (
        <div className="flex items-center gap-2 border border-green-300 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <span className="text-sm text-green-700 truncate flex-1">{fileName || 'Uploaded'}</span>
          <a href={value} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline shrink-0">View</a>
          <button type="button" onClick={clear} className="text-gray-400 hover:text-red-500 shrink-0"><X size={14} /></button>
        </div>
      ) : (
        <label className={`flex items-center gap-2 border-2 border-dashed rounded-lg px-3 py-3 cursor-pointer transition
          ${uploading ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50'}`}>
          {uploading
            ? <><Loader2 size={16} className="animate-spin text-indigo-500" /><span className="text-sm text-indigo-500">Uploading...</span></>
            : <><UploadCloud size={16} className="text-gray-400" /><span className="text-sm text-gray-500">Click to upload PNG, JPG or PDF (max 5MB)</span></>
          }
          <input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      )}
    </div>
  );
};

export default FileUpload;
