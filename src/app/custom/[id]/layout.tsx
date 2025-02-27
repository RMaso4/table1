// src/app/custom/[id]/layout.tsx
import React from 'react';

export default function CustomPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}