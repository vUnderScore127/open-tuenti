import React from 'react';

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={["rounded-lg border border-gray-200 bg-white shadow-sm", className].filter(Boolean).join(' ')} {...props} />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={["p-4 border-b border-gray-200", className].filter(Boolean).join(' ')} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={["text-lg font-semibold", className].filter(Boolean).join(' ')} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={["p-4", className].filter(Boolean).join(' ')} {...props} />
);