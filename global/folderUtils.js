import { mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';

/**
 * Ensures that a directory exists. If it doesn't, it creates it.
 * @param {string} path 
 * @returns {Promise<void>}
 */
export async function ensureDirectoryExists(path) {
    try {
        // Check if the directory exists
        await access(path, constants.F_OK);
    } catch {
        // If access fails, it means the directory doesn't exist, so we create it
        await mkdir(path, { recursive: true });
    }
}
