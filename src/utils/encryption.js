// src/utils/encryption.js
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Ensure you have a 32-byte hex string in your .env: ENCRYPTION_SECRET_KEY
const SECRET_KEY = Buffer.from(process.env.ENCRYPTION_SECRET_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const IV_LENGTH = 16; // For AES, this is always 16 bytes

export const encryptData = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedText
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decryptData = (hash) => {
    if (!hash) return null;
    const parts = hash.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', SECRET_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};