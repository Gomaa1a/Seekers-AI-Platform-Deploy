import { db, logger } from '../config';
import { countWords } from '../utils/helpers';
import {
  KnowledgeBase,
  KnowledgeBaseHistory,
  CreateKnowledgeBaseInput,
  UpdateKnowledgeBaseInput,
} from '../types';

export class KnowledgeBaseService {
  /**
   * Create a new knowledge base
   */
  async create(
    organizationId: string,
    userId: string,
    input: CreateKnowledgeBaseInput
  ): Promise<KnowledgeBase> {
    const wordCount = countWords(input.content);

    const result = await db.queryOne<KnowledgeBase>(
      `INSERT INTO knowledge_bases 
       (organization_id, name, description, type, content, content_format, word_count, last_updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        organizationId,
        input.name,
        input.description || null,
        input.type,
        input.content,
        input.contentFormat || 'text',
        wordCount,
        userId,
      ]
    );

    if (!result) {
      throw new Error('Failed to create knowledge base');
    }

    // Update organization onboarding status
    await db.query(
      'UPDATE organizations SET knowledge_base_added = true WHERE id = $1',
      [organizationId]
    );

    logger.info('Knowledge base created', {
      id: result.id,
      organizationId,
      type: input.type,
      wordCount,
    });

    return result;
  }

  /**
   * Update a knowledge base
   */
  async update(
    id: string,
    organizationId: string,
    userId: string,
    input: UpdateKnowledgeBaseInput
  ): Promise<KnowledgeBase> {
    // Get current knowledge base
    const current = await this.getById(id, organizationId);

    if (!current) {
      throw new Error('Knowledge base not found');
    }

    // If content is being updated, save history
    if (input.content && input.content !== current.content) {
      await db.query(
        `INSERT INTO knowledge_base_history 
         (knowledge_base_id, content, version, changed_by, change_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, current.content, current.version, userId, input.changeReason || null]
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }

    if (input.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(input.content);
      updates.push(`word_count = $${paramIndex++}`);
      values.push(countWords(input.content));
      updates.push(`version = version + 1`);
    }

    if (input.contentFormat !== undefined) {
      updates.push(`content_format = $${paramIndex++}`);
      values.push(input.contentFormat);
    }

    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }

    updates.push(`last_updated_by = $${paramIndex++}`);
    values.push(userId);

    values.push(id);
    values.push(organizationId);

    const result = await db.queryOne<KnowledgeBase>(
      `UPDATE knowledge_bases 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!result) {
      throw new Error('Failed to update knowledge base');
    }

    logger.info('Knowledge base updated', {
      id,
      organizationId,
      updatedFields: Object.keys(input),
    });

    return result;
  }

  /**
   * Get knowledge base by ID
   */
  async getById(id: string, organizationId: string): Promise<KnowledgeBase | null> {
    return db.queryOne<KnowledgeBase>(
      'SELECT * FROM knowledge_bases WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
  }

  /**
   * Get all knowledge bases for an organization
   */
  async getAll(organizationId: string): Promise<KnowledgeBase[]> {
    return db.queryAll<KnowledgeBase>(
      `SELECT * FROM knowledge_bases 
       WHERE organization_id = $1 
       ORDER BY type, name`,
      [organizationId]
    );
  }

  /**
   * Get knowledge bases by type
   */
  async getByType(
    organizationId: string,
    type: 'chatbot' | 'comments'
  ): Promise<KnowledgeBase[]> {
    return db.queryAll<KnowledgeBase>(
      `SELECT * FROM knowledge_bases 
       WHERE organization_id = $1 AND type = $2 AND is_active = true
       ORDER BY name`,
      [organizationId, type]
    );
  }

  /**
   * Get active knowledge base for a type (first active one)
   */
  async getActiveByType(
    organizationId: string,
    type: 'chatbot' | 'comments'
  ): Promise<KnowledgeBase | null> {
    return db.queryOne<KnowledgeBase>(
      `SELECT * FROM knowledge_bases 
       WHERE organization_id = $1 AND type = $2 AND is_active = true
       ORDER BY updated_at DESC
       LIMIT 1`,
      [organizationId, type]
    );
  }

  /**
   * Toggle knowledge base active status
   */
  async toggle(id: string, organizationId: string, isActive: boolean): Promise<KnowledgeBase> {
    const result = await db.queryOne<KnowledgeBase>(
      `UPDATE knowledge_bases SET is_active = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [isActive, id, organizationId]
    );

    if (!result) {
      throw new Error('Knowledge base not found');
    }

    logger.info('Knowledge base toggled', { id, isActive });
    return result;
  }

  /**
   * Delete a knowledge base
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM knowledge_bases WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (result.rowCount === 0) {
      throw new Error('Knowledge base not found');
    }

    logger.info('Knowledge base deleted', { id, organizationId });
  }

  /**
   * Get version history for a knowledge base
   */
  async getHistory(
    id: string,
    organizationId: string
  ): Promise<KnowledgeBaseHistory[]> {
    // First verify the KB belongs to the organization
    const kb = await this.getById(id, organizationId);
    if (!kb) {
      throw new Error('Knowledge base not found');
    }

    return db.queryAll<KnowledgeBaseHistory>(
      `SELECT kbh.*, u.full_name as changed_by_name
       FROM knowledge_base_history kbh
       LEFT JOIN users u ON u.id = kbh.changed_by
       WHERE kbh.knowledge_base_id = $1
       ORDER BY kbh.version DESC`,
      [id]
    );
  }

  /**
   * Restore a previous version
   */
  async restoreVersion(
    id: string,
    organizationId: string,
    userId: string,
    version: number
  ): Promise<KnowledgeBase> {
    // Get the version to restore
    const history = await db.queryOne<KnowledgeBaseHistory>(
      `SELECT * FROM knowledge_base_history 
       WHERE knowledge_base_id = $1 AND version = $2`,
      [id, version]
    );

    if (!history) {
      throw new Error('Version not found');
    }

    // Update with the old content
    return this.update(id, organizationId, userId, {
      content: history.content,
      changeReason: `Restored from version ${version}`,
    });
  }

  /**
   * Get knowledge base stats for an organization
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    chatbot: number;
    comments: number;
    totalWords: number;
  }> {
    const result = await db.queryOne<{
      total: string;
      chatbot: string;
      comments: string;
      total_words: string;
    }>(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE type = 'chatbot') as chatbot,
         COUNT(*) FILTER (WHERE type = 'comments') as comments,
         COALESCE(SUM(word_count), 0) as total_words
       FROM knowledge_bases
       WHERE organization_id = $1`,
      [organizationId]
    );

    return {
      total: parseInt(result?.total || '0'),
      chatbot: parseInt(result?.chatbot || '0'),
      comments: parseInt(result?.comments || '0'),
      totalWords: parseInt(result?.total_words || '0'),
    };
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
export default knowledgeBaseService;
