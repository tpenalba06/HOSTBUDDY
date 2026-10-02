import type { ExtractionResult } from "@/lib/import-engine/types";
import type { IntegrationDefinition, IntegrationId } from "./registry";

export interface ExternalPropertySummary {
  externalId: string;
  name: string;
  address?: string;
  imageUrl?: string;
}

export interface ConnectorContext {
  organizationId: string;
  userId: string;
}

export type ConnectionHealth =
  { ok: true } | { ok: false; reason: "not_connected" | "expired" | "unavailable" };

/**
 * Provider boundary for future official PMS/OTA connections. Imported data must
 * always return the Universal Import Engine shape so provenance and human
 * overrides continue to work exactly as they do for URL and text imports.
 */
export interface PropertyConnector {
  id: IntegrationId;
  definition: IntegrationDefinition;
  authorize(context: ConnectorContext): Promise<{ redirectUrl: string }>;
  testConnection(context: ConnectorContext): Promise<ConnectionHealth>;
  listProperties(context: ConnectorContext): Promise<ExternalPropertySummary[]>;
  importProperty(context: ConnectorContext, externalId: string): Promise<ExtractionResult>;
  importProperties(context: ConnectorContext, externalIds: string[]): Promise<ExtractionResult[]>;
  disconnect(context: ConnectorContext): Promise<void>;
}

export class ConnectorNotAvailableError extends Error {
  constructor() {
    super("Cette connexion n'est pas encore disponible.");
  }
}

/** Explicit stub: no provider can appear connected until its real adapter exists. */
export const createPlannedConnector = (definition: IntegrationDefinition): PropertyConnector => ({
  id: definition.id as IntegrationId,
  definition,
  authorize: async () => {
    throw new ConnectorNotAvailableError();
  },
  testConnection: async () => ({ ok: false, reason: "unavailable" }),
  listProperties: async () => {
    throw new ConnectorNotAvailableError();
  },
  importProperty: async () => {
    throw new ConnectorNotAvailableError();
  },
  importProperties: async () => {
    throw new ConnectorNotAvailableError();
  },
  disconnect: async () => {
    throw new ConnectorNotAvailableError();
  },
});
