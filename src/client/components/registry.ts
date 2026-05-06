// ============================================================
// Client Component Registry
// ============================================================
// Mapping dari component ID (string) ke implementasi React component.
// ID harus sama dengan yang digunakan di createClientRef("ID") di server.
//
// Saat deserializer menemukan node type "client_ref",
// ia akan lookup componentId di sini untuk mendapatkan
// komponen yang akan dirender di browser.
// ============================================================

import type { ComponentType } from "react";
import Counter from "./Counter.js";
import AddTodoForm from "./AddTodoForm.js";
import FlightVisualizer from "./FlightVisualizer.js";
import TodoListClient from "./TodoListClient.js";

/**
 * Registry client components.
 *
 * Key   = componentId yang digunakan di createClientRef() di server
 * Value = React component implementation
 */
export const clientRegistry: Record<string, ComponentType<any>> = {
  Counter,
  AddTodoForm,
  FlightVisualizer,
  TodoListClient, // ← handles todo checkbox toggle + add todo ke list yang sama
};
