Export the ENTIRE current Figma Make AI project into a structured React + TypeScript codebase.

STRICT RULES:
- Do NOT create duplicate versions (no V1, V2 files).
- Do NOT regenerate layout per page.
- Do NOT create multiple layout wrappers.
- Generate ONE reusable MainLayout.
- Generate ONE Sidebar component.
- Generate ONE Header component.
- Ensure route-based rendering using react-router-dom v6.

TECH STACK:
- React
- TypeScript (.tsx)
- Tailwind CSS
- Functional components only
- No inline styling
- Clean className usage
- No duplicate components

STRUCTURE REQUIRED:

src/
 ├── app/
 │    ├── layout/
 │    │    ├── MainLayout.tsx
 │    │    ├── Sidebar.tsx
 │    │    ├── Header.tsx
 │    │
 │    ├── modules/
 │    │    ├── vendor-governance/
 │    │    ├── implementation-console/
 │    │    ├── risk-compliance/
 │    │    ├── integration/
 │    │    ├── reports/
 │    │    ├── workflow-engine/
 │    │
 │    ├── routes.tsx
 │
 ├── components/
 ├── hooks/
 ├── utils/

ROUTING:
- Use BrowserRouter
- Use nested routes
- Each module under /vendor-governance, /implementation-console etc.
- Vendor Portal subroutes must use nested routing

LAYOUT RULES:
- Sidebar fixed left
- Header fixed top
- Main content flexible width
- Insights panel MUST NOT be globally mounted
- No horizontal scroll anywhere

OUTPUT:
- Provide complete folder structure
- Provide all .tsx files
- Provide routes.tsx
- Provide sample App.tsx
- Provide package.json dependencies list