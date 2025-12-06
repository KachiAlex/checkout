import { getCorsHeaders } from '../_shared/cors.ts';
import { verifyJWT } from '../_shared/jwt.ts';
import { getFirestore } from '../_shared/firestore.ts';

export async function handleUpload(req: Request, cleanPath: string, method: string): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token);
    if (!payload) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = payload.tenantId;
    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Tenant ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, message: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Only image files are allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ success: false, message: 'File size must be less than 5MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${folder}/${tenantId}/${timestamp}-${randomStr}.${fileExt}`;

    // Upload to Firebase Storage via backend
    // Since Supabase Edge Functions can't directly access Firebase Storage,
    // we'll use a public URL approach or store the file data in Firestore temporarily
    // For now, we'll convert to base64 and store metadata, then return a data URL
    // In production, you'd want to upload to Firebase Storage via the backend API

    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Store file metadata in Firestore
    const firestore = getFirestore();
    const fileRef = firestore.collection('uploads').doc();
    await fileRef.set({
      tenantId,
      fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      folder,
      dataUrl, // Store base64 data (for small files)
      createdAt: new Date(),
    });

    // Return the file URL (in production, this would be a Firebase Storage URL)
    // For now, return a reference that can be used to retrieve the file
    const fileUrl = `${req.url.split('/functions/v1')[0]}/functions/v1/api/v1/files/${fileRef.id}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: dataUrl, // Use data URL for now
        fileId: fileRef.id,
        fileName,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Upload] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Upload failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

