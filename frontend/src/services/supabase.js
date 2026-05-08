import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aekbtlairbzexylzrcsh.supabase.co';
const supabaseAnonKey = 'sb_publishable_4dGT6Gqq4jfwIGfvPE6_qw_MJPNsyOv';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Upload a file to Supabase Storage, returns public URL
export const uploadDocument = async (file, folder = 'documents') => {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('student-documents')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from('student-documents')
    .getPublicUrl(fileName);

  return data.publicUrl;
};
