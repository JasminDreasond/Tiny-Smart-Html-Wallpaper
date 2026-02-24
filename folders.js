import { existsSync, mkdirSync } from 'fs';

export const configFolderName = 'smart-html-wallpaper-config/';

if (!existsSync(configFolderName)) mkdirSync(configFolderName);
