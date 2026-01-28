import { createAdminClient } from '@/lib/supabase/client';
import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface ApiLogEntry {
    requestId: string;
    timestamp: string;
    level: LogLevel;
    apiKeyId?: string;
    userId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    userAgent?: string;
    ip?: string;
    tier?: string;
    error?: {
        code: string;
        message: string;
        stack?: string;
    };
    metadata?: Record<string, any>;
}

export interface LogOptions {
    writeToFile?: boolean;
    writeToDatabase?: boolean;
    writeToConsole?: boolean;
}

const DEFAULT_OPTIONS: LogOptions = {
    writeToFile: true,
    writeToDatabase: true,
    writeToConsole: process.env.NODE_ENV !== 'production',
};

export class ApiLoggerService {
    private static get supabase() {
        return createAdminClient();
    }

    private static logsDir = path.join(process.cwd(), 'logs');
    private static maxLogAgeDays = 30;

    /**
     * Initialize the logs directory
     */
    private static ensureLogsDir(): void {
        try {
            if (!fs.existsSync(this.logsDir)) {
                fs.mkdirSync(this.logsDir, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to create logs directory:', error);
        }
    }

    /**
     * Get the current log file path based on date
     */
    private static getLogFilePath(isError: boolean = false): string {
        const date = new Date().toISOString().split('T')[0];
        return path.join(
            this.logsDir,
            isError ? 'api-errors.log' : `api-${date}.log`
        );
    }

    /**
     * Format a log entry as a JSON line
     */
    private static formatLogLine(entry: ApiLogEntry): string {
        return JSON.stringify(entry) + '\n';
    }

    /**
     * Write log entry to file
     */
    private static async writeToFile(entry: ApiLogEntry): Promise<void> {
        try {
            // Ensure logs directory exists
            if (!fs.existsSync(this.logsDir)) {
                fs.mkdirSync(this.logsDir, { recursive: true });
                console.log(`Created logs directory: ${this.logsDir}`);
            }

            const logLine = this.formatLogLine(entry);
            const logFilePath = this.getLogFilePath();

            fs.appendFileSync(logFilePath, logLine, { encoding: 'utf8' });

            // Also write errors to a separate file
            if (entry.level === 'ERROR') {
                const errorLogPath = this.getLogFilePath(true);
                fs.appendFileSync(errorLogPath, logLine, { encoding: 'utf8' });
            }
        } catch (error) {
            // Log the actual error for debugging
            console.error('Failed to write to log file:', error);
            console.error('Attempted to write to:', this.logsDir);
        }
    }

    /**
     * Write log entry to database
     */
    private static async writeToDatabase(entry: ApiLogEntry): Promise<void> {
        try {
            if (!entry.apiKeyId) return;

            await this.supabase.from('api_usage').insert({
                api_key_id: entry.apiKeyId,
                endpoint: entry.endpoint,
                method: entry.method,
                status_code: entry.statusCode,
                response_time_ms: entry.responseTimeMs,
                request_id: entry.requestId,
            });
        } catch (error) {
            console.error('Failed to write to database:', error);
        }
    }

    /**
     * Write log entry to console with color coding
     */
    private static writeToConsole(entry: ApiLogEntry): void {
        const levelColors: Record<LogLevel, string> = {
            DEBUG: '\x1b[36m', // Cyan
            INFO: '\x1b[32m',  // Green
            WARN: '\x1b[33m',  // Yellow
            ERROR: '\x1b[31m', // Red
        };
        const reset = '\x1b[0m';

        const color = levelColors[entry.level];
        const statusColor = entry.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';

        console.log(
            `${color}[${entry.level}]${reset} ` +
            `${entry.timestamp} ` +
            `${entry.method} ${entry.endpoint} ` +
            `${statusColor}${entry.statusCode}${reset} ` +
            `${entry.responseTimeMs}ms ` +
            `(${entry.requestId})`
        );

        if (entry.error) {
            console.error(`  Error: ${entry.error.code} - ${entry.error.message}`);
        }
    }

    /**
     * Main logging method
     */
    static async log(
        entry: Omit<ApiLogEntry, 'timestamp'>,
        options: LogOptions = DEFAULT_OPTIONS
    ): Promise<void> {
        const fullEntry: ApiLogEntry = {
            ...entry,
            timestamp: new Date().toISOString(),
        };

        const opts = { ...DEFAULT_OPTIONS, ...options };

        // Run logging operations in parallel
        const promises: Promise<void>[] = [];

        if (opts.writeToFile) {
            promises.push(this.writeToFile(fullEntry));
        }

        if (opts.writeToDatabase) {
            promises.push(this.writeToDatabase(fullEntry));
        }

        if (opts.writeToConsole) {
            this.writeToConsole(fullEntry);
        }

        await Promise.allSettled(promises);
    }

    /**
     * Log a successful API request
     */
    static async logRequest(params: {
        requestId: string;
        apiKeyId?: string;
        userId?: string;
        endpoint: string;
        method: string;
        statusCode: number;
        responseTimeMs: number;
        tier?: string;
        userAgent?: string;
        ip?: string;
        metadata?: Record<string, any>;
    }): Promise<void> {
        await this.log({
            ...params,
            level: params.statusCode >= 400 ? 'ERROR' : 'INFO',
        });
    }

    /**
     * Log an API error
     */
    static async logError(params: {
        requestId: string;
        apiKeyId?: string;
        userId?: string;
        endpoint: string;
        method: string;
        statusCode: number;
        responseTimeMs: number;
        error: Error | { code: string; message: string };
        tier?: string;
        userAgent?: string;
        ip?: string;
    }): Promise<void> {
        const errorInfo = params.error instanceof Error
            ? {
                code: 'INTERNAL_ERROR',
                message: params.error.message,
                stack: params.error.stack,
            }
            : params.error;

        await this.log({
            ...params,
            level: 'ERROR',
            error: errorInfo,
        });
    }

    /**
     * Clean up old log files
     */
    static async cleanupOldLogs(): Promise<void> {
        try {
            this.ensureLogsDir();

            const files = fs.readdirSync(this.logsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.maxLogAgeDays);

            for (const file of files) {
                // Skip errors log file
                if (file === 'api-errors.log') continue;

                // Extract date from filename (api-YYYY-MM-DD.log)
                const match = file.match(/api-(\d{4}-\d{2}-\d{2})\.log/);
                if (match) {
                    const fileDate = new Date(match[1]);
                    if (fileDate < cutoffDate) {
                        const filePath = path.join(this.logsDir, file);
                        fs.unlinkSync(filePath);
                        console.log(`Deleted old log file: ${file}`);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to cleanup old logs:', error);
        }
    }

    /**
     * Get recent logs from database
     */
    static async getRecentLogs(
        apiKeyId?: string,
        limit: number = 100
    ): Promise<any[]> {
        try {
            let query = this.supabase
                .from('api_usage')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (apiKeyId) {
                query = query.eq('api_key_id', apiKeyId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Failed to get recent logs:', error);
            return [];
        }
    }
}
