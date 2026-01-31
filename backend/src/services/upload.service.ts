import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { config } from '../config/environment';
import { db, logger } from '../config';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class UploadService {
  private storage: Storage | null = null;
  private bucketName: string;

  constructor() {
    this.bucketName = config.gcs.bucket || '';

    if (config.gcs.projectId) {
      const opts: ConstructorParameters<typeof Storage>[0] = {
        projectId: config.gcs.projectId,
      };
      if (config.gcs.keyFile) {
        opts.keyFilename = config.gcs.keyFile;
      }
      this.storage = new Storage(opts);
    }
  }

  private ensureConfigured(): void {
    if (!this.storage || !this.bucketName) {
      throw new Error('GCP Cloud Storage is not configured');
    }
  }

  async uploadFile(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    organizationId: string,
    knowledgeBaseId: string,
    userId: string
  ): Promise<{
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }> {
    this.ensureConfigured();

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed. Allowed: PDF, DOC, DOCX, TXT, CSV, JSON`);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const ext = path.extname(file.originalname);
    const storedFilename = `${uuidv4()}${ext}`;
    const gcsPath = `kb/${organizationId}/${knowledgeBaseId}/${storedFilename}`;

    const bucket = this.storage!.bucket(this.bucketName);
    const blob = bucket.file(gcsPath);

    await blob.save(file.buffer, {
      contentType: file.mimetype,
      metadata: {
        organizationId,
        knowledgeBaseId,
        originalFilename: file.originalname,
      },
    });

    const gcsUrl = `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`;

    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO kb_attachments
       (knowledge_base_id, organization_id, filename, original_filename, mime_type, size_bytes, gcs_path, gcs_url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [knowledgeBaseId, organizationId, storedFilename, file.originalname, file.mimetype, file.size, gcsPath, gcsUrl, userId]
    );

    logger.info('File uploaded to GCS', {
      attachmentId: result!.id,
      knowledgeBaseId,
      organizationId,
      filename: file.originalname,
      size: file.size,
    });

    return {
      id: result!.id,
      filename: file.originalname,
      url: gcsUrl,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async deleteFile(attachmentId: string, organizationId: string): Promise<void> {
    this.ensureConfigured();

    const attachment = await db.queryOne<{ gcs_path: string }>(
      `SELECT gcs_path FROM kb_attachments WHERE id = $1 AND organization_id = $2`,
      [attachmentId, organizationId]
    );

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    const bucket = this.storage!.bucket(this.bucketName);
    await bucket.file(attachment.gcs_path).delete().catch((err: any) => {
      logger.warn('Failed to delete file from GCS', { attachmentId, error: err.message });
    });

    await db.query(
      `DELETE FROM kb_attachments WHERE id = $1 AND organization_id = $2`,
      [attachmentId, organizationId]
    );

    logger.info('File deleted', { attachmentId, organizationId });
  }

  async getAttachments(
    knowledgeBaseId: string,
    organizationId: string
  ): Promise<Array<{ id: string; filename: string; url: string; size: number; mimeType: string; createdAt: Date }>> {
    const rows = await db.queryAll<{
      id: string;
      original_filename: string;
      gcs_url: string;
      size_bytes: string;
      mime_type: string;
      created_at: Date;
    }>(
      `SELECT id, original_filename, gcs_url, size_bytes, mime_type, created_at
       FROM kb_attachments
       WHERE knowledge_base_id = $1 AND organization_id = $2
       ORDER BY created_at DESC`,
      [knowledgeBaseId, organizationId]
    );

    return rows.map(r => ({
      id: r.id,
      filename: r.original_filename,
      url: r.gcs_url,
      size: parseInt(r.size_bytes),
      mimeType: r.mime_type,
      createdAt: r.created_at,
    }));
  }

  async getSignedUrl(attachmentId: string, organizationId: string): Promise<string> {
    this.ensureConfigured();

    const attachment = await db.queryOne<{ gcs_path: string }>(
      `SELECT gcs_path FROM kb_attachments WHERE id = $1 AND organization_id = $2`,
      [attachmentId, organizationId]
    );

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    const [url] = await this.storage!.bucket(this.bucketName)
      .file(attachment.gcs_path)
      .getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

    return url;
  }
}

export const uploadService = new UploadService();
export default uploadService;
