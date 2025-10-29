import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
export const Textarea = forwardRef(function Textarea({ className, error, ...props }, ref) {
    const base = 'flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3a6b97]';
    const errorCls = error ? 'border-red-500 focus:ring-red-500' : '';
    return _jsx("textarea", { ref: ref, className: [base, errorCls, className].filter(Boolean).join(' '), ...props });
});
