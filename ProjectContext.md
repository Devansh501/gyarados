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
The project follows a standard secure Electron architecture and a modular, production-grade React structure:

- **Main Process (`/electron/`):** Handles Node.js APIs, system interactions, network scanning (`scanner.ts`), Modbus connection management (`pumpManager.ts`), and safely exposes IPC handlers (`main.ts`).
- **Preload Scripts (`/electron/preload/`):** Exposes safe, isolated APIs from the main process to the renderer process via `contextBridge`.
- **Renderer Process (`/src/`):** A highly scalable React frontend with strict separation of concerns:
  - **`src/views/`**: Contains main page structures and route layouts (e.g., `DiscoveryView.tsx`, `ConnectionOptions.tsx`).
  - **`src/hooks/`**: Encapsulates state management, IPC communications, and business logic (e.g., `useDeviceManager.ts`).
  - **`src/components/ui/`**: Reusable design system elements (e.g., buttons, cards).
  - **`src/components/animations/`**: Framer Motion animation components.
  - **`src/types/`**: Application-wide TypeScript interfaces (e.g., `device.ts`).
- **Shared Definitions (`/src/constants.ts`, `/src/registers.ts`):** Centralized files defining network delays, ports, application timeouts, and Modbus registers. Both the Electron backend and React frontend can consume these.

## 3. State & Milestones

| Milestone | Status | Description |
|-----------|--------|-------------|
| 1. Scaffolding | **Complete** | Initialize project using electron-vite with React + TS template. |
| 2. Dependency Installation | **Complete** | Run `npm install` to set up all necessary packages. |
| 3. Linting/Formatting | **Complete** | Ensure ESLint and Prettier are configured and integrated for high code quality. |
| 4. Production Refactor | **Complete** | Restructure UI, separate concerns, centralize constants and registers. |

## 4. Networking & Discovery Architecture
Because the physical pump operates purely as a server and does not broadcast its presence continuously, we have documented the following architectural decisions for device discovery:

- **Connection Protocol:** We will use **Modbus TCP (Port 502)** for the actual data polling across both Ethernet and Wi-Fi connections.
- **Discovery Mechanism (UDP Broadcast):** To discover pumps on Wi-Fi quickly and reliably, the Electron app uses **UDP Broadcast**. 
  - The App broadcasts the string `DISCOVER_PUMP_REQUEST` to port `5555` (configurable via `UDP_DISCOVERY_PORT`) on the local network multiple times.
  - The Pump firmware listens on UDP port `5555` and responds directly to the sender with a string format `PUMP_ID:<DeviceID>`.
- **Reliability:** Because UDP is "fire and forget," the app mitigates dropped packets by broadcasting 3 times in quick succession.
- **Adapter-aware discovery:** The app broadcasts to both `255.255.255.255` and each active IPv4 adapter's directed broadcast address, which improves discovery on Wi-Fi networks that filter limited broadcasts.
- **Connection validation:** A TCP socket opening is not treated as a complete pump connection until the pump responds to a Modbus read of the cycles pending register (`MODBUS_REGISTERS.CYCLES_PENDING`). Any valid response from that register means the pump is reachable.
- **Liveness tracking:** Connected pumps are kept online with lightweight Modbus polling. Poll failures are counted and the pump is disconnected after repeated failures.

## 5. Recent Changes
- **2026-07-07:** Refactored React frontend into production-grade modular structure (`views/`, `hooks/`, `types/`). Centralized all network delays, ports, UI timeouts into `src/constants.ts` and all Modbus maps into `src/registers.ts`. Updated internal tool scripts (`loadTester.ts` and `mockPump.ts`) to use these shared constants and added failure tracking.
- **2026-06-16:** Improved Wi-Fi discovery and connection handling. Discovery now sends immediate retries to global and per-interface broadcast addresses with a shorter scan window. TCP connection attempts now have an explicit timeout, validate the cycles pending register before reporting connected, and clean up stale in-flight connections safely.
- **2026-06-12:** Switched Wi-Fi Discovery architecture from TCP Subnet Scanning to UDP Broadcast for instant, industry-standard discovery. Updated discovery logic and mock pump to match the new UDP contract.

---
*Note: This file must be updated after any architectural change, new feature implementation, or significant refactoring.*
