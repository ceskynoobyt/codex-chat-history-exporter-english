import type { ExportSectionDefinition, ExportSectionId } from "./types";

const SECTION_DEFINITIONS: ExportSectionDefinition[] = [
  {
    id: "transcript",
    label: "Chat body and images",
    rawFieldNames: ["user_message", "response_item.message", "input_image"],
    shortDescription: "User messages and assistant replies visible in the client, plus images inserted in place.",
    longDescription:
      "Exports the chat body, user images and assistant replies that the client shows directly. You can include message timestamps or trim the body to a time range.",
    visibility: "visible"
  },
  {
    id: "session_meta",
    label: "Basic session info",
    rawFieldNames: ["session_meta"],
    shortDescription: "Basic metadata such as session source, time, working directory and original file path.",
    longDescription: "Identifies where this session came from, when it was created and which file holds the original log, for archiving, searching and tracing.",
    visibility: "hidden"
  },
  {
    id: "system_context",
    label: "System runtime context",
    rawFieldNames: ["permissions instructions", "app-context"],
    shortDescription: "Permissions, sandbox, client capabilities and system-level limits at model runtime.",
    longDescription:
      "Explains which permissions the model had and which sandbox and client-capability constraints applied. This part usually does not appear in the client chat body.",
    visibility: "hidden"
  },
  {
    id: "memory_context",
    label: "Memory context",
    rawFieldNames: ["memory", "oai-mem-citation"],
    shortDescription: "Long-term preferences, past task summaries and memory references.",
    longDescription: "Explains why the model carried over certain past preferences, habits and experience; this is history context injected in the background.",
    visibility: "hidden"
  },
  {
    id: "workspace_context",
    label: "Workspace rules context",
    rawFieldNames: ["AGENTS.md", "INSTRUCTIONS", "environment_context"],
    shortDescription: "Project rules, skill lists, environment context and current working boundaries.",
    longDescription: "Explains why the model followed certain in-project rules, skill constraints or environment boundaries.",
    visibility: "hidden"
  },
  {
    id: "collaboration_context",
    label: "Collaboration control context",
    rawFieldNames: ["collaboration_mode", "request_user_input availability"],
    shortDescription: "Current collaboration mode, interaction boundaries and available input/tool constraints.",
    longDescription: "Explains which collaboration mode the model was in and which interaction tools or input methods were available.",
    visibility: "hidden"
  },
  {
    id: "tool_trace",
    label: "Tool execution trace",
    rawFieldNames: ["function_call", "function_call_output", "custom_tool_call", "web_search_call"],
    shortDescription: "Which tools the model called, with their arguments and outputs.",
    longDescription: "For a complete review of the model's execution; can be exported in summary or full mode.",
    visibility: "partially_hidden"
  }
];

const SECTION_IDS = new Set<ExportSectionId>(SECTION_DEFINITIONS.map((item) => item.id));

export function getAllSectionDefinitions(): ExportSectionDefinition[] {
  return [...SECTION_DEFINITIONS];
}

export function getSectionDefinition(id: ExportSectionId): ExportSectionDefinition {
  const definition = SECTION_DEFINITIONS.find((item) => item.id === id);
  if (!definition) {
    throw new Error(`Unknown section id: ${id}`);
  }
  return definition;
}

export function isExportSectionId(value: string): value is ExportSectionId {
  return SECTION_IDS.has(value as ExportSectionId);
}

export function classifyContextText(
  text: string
): Exclude<ExportSectionId, "transcript" | "session_meta" | "tool_trace"> {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("<permissions instructions>") ||
    normalized.includes("<app-context>") ||
    normalized.includes("# codex desktop context")
  ) {
    return "system_context";
  }

  if (normalized.includes("## memory") || normalized.includes("<oai-mem-citation>") || normalized.includes("memory_summary")) {
    return "memory_context";
  }

  if (
    normalized.includes("# agents.md instructions") ||
    normalized.includes("<instructions>") ||
    normalized.includes("<environment_context>")
  ) {
    return "workspace_context";
  }

  if (normalized.includes("<collaboration_mode>") || normalized.includes("request_user_input availability")) {
    return "collaboration_context";
  }

  return "system_context";
}
