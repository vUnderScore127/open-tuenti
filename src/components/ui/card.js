import { jsx as _jsx } from "react/jsx-runtime";
export const Card = ({ className, ...props }) => (_jsx("div", { className: ["rounded-lg border border-gray-200 bg-white shadow-sm", className].filter(Boolean).join(' '), ...props }));
export const CardHeader = ({ className, ...props }) => (_jsx("div", { className: ["p-4 border-b border-gray-200", className].filter(Boolean).join(' '), ...props }));
export const CardTitle = ({ className, ...props }) => (_jsx("h3", { className: ["text-lg font-semibold", className].filter(Boolean).join(' '), ...props }));
export const CardContent = ({ className, ...props }) => (_jsx("div", { className: ["p-4", className].filter(Boolean).join(' '), ...props }));
