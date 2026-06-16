# Project Context

This document contains detailed information about the current state of the project, including its architecture, milestones, and recent changes. It is updated every time a significant change occurs to maintain a highly professional and robust project structure.

## 1. Project Overview
A professional, boilerplate-free Electron application leveraging React, TypeScript, and Vite. The goal is to establish a solid foundation for any highly performant desktop application.

**Key Technologies:**
- **Electron:** Core framework for the desktop app.
- **React (v18+):** Frontend framework for the Renderer process.
- **TypeScript:** Ensuring type safety and best practices across the entire stack.
- **Vite:** Lightning-fast build tool optimizing both main and renderer processes.

## 2. Current Architecture
The project follows a standard secure Electron architecture, effectively separating concerns:

- **Main Process (`/electron/main/`):** Handles Node.js APIs, system interactions, and window management. It securely manages IPC (Inter-Process Communication) handlers.
- **Preload Scripts (`/electron/preload/`):** Exposes safe, isolated APIs from the main process to the renderer process via `contextBridge`.
- **Renderer Process (`/src/`):** The React frontend. It solely concerns itself with UI and calls preload-exposed functions for any system-level operations.

## 3. State & Milestones

| Milestone | Status | Description |
|-----------|--------|-------------|
| 1. Scaffolding | **Complete** | Initialize project using electron-vite with React + TS template. |
| 2. Dependency Installation | **Complete** | Run `npm install` to set up all necessary packages. |
| 3. Linting/Formatting | **Complete** | Ensure ESLint and Prettier are configured and integrated for high code quality. |

## 4. Networking & Discovery Architecture
Because the physical pump operates purely as a server and does not broadcast its presence continuously, we have documented the following architectural decisions for device discovery:

- **Connection Protocol:** We will use **Modbus TCP (Port 502)** for the actual data polling across both Ethernet and Wi-Fi connections.
- **Discovery Mechanism (UDP Broadcast):** To discover pumps on Wi-Fi quickly and reliably, the Electron app uses **UDP Broadcast**. 
  - The App broadcasts the string `DISCOVER_PUMP_REQUEST` to port `5555` on the local network multiple times.
  - The Pump firmware listens on UDP port `5555` and responds directly to the sender with a string format `PUMP_ID:<DeviceID>`.
- **Reliability:** Because UDP is "fire and forget," the app mitigates dropped packets by broadcasting 3 times in quick succession.

## 5. Recent Changes
- **2026-06-12:** Switched Wi-Fi Discovery architecture from TCP Subnet Scanning to UDP Broadcast for instant, industry-standard discovery. Updated discovery logic and mock pump to match the new UDP contract.

---
*Note: This file must be updated after any architectural change, new feature implementation, or significant refactoring.*
