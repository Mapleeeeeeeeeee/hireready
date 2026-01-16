/**
 * Custom Next.js server with WebSocket proxy for Gemini Live API
 * API key never leaves the server - maximum security
 */

// Load environment variables before importing serverEnv
import 'dotenv/config';

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, type LiveServerMessage } from '@google/genai';
import { serverEnv } from './lib/config/server';
import { logger, configureLogger } from './lib/utils/logger';
import { isRedisAvailable, closeRedisConnection } from './lib/queue/connection';
import { closeAllQueues } from './lib/queue/queues';
import {
  startResumeParsingWorker,
  closeResumeParsingWorker,
} from './lib/queue/workers/resume-parsing.worker';
import {
  startInterviewAnalysisWorker,
  closeInterviewAnalysisWorker,
} from './lib/queue/workers/interview-analysis.worker';

// Configure logger at startup
configureLogger(serverEnv.nodeEnv);

const dev = serverEnv.nodeEnv !== 'production';
const hostname = 'localhost';
const port = serverEnv.port;

const LOG_CONTEXT = { module: 'ws-proxy', action: 'gemini' };

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active Gemini sessions
const sessions = new Map<
  WebSocket,
  {
    geminiSession: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null;
    ai: GoogleGenAI | null;
  }
>();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      logger.error('Error occurred handling request', err as Error, {
        ...LOG_CONTEXT,
        action: 'http-request',
        url: req.url,
      });
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server on /ws/gemini path
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url!, true);

    if (pathname === '/ws/gemini') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // Let other WebSocket connections pass through (e.g., Next.js HMR)
    // Don't destroy the socket - Next.js dev server will handle it
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    logger.info('Client connected', { ...LOG_CONTEXT, action: 'connection' });

    // Get API key from server environment (never sent to client!)
    const apiKey = serverEnv.geminiApiKey;
    if (!apiKey) {
      clientWs.send(JSON.stringify({ type: 'error', message: 'API key not configured' }));
      clientWs.close();
      return;
    }

    // Initialize session storage
    sessions.set(clientWs, { geminiSession: null, ai: null });

    // Handle messages from client
    clientWs.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        const sessionData = sessions.get(clientWs);

        switch (message.type) {
          case 'connect': {
            // Connect to Gemini Live API
            if (!message.model) {
              throw new Error('Model name is required');
            }

            // Log connection details including system instruction
            const systemInstruction = message.config?.systemInstruction;
            logger.debug('Connecting to Gemini', {
              ...LOG_CONTEXT,
              action: 'connect',
              model: message.model,
              responseModalities: message.config?.responseModalities,
              voiceName: message.config?.voiceName,
              hasSystemInstruction: !!systemInstruction,
              systemInstructionLength: systemInstruction?.length ?? 0,
            });

            // Log system instruction metadata (safe for production)
            if (systemInstruction) {
              logger.debug('System instruction configured', {
                ...LOG_CONTEXT,
                action: 'system-instruction',
                length: systemInstruction.length,
                hasJdContext:
                  systemInstruction.includes('目標職缺') ||
                  systemInstruction.includes('Target Position'),
                // Only log preview in development to avoid leaking sensitive JD content
                ...(dev && { preview: systemInstruction }),
              });
            }

            const ai = new GoogleGenAI({ apiKey });

            try {
              const geminiSession = await ai.live.connect({
                model: message.model,
                callbacks: {
                  onopen: () => {
                    logger.info('Connected to Gemini', { ...LOG_CONTEXT, action: 'gemini-open' });
                    clientWs.send(JSON.stringify({ type: 'connected' }));
                  },
                  onclose: (event: CloseEvent) => {
                    logger.info('Gemini connection closed', {
                      ...LOG_CONTEXT,
                      action: 'gemini-close',
                      code: event.code,
                      reason: event.reason,
                    });
                    clientWs.send(
                      JSON.stringify({
                        type: 'gemini_close',
                        code: event.code,
                        reason: event.reason,
                      })
                    );
                  },
                  onerror: (error: ErrorEvent) => {
                    logger.error('Gemini error', new Error(error.message), {
                      ...LOG_CONTEXT,
                      action: 'gemini-error',
                    });
                    clientWs.send(JSON.stringify({ type: 'error', message: error.message }));
                  },
                  onmessage: (serverMessage: LiveServerMessage) => {
                    // Forward Gemini messages to client (no per-message logging to avoid spam)
                    clientWs.send(JSON.stringify({ type: 'gemini_message', data: serverMessage }));
                  },
                },
                config: {
                  responseModalities: message.config?.responseModalities || ['AUDIO'],
                  systemInstruction: message.config?.systemInstruction
                    ? { parts: [{ text: message.config.systemInstruction }] }
                    : undefined,
                  speechConfig: message.config?.voiceName
                    ? {
                        voiceConfig: {
                          prebuiltVoiceConfig: {
                            voiceName: message.config.voiceName,
                          },
                        },
                      }
                    : undefined,
                  // Enable transcription for both input and output audio
                  inputAudioTranscription: {},
                  outputAudioTranscription: {},
                },
              });

              if (sessionData) {
                sessionData.ai = ai;
                sessionData.geminiSession = geminiSession;
              }
            } catch (error) {
              logger.error('Failed to connect to Gemini', error as Error, {
                ...LOG_CONTEXT,
                action: 'connect-error',
              });
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  message: `Failed to connect: ${(error as Error).message}`,
                })
              );
              // Clean up session on connection failure to prevent memory leak
              sessions.delete(clientWs);
              clientWs.close();
            }
            break;
          }

          case 'audio': {
            // Forward audio to Gemini
            if (sessionData?.geminiSession) {
              try {
                sessionData.geminiSession.sendRealtimeInput({
                  audio: {
                    data: message.data,
                    mimeType: message.mimeType || 'audio/pcm;rate=16000',
                  },
                });
              } catch (error) {
                // Silently ignore errors when WebSocket is closing
                const errorMsg = (error as Error).message || '';
                if (!errorMsg.includes('CLOSING') && !errorMsg.includes('CLOSED')) {
                  logger.error('Failed to send audio', error as Error, {
                    ...LOG_CONTEXT,
                    action: 'audio-send-error',
                  });
                }
              }
            }
            break;
          }

          case 'text': {
            // Forward text to Gemini
            if (sessionData?.geminiSession) {
              sessionData.geminiSession.sendClientContent({
                turns: [{ role: 'user', parts: [{ text: message.text }] }],
                turnComplete: true,
              });
            }
            break;
          }

          case 'disconnect': {
            // Close Gemini session
            if (sessionData?.geminiSession) {
              sessionData.geminiSession.close();
              sessionData.geminiSession = null;
              sessionData.ai = null;
            }
            break;
          }
        }
      } catch (error) {
        logger.error('Error processing message', error as Error, {
          ...LOG_CONTEXT,
          action: 'message-processing',
        });
      }
    });

    // Handle client disconnect
    clientWs.on('close', () => {
      logger.info('Client disconnected', { ...LOG_CONTEXT, action: 'disconnect' });
      const sessionData = sessions.get(clientWs);
      if (sessionData?.geminiSession) {
        try {
          sessionData.geminiSession.close();
        } catch {
          // Ignore close errors
        }
      }
      sessions.delete(clientWs);
    });

    clientWs.on('error', (error) => {
      logger.error('Client WebSocket error', error as Error, {
        ...LOG_CONTEXT,
        action: 'client-error',
      });
    });
  });

  server.listen(port, () => {
    logger.info(`Server ready on http://${hostname}:${port}`, {
      ...LOG_CONTEXT,
      action: 'startup',
      hostname,
      port,
    });
    logger.info(`WebSocket proxy available at ws://${hostname}:${port}/ws/gemini`, {
      ...LOG_CONTEXT,
      action: 'startup',
      wsPath: '/ws/gemini',
    });

    // Initialize background workers if Redis is available
    if (isRedisAvailable()) {
      try {
        startResumeParsingWorker();
        startInterviewAnalysisWorker();
        logger.info('Background workers started', {
          ...LOG_CONTEXT,
          action: 'workers-start',
        });
      } catch (error) {
        logger.error('Failed to start background workers', error as Error, {
          ...LOG_CONTEXT,
          action: 'workers-start-error',
        });
      }
    } else {
      logger.warn('Redis not available, background workers not started', {
        ...LOG_CONTEXT,
        action: 'workers-skip',
      });
    }
  });

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`, {
      ...LOG_CONTEXT,
      action: 'shutdown',
      signal,
    });

    // Close all client WebSocket connections
    wss.clients.forEach((client) => {
      try {
        client.close();
      } catch {
        // Ignore close errors
      }
    });

    // Close background workers
    try {
      await closeResumeParsingWorker();
      await closeInterviewAnalysisWorker();
      await closeAllQueues();
      await closeRedisConnection();
      logger.info('Background workers and queues closed', {
        ...LOG_CONTEXT,
        action: 'shutdown',
      });
    } catch (error) {
      logger.error('Error closing background workers', error as Error, {
        ...LOG_CONTEXT,
        action: 'shutdown-error',
      });
    }

    // Close HTTP server
    server.close(() => {
      logger.info('Server closed', {
        ...LOG_CONTEXT,
        action: 'shutdown-complete',
      });
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      logger.warn('Forcing exit after timeout', {
        ...LOG_CONTEXT,
        action: 'shutdown-timeout',
      });
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
});
