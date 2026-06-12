import { db } from '@/lib/db';
import { credentials, tags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Migrate credential tags from name-based to id-based.
 * Run with: npx tsx src/lib/db/migrate-tags.ts
 */
function migrateTags() {
  console.log('Starting tag migration...');

  // Get all credentials with tags
  const allCredentials = db.select().from(credentials).all();
  const credentialsWithTags = allCredentials.filter(
    (c) => c.tags && c.tags !== 'null'
  );

  if (credentialsWithTags.length === 0) {
    console.log('No credentials with tags found. Migration complete.');
    return;
  }

  console.log(`Found ${credentialsWithTags.length} credentials with tags`);

  // Extract all unique tag names
  const allTagNames = new Set<string>();
  for (const cred of credentialsWithTags) {
    try {
      const tagNames = JSON.parse(cred.tags!) as string[];
      if (Array.isArray(tagNames)) {
        tagNames.forEach((name) => allTagNames.add(name));
      }
    } catch {
      console.warn(`Failed to parse tags for credential ${cred.id}: ${cred.tags}`);
    }
  }

  console.log(`Found ${allTagNames.size} unique tags:`, Array.from(allTagNames));

  // Create tags and build name -> id mapping
  const tagNameToId = new Map<string, string>();
  const now = new Date();

  for (const name of allTagNames) {
    const id = nanoid();
    db.insert(tags).values({ id, name, createdAt: now }).execute();
    tagNameToId.set(name, id);
    console.log(`Created tag: ${name} -> ${id}`);
  }

  // Update credentials to use tag ids
  for (const cred of credentialsWithTags) {
    try {
      const tagNames = JSON.parse(cred.tags!) as string[];
      if (Array.isArray(tagNames)) {
        const tagIds = tagNames
          .map((name) => tagNameToId.get(name))
          .filter(Boolean);
        db.update(credentials)
          .set({ tags: JSON.stringify(tagIds) })
          .where(eq(credentials.id, cred.id))
          .execute();
        console.log(`Updated credential ${cred.id}: [${tagNames.join(', ')}] -> [${tagIds.join(', ')}]`);
      }
    } catch {
      console.warn(`Failed to update tags for credential ${cred.id}`);
    }
  }

  console.log('Tag migration complete!');
}

migrateTags();
