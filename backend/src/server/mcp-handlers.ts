/**
 * MCP Protocol Request Handlers
 * Handles initialization, tool listing, tool calling, and resource management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  SERVER_INFO,
  PROTOCOL_VERSION,
  WIDGET_CONFIG,
  OPENAI_WIDGET_META,
} from '../config/constants.js';
import { PROPERTY_WIDGET_URL } from '../utils/config.js';
import { getToolDefinitions, callTool } from './tool-registry.js';

/**
 * Register all MCP request handlers on the server
 */
export function registerMCPHandlers(mcpServer: Server): void {
  // Initialize handler
  mcpServer.setRequestHandler(InitializeRequestSchema, handleInitialize);
  
  // Tool handlers
  mcpServer.setRequestHandler(ListToolsRequestSchema, handleListTools);
  mcpServer.setRequestHandler(CallToolRequestSchema, handleCallTool);
  
  // Resource handlers (widgets)
  mcpServer.setRequestHandler(ListResourcesRequestSchema, handleListResources);
  mcpServer.setRequestHandler(ReadResourceRequestSchema, handleReadResource);
}

/**
 * Handle MCP initialization request
 */
async function handleInitialize(request: any) {
  console.error('[MCP] Initialize request received'); // stderr for Claude logs
  console.log('🚀 Initialize request:', request.params.clientInfo);
  
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {},
      resources: {},
    },
    serverInfo: {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
    },
  };
}

/**
 * Handle list tools request
 */
async function handleListTools() {
  console.log('📋 tools/list request received');
  
  const tools = getToolDefinitions();
  console.log(`📋 Returning ${tools.length} tools`);
  
  return { tools };
}

/**
 * Handle call tool request
 */
async function handleCallTool(request: any, extra: any) {
  const { name, arguments: args } = request.params;
  
  // Extract userId from transport metadata
  const userId = (extra as any)?.authInfo?.userId ?? (extra as any)?.userId;
  
  console.log(`🔧 Tool call: ${name}`, { userId, args });
  
  return await callTool(name, args, userId);
}

/**
 * Handle list resources request (widget templates)
 */
async function handleListResources() {
  console.log('📦 resources/list request received');
  const resources = [];
  
  if (PROPERTY_WIDGET_URL) {
    resources.push({
      uri: WIDGET_CONFIG.property.uri,
      name: WIDGET_CONFIG.property.name,
      description: WIDGET_CONFIG.property.description,
      mimeType: WIDGET_CONFIG.property.mimeType,
      _meta: {
        'openai/widgetAccessible': OPENAI_WIDGET_META.widgetAccessible,
        'openai/resultCanProduceWidget': OPENAI_WIDGET_META.resultCanProduceWidget,
      },
    });
  }
  
  return { resources };
}

/**
 * Handle read resource request (return widget HTML)
 */
async function handleReadResource(request: any) {
  console.log('📖 resources/read request:', request.params.uri);
  
  let widgetHtml: string;
  let widgetUrl: string | null;
  let widgetDescription: string;
  
  if (request.params.uri.startsWith(WIDGET_CONFIG.property.uri)) {
    if (!PROPERTY_WIDGET_URL) {
      throw new Error('Property widget URL not configured');
    }
    widgetUrl = PROPERTY_WIDGET_URL;
    widgetDescription = WIDGET_CONFIG.property.widgetDescription;
    widgetHtml = `
<div id="${WIDGET_CONFIG.property.rootElementId}"></div>
<script type="module" src="${PROPERTY_WIDGET_URL}"></script>
    `.trim();
  } else {
    throw new Error(`Unknown resource: ${request.params.uri}`);
  }

  console.log('📖 Returning widget HTML:', {
    uri: request.params.uri,
    widgetUrl,
    htmlLength: widgetHtml.length,
  });

  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: 'text/html+skybridge',
        text: widgetHtml,
        _meta: {
          'openai/widgetAccessible': OPENAI_WIDGET_META.widgetAccessible,
          'openai/resultCanProduceWidget': OPENAI_WIDGET_META.resultCanProduceWidget,
          'openai/widgetDescription': widgetDescription,
        },
      },
    ],
  };
}

