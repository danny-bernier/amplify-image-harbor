/**
 * @fileoverview Centralized logging utility
 * Provides structured logging with different levels for development and production
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

/**
 * Enumeration of logging levels in order of severity
 * Lower numbers indicate higher priority/severity
 */
export enum LogLevel {
    /** Critical errors that require immediate attention */
    ERROR = 0,
    /** Warning messages for potentially problematic situations */
    WARN = 1,
    /** General informational messages about application flow */
    INFO = 2,
    /** Detailed debugging information for development */
    DEBUG = 3
}

/**
 * Interface for additional contextual information to include with log messages
 * Allows for structured logging with metadata
 */
export interface LogContext {
    /** Component or service name generating the log */
    component?: string;
    /** User identifier associated with the log event */
    userId?: string;
    /** Unique request identifier for tracing */
    requestId?: string;
    /** Additional context properties as key-value pairs */
    [key: string]: any;
}

/**
 * Centralized logging utility class providing structured logging capabilities
 * Supports different log levels and environment-aware logging (development vs production)
 */
class Logger {
    /** Flag indicating if running in development environment */
    private isDev = process.env.NODE_ENV === 'development';
    /** Current log level threshold - DEBUG in dev, INFO in production */
    private logLevel = this.isDev ? LogLevel.DEBUG : LogLevel.INFO;

    /**
     * Format a log message with timestamp, level, component, and optional context
     * @param level - The log level string (e.g., 'ERROR', 'DEBUG')
     * @param component - The component name generating the log
     * @param message - The main log message
     * @param context - Optional contextual metadata to include
     * @returns Formatted log message string with consistent structure
     */
    private formatMessage(level: string, component: string, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level}] [${component}]${contextStr} ${message}`;
    }

    /**
     * Core logging method that handles message formatting and output
     * Respects log level threshold and routes to appropriate console method
     * @param level - The LogLevel enum value for this message
     * @param levelName - Human-readable level name for display
     * @param component - Component name generating the log
     * @param message - The main log message
     * @param data - Additional data objects to log
     * @param context - Optional contextual metadata
     */
    private log(level: LogLevel, levelName: string, component: string, message: string, data?: any[], context?: LogContext): void {
        if (level > this.logLevel) return;

        const formattedMessage = this.formatMessage(levelName, component, message, context);

        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedMessage, ...(data || []));
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage, ...(data || []));
                break;
            case LogLevel.INFO:
                console.info(formattedMessage, ...(data || []));
                break;
            case LogLevel.DEBUG:
                console.log(formattedMessage, ...(data || []));
                break;
        }
    }

    // Production logging methods (always available)

    /**
     * Log an error message - always output regardless of environment
     * Use for critical errors that need attention in production
     * @param component - Component name generating the error
     * @param message - Error message describing what went wrong
     * @param data - Additional error data, stack traces, etc.
     */
    error(component: string, message: string, ...data: any[]): void;
    /**
     * Log an error message with contextual metadata
     * @param component - Component name generating the error
     * @param message - Error message describing what went wrong  
     * @param context - Contextual metadata (userId, requestId, etc.)
     * @param data - Additional error data, stack traces, etc.
     */
    error(component: string, message: string, context: LogContext, ...data: any[]): void;
    error(component: string, message: string, contextOrData?: LogContext | any, ...data: any[]): void {
        const isContext = contextOrData && typeof contextOrData === 'object' && !Array.isArray(contextOrData);
        const context = isContext ? contextOrData as LogContext : undefined;
        const allData = isContext ? data : [contextOrData, ...data];
        this.log(LogLevel.ERROR, 'ERROR', component, message, allData, context);
    }

    /**
     * Log a warning message - output in production for important warnings
     * Use for potentially problematic situations that don't stop execution
     * @param component - Component name generating the warning
     * @param message - Warning message describing the situation
     * @param data - Additional warning data for debugging
     */
    warn(component: string, message: string, ...data: any[]): void;
    /**
     * Log a warning message with contextual metadata
     * @param component - Component name generating the warning
     * @param message - Warning message describing the situation
     * @param context - Contextual metadata (userId, requestId, etc.)
     * @param data - Additional warning data for debugging
     */
    warn(component: string, message: string, context: LogContext, ...data: any[]): void;
    warn(component: string, message: string, contextOrData?: LogContext | any, ...data: any[]): void {
        const isContext = contextOrData && typeof contextOrData === 'object' && !Array.isArray(contextOrData);
        const context = isContext ? contextOrData as LogContext : undefined;
        const allData = isContext ? data : [contextOrData, ...data];
        this.log(LogLevel.WARN, 'WARN', component, message, allData, context);
    }

    /**
     * Log an informational message - output in production for important events
     * Use for significant application events, successful operations, etc.
     * @param component - Component name generating the info message
     * @param message - Informational message about application state/events
     * @param data - Additional data related to the event
     */
    info(component: string, message: string, ...data: any[]): void;
    /**
     * Log an informational message with contextual metadata
     * @param component - Component name generating the info message
     * @param message - Informational message about application state/events
     * @param context - Contextual metadata (userId, requestId, etc.)
     * @param data - Additional data related to the event
     */
    info(component: string, message: string, context: LogContext, ...data: any[]): void;
    info(component: string, message: string, contextOrData?: LogContext | any, ...data: any[]): void {
        const isContext = contextOrData && typeof contextOrData === 'object' && !Array.isArray(contextOrData);
        const context = isContext ? contextOrData as LogContext : undefined;
        const allData = isContext ? data : [contextOrData, ...data];
        this.log(LogLevel.INFO, 'INFO', component, message, allData, context);
    }

    /**
     * Log a debug message - only output in development environment
     * Use for detailed debugging information during development
     * @param component - Component name generating the debug message
     * @param message - Detailed debug information
     * @param data - Debug data, variable values, state information
     */
    debug(component: string, message: string, ...data: any[]): void;
    /**
     * Log a debug message with contextual metadata
     * @param component - Component name generating the debug message
     * @param message - Detailed debug information
     * @param context - Contextual metadata (userId, requestId, etc.)
     * @param data - Debug data, variable values, state information
     */
    debug(component: string, message: string, context: LogContext, ...data: any[]): void;
    debug(component: string, message: string, contextOrData?: LogContext | any, ...data: any[]): void {
        const isContext = contextOrData && typeof contextOrData === 'object' && !Array.isArray(contextOrData);
        const context = isContext ? contextOrData as LogContext : undefined;
        const allData = isContext ? data : [contextOrData, ...data];
        this.log(LogLevel.DEBUG, 'DEBUG', component, message, allData, context);
    }

    // Development-only logging methods (only log in development)

    /**
     * Log an error message only in development environment
     * Use for debugging errors that should not appear in production logs
     * @param component - Component name generating the error
     * @param message - Error message for development debugging
     * @param data - Additional error data, stack traces, debug info
     */
    devError(component: string, message: string, ...data: any[]): void;
    /**
     * Log a development error message with contextual metadata
     * @param component - Component name generating the error
     * @param message - Error message for development debugging
     * @param context - Contextual metadata for debugging
     * @param data - Additional error data, stack traces, debug info
     */
    devError(component: string, message: string, context: LogContext, ...data: any[]): void;
    devError(component: string, message: string, contextOrData?: LogContext | any, ...data: any[]): void {
        if (!this.isDev) return;
        const isContext = contextOrData && typeof contextOrData === 'object' && !Array.isArray(contextOrData);
        const context = isContext ? contextOrData as LogContext : undefined;
        const allData = isContext ? data : [contextOrData, ...data];
        this.log(LogLevel.ERROR, 'DEV-ERROR', component, message, allData, context);
    }

    /**
     * Log a warning message only in development environment
     * Use for debugging warnings that should not appear in production logs
     * @param component - Component name generating the warning
     * @param message - Warning message for development debugging
     * @param data - Additional warning data for debugging
     */
    devWarn(component: string, message: string, ...data: any[]): void;
    /**
     * Log a development warning message with contextual metadata
     * @param component - Component name generating the warning
     * @param message - Warning message for development debugging
     * @param context - Contextual metadata for debugging
     * @param data - Additional warning data for debugging
     */
    devWarn(component: string, message: string, context: LogContext, ...data: any[]): void;
    devWarn(component: string, message: string, contextOrData?: LogContext | any, ...data: any[]): void {
        if (!this.isDev) return;
        const isContext = contextOrData && typeof contextOrData === 'object' && !Array.isArray(contextOrData);
        const context = isContext ? contextOrData as LogContext : undefined;
        const allData = isContext ? data : [contextOrData, ...data];
        this.log(LogLevel.WARN, 'DEV-WARN', component, message, allData, context);
    }

    /**
     * Log an informational message only in development environment
     * Use for development-specific information that aids debugging
     * @param component - Component name generating the info message
     * @param message - Informational message for development
     * @param data - Additional data related to development events
     */
    devInfo(component: string, message: string, ...data: any[]): void;
    /**
     * Log a development info message with contextual metadata
     * @param component - Component name generating the info message
     * @param message - Informational message for development
     * @param context - Contextual metadata for development debugging
     * @param data - Additional data related to development events
     */
    devInfo(component: string, message: string, context: LogContext, ...data: any[]): void;
    devInfo(component: string, message: string, contextOrData?: LogContext | any, ...data: any[]): void {
        if (!this.isDev) return;
        const isContext = contextOrData && typeof contextOrData === 'object' && !Array.isArray(contextOrData);
        const context = isContext ? contextOrData as LogContext : undefined;
        const allData = isContext ? data : [contextOrData, ...data];
        this.log(LogLevel.INFO, 'DEV-INFO', component, message, allData, context);
    }

    /**
     * Log a debug message only in development environment
     * Use for detailed debugging information during development
     * @param component - Component name generating the debug message
     * @param message - Detailed debug information for development
     * @param data - Debug data, variable values, state information
     */
    devDebug(component: string, message: string, ...data: any[]): void;
    /**
     * Log a development debug message with contextual metadata
     * @param component - Component name generating the debug message
     * @param message - Detailed debug information for development
     * @param context - Contextual metadata for development debugging
     * @param data - Debug data, variable values, state information
     */
    devDebug(component: string, message: string, context: LogContext, ...data: any[]): void;
    devDebug(component: string, message: string, contextOrData?: LogContext | any, ...data: any[]): void {
        if (!this.isDev) return;
        const isContext = contextOrData && typeof contextOrData === 'object' && !Array.isArray(contextOrData);
        const context = isContext ? contextOrData as LogContext : undefined;
        const allData = isContext ? data : [contextOrData, ...data];
        this.log(LogLevel.DEBUG, 'DEV-DEBUG', component, message, allData, context);
    }

    /**
     * Create a component-specific logger with pre-bound component name
     * Simplifies logging by automatically including the component name in all log calls
     * @param componentName - Name of the component/service for all subsequent log calls
     * @returns Object with logging methods that automatically include the component name
     * @example
     * ```typescript
     * const log = logger.forComponent('UserService');
     * log.error('Failed to create user'); // Automatically includes 'UserService' as component
     * log.devDebug('User data:', userData);
     * ```
     */
    forComponent(componentName: string) {
        return {
            /** Log production error with pre-bound component name */
            error: (message: string, ...data: any[]) => this.error(componentName, message, ...data),
            /** Log production warning with pre-bound component name */
            warn: (message: string, ...data: any[]) => this.warn(componentName, message, ...data),
            /** Log production info with pre-bound component name */
            info: (message: string, ...data: any[]) => this.info(componentName, message, ...data),
            /** Log production debug with pre-bound component name */
            debug: (message: string, ...data: any[]) => this.debug(componentName, message, ...data),
            /** Log development error with pre-bound component name */
            devError: (message: string, ...data: any[]) => this.devError(componentName, message, ...data),
            /** Log development warning with pre-bound component name */
            devWarn: (message: string, ...data: any[]) => this.devWarn(componentName, message, ...data),
            /** Log development info with pre-bound component name */
            devInfo: (message: string, ...data: any[]) => this.devInfo(componentName, message, ...data),
            /** Log development debug with pre-bound component name */
            devDebug: (message: string, ...data: any[]) => this.devDebug(componentName, message, ...data),
        };
    }
}

/**
 * Singleton logger instance for application-wide use
 * Use this instance directly or create component-specific loggers with forComponent()
 * @example
 * ```typescript
 * import { logger } from '@/utils/logger';
 * logger.error('MyComponent', 'Something went wrong');
 * 
 * // Or create component-specific logger
 * const log = logger.forComponent('MyComponent');
 * log.error('Something went wrong');
 * ```
 */
export const logger = new Logger();

/**
 * Convenience functions for direct import and use
 * These require specifying the component name with each call
 * @example
 * ```typescript
 * import { error, devDebug } from '@/utils/logger';
 * error('MyComponent', 'Critical error occurred');
 * devDebug('MyComponent', 'Debug info:', debugData);
 * ```
 */
export const { error, warn, info, debug, devError, devWarn, devInfo, devDebug } = logger;